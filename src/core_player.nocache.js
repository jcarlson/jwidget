/**
 * jWidget Core Player Legacy Adapter
 *
 * Description: Provides drop-in backwards compatibility from GWT-based core_player to jwidget
 * Author: Jarrod Carlson
 * Email: jarrod.carlson@playonsports.com
 * URL: https://github.com/methodknowledgy/jwidget
 * Version: 1.0
 * Requires:
 *      [no dependencies]
 *
 * Use Google's Closure Compiler to generate minified and optimized builds
 * http://closure-compiler.appspot.com/home
 */

(function() {

    var $window = window,
        $document = document;

    if (!$window.__jWidget_scriptsLoaded) {
        $window.__jWidget_scriptsLoaded = {};
    }

    var scripts = $window.__jWidget_scriptsLoaded,
        self,
        basePath,
        bodyDone,
        onBodyDoneTimerId;


    function computeBasePath() {
        var marker = "__jquery_jwidget__",
            markerScript;

        $document.write("<script id='" + marker + "'></script>");
        markerScript = $document.getElementById(marker);
        self = markerScript && markerScript.previousSibling;
        while (self && self.tagName != 'SCRIPT') {
            self = self.previousSibling;
        }

        function getDirectoryOfFile(path) {
            var hashIndex = path.lastIndexOf('#');
            if (hashIndex == -1) {
                hashIndex = path.length;
            }
            var queryIndex = path.indexOf('?');
            if (queryIndex == -1) {
                queryIndex = path.length;
            }
            var slashIndex = path.lastIndexOf('/', Math.min(queryIndex, hashIndex));
            return slashIndex >= 0 ? path.substring(0, slashIndex + 1) : '';
        }

        if (self && self.src) {
            basePath = getDirectoryOfFile(self.src);
        }

        if (basePath == '') {
            var baseElements = $document.getElementsByTagName('base');
            if (baseElements.length > 0) {
                basePath = baseElements[baseElements.length - 1].href;
            } else {
                basePath = getDirectoryOfFile($document.location.href);
            }
        }
        else if (basePath.match(/^\w+:\/\//)) {
        }
        else {
            var img = $document.createElement("img");
            img.src = basePath + "clear.cache.gif";
            basePath = getDirectoryOfFile(img.src);
        }

        if (markerScript) {
            markerScript.parentNode.removeChild(markerScript);
        }

    }

    function onBodyDone() {
        if (!bodyDone) {
            bodyDone = true;
            maybeStartWidget();
            if ($document.removeEventListener) {
                $document.removeEventListener("DOMContentLoaded", onBodyDone, false);
            }
            if (onBodyDoneTimerId) {
                clearInterval(onBodyDoneTimerId);
            }
        }
    }

    function maybeStartWidget() {
        if (bodyDone) {
            var params = {
                container: "",
                width: "480",
                height: "292"
            };

            // capture params from script tag
            setParamsFromUrl(params, self.src);

            // capture params from dictionary
            copy($window[params["cfg"] || "core_player_cfg"], params);

            // capture params from url
            setParamsFromUrl(params, $window.location.href);

            var iframe = $document.createElement("iframe"),
                qs = "?";

            adaptConfigs(params);

            for (var param in params) {
                if (params.hasOwnProperty(param)) {
                    qs += param + "=" + encodeURIComponent(params[param]) + "&";
                }
            }

            qs += "rdm=" + Math.floor(Math.random() * 1000000000);
            iframe.src = basePath + "iframe.html" + qs;
            iframe.width = params.width;
            iframe.height = params.height;
            iframe.frameBorder = "0";
            iframe.noresize = "noresize";
            iframe.scrolling = "no";
            iframe.style.border = "none";
            iframe.style.overflow = "hidden";

            var container;
            if (params.container) {
                container = $document.getElementById(params.container);
            }

            if (container != null) {
                container.appendChild(iframe);
            } else {
                if (contains($document.body, self)) {
                    self.parentNode.insertBefore(iframe, self);
                } else {
                    $document.body.appendChild(iframe);
                }
            }

        }
    }

    function adaptConfigs(params) {
        if (params["ws.api.readonly"]) {
            params["webservice"] = params["ws.api.readonly"];
            delete params["ws.api.readonly"];
        }
    }

    function contains(a, b) {
        return a.contains ?
            a != b && a.contains(b) :
            !!(a.compareDocumentPosition(b) & 16);
    }

    function setParamsFromUrl(obj, url) {
        var q = url.indexOf('?'),
            h = url.indexOf('#'),
            query = url.substring(q + 1, h > 0 ? h : url.length),
            params = query.split("&");

        for (var i = 0; i < params.length; i++) {
            var param = params[i];
            if (param.indexOf("=") > -1) {
                var key = param.split("=")[0],
                    value = param.split("=")[1];
                obj[key] = value;
            }
        }

    }

    function copy(from, to) {
        if (!!from && !!to) {
            for (var key in from) {
                if (from.hasOwnProperty(key)) {
                    to[key] = from[key];
                }
            }
        }
    }

    function loadScript(script) {
        script = basePath + script;
        if (!scripts[script]) {
            scripts[script] = true;
        }
        document.write("<script language='javascript' type='text/javascript' src='" + script + "'></script>");
    }

    computeBasePath();

    if ($document.addEventListener) {
        $document.addEventListener("DOMContentLoaded", function() {
            onBodyDone();
        }, false);
    }

    onBodyDoneTimerId = setInterval(function() {
        if (/loaded|complete/.test($document.readyState)) {
            onBodyDone();
        }
    }, 50);

})();
