/**
 * Plugin Name: wsdata
 * Description: PlayON! Web Service data API
 * Author: Jarrod Carlson
 * Email: jarrod.carlson@playonsports.com
 * URL: ???
 * Version: 0.1
 * Requires:
 *      jQuery 1.4.4+ : http://jquery.com/
 *      OAuth for JavaScript : http://code.google.com/p/oauth/
 *      SHA1 for JavaScript : http://pajhome.org.uk/crypt/md5/index.html
 *
 * Use Google's Closure Compiler to generate minified and optimized builds
 * http://closure-compiler.appspot.com/home
 *
 */

(function($) {

    var $window = window;

    function callbackId() {
        return "jwidget_" + arguments.callee.nextId++;
    }
    callbackId.nextId = 0;

    function signAndSendMessage(message, options) {

        OAuth.setTimestampAndNonce(message);
        OAuth.setParameters(message, {
            callback: callbackId(),
            oauth_body_hash: b64_sha1(""),
            oauth_consumer_key: options.oauth_consumer_key || options.token,
            oauth_token: options.oauth_token || options.token,
            oauth_version: options.oauth_version,
            oauth_signature_method: options.oauth_signature_method
        });
        OAuth.SignatureMethod.sign(message, {
            consumerSecret: options.oauth_consumer_secret,
            tokenSecret: options.oauth_token_secret
        });

        // jQuery will add the callback param on its own, so remove it for now
        var callback = message.parameters.callback;
        delete message.parameters.callback;

        // construct url, sans callback param
        var url = message.action + "?" + $.param(message.parameters);

        // execute request
        var request = {

            _timer: setTimeout(function(){
                $.handleError(request, message, "timeout", null);
            }, options.timeout),

            cache: true, // if not true, jQuery adds a cache-buster... bad for OAuth...
            context: message.context,
            dataType: "jsonp",
            jsonpCallback: callback,
            url: url,

            complete: function(msg, status) {
                clearTimeout(request._timer);
            },
            error: function(msg, status, error) {
                try {
                    delete $window[callback];
                } catch (err) {}

                if (message.error) {
                    message.error.call(request.context, message, status, error);
                }
            },
            success: function(data, status, msg) {
                if (data && data.error && data.httpStatusCode) {
                    request.error(msg, data.error.toLowerCase(), new Error(data.error));
                } else if (message.success) {
                    message.success.call(request.context, data, "success", message);
                }
            }
        };

        $.ajax(request);

    }

    function WebService(options) {
        this.options = $.extend({}, this.options, options);
    }

    $.extend(WebService.prototype, {

        options: {
            oauth_consumer_key: "",
            oauth_consumer_secret: "",
            oauth_signature_method: "HMAC-SHA1",
            oauth_token: "",
            oauth_token_secret: "",
            oauth_version: "1.0",
            timeout: 5000,
            token: "",
            webservice: "http://ws.playonsports.com"
        },

        get: function(uri, settings) {
            var options = this.options,
                callback = callbackId(),
                message = $.extend({
                    action: options.webservice + uri,
                    method: "GET",
                    parameters: {}
                }, settings);

            message.context = settings && settings.context ? settings.context : message;
            signAndSendMessage(message, options);
        }


    });

    $.extend({
        wsdata: function(options) {
            return new WebService(options);
        }
    });

})(jQuery);