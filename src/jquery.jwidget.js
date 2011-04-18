/**
 * jWidget PlayON! Video Player
 *
 * Description: PlayON! Video Player as a plugin for jQuery
 * Author: Jarrod Carlson
 * Email: jarrod.carlson@playonsports.com
 * URL: https://github.com/methodknowledgy/jwidget
 * Version: 1.0
 * Requires:
 *      jQuery 1.5+ : http://jquery.com/
 *      jQuery-UI 1.8.9+ (Core, Widget, Position) : http://jqueryui.com/
 *      swfObject 2.2+ : http://code.google.com/p/swfobject/
 *      jquery.wsdata 1.0+ : https://github.com/methodknowledgy/jwidget
 *      JSON2 : http://www.JSON.org/
 *
 * Optional:
 *      Google Analytics Tracking Code : http://code.google.com/intl/en/apis/analytics/
 *
 * Use Google's Closure Compiler to generate minified and optimized builds
 * http://closure-compiler.appspot.com/home
 *
 */

(function($) {

    var $window = window,
        $swf = $window.swfobject,
        gaAccount = "UA-10527764-5";

    $window._gaq = ($window._gaq || []);
    $window._gaq.push(
        ['playon._setAccount', gaAccount],
        ['playon._setDetectTitle', false],
        ['playon._setCampaignTrack', false]
    );

    function gaPageView(path) {
        $window._gaq.push(['playon._trackPageview', path]);
    }

    function gaEvent(category, action, label) {
        $window._gaq.push(['playon._trackEvent', category, action, label]);
    }

    function parseISODate(date) {
        var timestamp = Date.parse(date),
            minutesOffset = 0,
            struct;

        if (isNaN(timestamp) && (struct = /^(\d{4}|[+\-]\d{6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?))?/.exec(date))) {
            if (struct[8] !== 'Z') {
                minutesOffset = +struct[10] * 60 + (+struct[11]);

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = Date.UTC(+struct[1], +struct[2] - 1, +struct[3], +struct[4], +struct[5] + minutesOffset, +struct[6], +struct[7].substr(0, 3));
        }

        return new Date(timestamp);
    }

    function mediaId() {
        return "media_" + mediaId.next++;
    }
    mediaId.next = 0;


    /**
     * Model class. Pass the View, Controller and an options hash.
     * @param view
     * @param controller
     * @param options
     */
    function Model(view, controller, options) {
        this.controller = controller;
        this.data = null;
        this.options = $.extend({}, this.options, options);
        this.svc = $.wsdata(options);
        this.view = view;
    }

    $.extend(Model.prototype, {

        options: {
            afterEventPollWindow: 1000 * 60 * 60 * 8,
            beforeEventPollWindow: 1000 * 60 * 30,
            countdownLowerThreshold: 1000 * 60 * 5, // 5 minutes
            countdownUpperThreshold: 1000 * 60 * 60 * 24 // 24 hours
        },

        equals: function(obj) {

            // check for nulls, etc...
            if (this.data === null && obj !== null) {
                return false;
            }

            if (!$.isPlainObject(obj)) {
                return false;
            }

            // if obj is a Model instance, use the backing data object for comparison
            if (obj instanceof Model) {
                obj = obj.data;
            }

            var data = this.data;

            // check if scheduledDate is equal
            if (data.uri != obj.uri ||data.scheduledDate != obj.scheduledDate) {
                return false;
            }

            // check if availability properties are equal
            if (JSON.stringify(data.availability) != JSON.stringify(obj.availability)) {
                return false;
            }

            // check if broadcast properties are equal
            if (JSON.stringify(data.broadcast) != JSON.stringify(obj.broadcast)) {
                return false;
            }

            // check if video properties are equal
            if (!$.isPlainObject(obj.video)) {
                return false;
            }
            // compare video url, sans query string, due to oauth signature
            var v1 = (data.video.url || "").split("?")[0],
                v2 = (obj.video.url || "").split("?")[0];
            if (v1 != v2) {
                return false;
            }

            // as far as I am concerned, these data objects appear equivalent
            return true;
        },

        getData: function() {
            return this.data;
        },

        getMessageCode: function() {
            var broadcast = this.data.broadcast,
                code = "";

            if (broadcast.live == "pre") {
                code = "liveNotYetAvailable";
            } else if (broadcast.live == "in") {
                if (!broadcast.live_visible) {
                   code = "liveNotYetAvailable";
                } else {
                    // do nothing, a video is available
                }
            } else {
                if (broadcast.vod == "pre") {
                    code = "vodNotYetAvailable";
                } else if (broadcast.vod == "in") {
                    if (!broadcast.vod_visible) {
                        code = "vodNotYetAvailable";
                    } else {
                        // do nothing, a video is available
                    }
                } else if (broadcast.vod == "post") {
                    code = "vodNoLongerAvailable";
                } else {
                    if (broadcast.live == "un") {
                        code = "nothingAvailable";
                    } else {
                        code = "vodNotAvailable";
                    }
                }
            }

            if (code == "liveNotYetAvailable") {
                var remain = this.getTimeToScheduledDate();

                if (remain <= this.options.countdownUpperThreshold) {
                    code = "countdown";
                }
                if (remain <= this.options.countdownLowerThreshold) {
                    code = "beginsSoon";
                }
            }

            return code;

        },

        getTimeToScheduledDate: function() {
            return this.getScheduledDate().getTime() - new Date().getTime();
        },

        getScheduledDate: function() {
            return parseISODate(this.data.scheduledDate);
        },

        getURI: function() {
            if (!this.data) return "/events/" + this.options.eventId;
            return this.data.uri;
        },

        getVideoURL: function() {
            return this.data.video.url;
        },

        isMonitored: function() {

            if (this.data.broadcast.live == "in") {
                return true;
            }

            var now = new Date().getTime(),
                scheduled = this.getScheduledDate().getTime();

            if (scheduled > now && scheduled - this.options.beforeEventPollWindow <= now) {
                return true;
            }

            return scheduled <= now
                    && scheduled + this.options.afterEventPollWindow > now;



        },

        isLive: function() {
            return this.data.broadcast.live == "in" && this.data.broadcast.live_visible;
        },
        isVOD: function() {
            return this.data.broadcast.vod == "in" && this.data.broadcast.vod_visible;
        },

        refresh: function() {
            var self = this,
                uri = this.getURI();

            setTimeout(function(){
                self.svc.get(uri, {
                    context: self,
                    success: self.setData
                });
            }, 0);
        },

        setData: function(data) {
            if (this.equals(data)) {
                // data is identical. abort.
                return;
            }

            this.data = data;

            if (this.isLive() || this.isVOD()) {
                this.view.showVideo(this);
                gaEvent(this.getURI(), "View Video", this.isLive() ? "Live" : "VOD")
            } else {
                this.view.showMessage(this);
            }

            this.controller._onEventData(new $.Event("data"));
        }

    });


    /**
     * View class. Pass the target element to build out
     * @param element
     */
    function View(element) {
        this.element = element;
        var self = this,
            position = element.css("position");

        if (position == "static") {
            element.css("position", "relative");
        }

        // setup the target element
        this.element
            .empty()
            .css({
                background: "#000000"
            });

        this.video = $("<div id='" + mediaId() + "'/>")
            .appendTo(element)
            .css({
                position: "absolute",
                top: "0",
                right: "0",
                bottom: "0",
                left: "0",
                overflow: "hidden"
            });

        this.message = $("<div/>")
            .appendTo(element)
            .css({
                fontFamily: "arial",
                fontSize: "16px",
                fontWeight: "bold",
                position: "absolute",
                left: "10%",
                right: "10%",
                textAlign: "center"
            })
            .hide();

        $(window).resize(function(){
            self._positionElements();
        });

        this._positionElements();

    }
    $.extend(View, {

        formatFor: function(url) {
            if (url == null) {
                return "NONE";
            } else if (/\.flv$|\.mp4$|\.smil$|\.xspf$|^rtmp:\/\/]/.test(url.split("?")[0])) {
                return "FLASH";
            } else {
                return "WMV";
            }
        }

    });
    $.extend(View.prototype, {

        messages: {
            liveNotYetAvailable: "This event will be available live at the scheduled start time",
            beginsSoon: "This event will begin momentarily",
            countdown: "This event begins in<br/>{0}",
            vodNotAvailable: "This event is not available on-demand",
            vodNotYetAvailable: "This event will be available on-demand at the end of the event",
            vodNoLongerAvailable: "This event is no longer available on-demand",
            nothingAvailable: "This event is not available live or on-demand"
        },

         // TODO: This *replaces* this.video in the DOM! This should be fixed.
        _embedFlash: function(url) {
            var flashvars = {
                    file: url,
                    provider: "rtmp",
                    autostart: "true"
                },
                params = {
                    allowScriptAccess: "always",
                    allowFullScreen: "true"
                };

            if (url.indexOf("hwcdn.net") > -1) {
                flashvars["rtmp.loadbalance"] = "true";
            } else {
                flashvars["streamer"] = "rtmp://playon.fcod.llnwd.net/a4565/e1";
                flashvars["file"] = url.replace(flashvars["streamer"] + "/", "");
            }

            $swf.embedSWF(
                "http://static.playonsports.com/jw-flv/5.1/player.swf",
                this.video.attr("id"),
                "100%",
                "100%",
                "9.0.124",
                "http://static.playonsports.com/jw-flv/5.1/expressInstall.swf",
                flashvars,
                params,
                {},
                null
            );

            var id = this.video.attr("id");
            this.removeVideo = function() {
                $swf.removeSWF();
            };
        },

        _removeVideo: function() {
            if (this.removeVideo && $.isFunction(this.removeVideo)) {
                this.removeVideo();
            }
            this.removeVideo = null;
        },

        _embedWMV: function(url) {
            var isIE = $.browser.msie,
                type = isIE ? "video/x-ms-wmp" : "application/x-ms-wmp",
                clsid = isIE ? "classid='clsid:6BF52A52-394A-11d3-B153-00C04F79FAA6'" : "";

            var embed = ""
            + "<embed type='application/x-mplayer2' "
            + "  pluginspage='http://www.microsoft.com/Windows/Downloads/Contents/MediaPlayer/' "
            + "  src='{url}' autostart='true' showstatusbar='0' showcontrols='1' "
            + "  showdisplay='0' width='100%' height='100%' />";


            var object = ""
            + "<object type='" + type + "' " + clsid + " width='100%' height='100%'>"
            + "    <param name='url' value='{url}' />"
            + "    <param name='autoStart' value='true' />"
            + "    <param name='stretchToFit' value='true' />"
            +      (isIE ? "" : embed)
            + "</object>";

            while(object.match("{url}")) {
                object = object.replace("{url}", url);
            }

            // hack?!? jQuery's .html([string]) method wreaks havoc on the object tag in IE
            this.video.get(0).innerHTML = object;

            this.removeVideo = function() {
                this.video.get(0).innerHTML = "";
            }
        },

        _positionElements: function() {
            this.message.position({
                my: "center center",
                at: "center center",
                of: this.element
            });
        },

        showMessage: function(model) {
            if ($.isFunction(this.removeVideo)) {
                this.removeVideo();
                this.removeVideo = null;
            }

            var self = this,
                code = model.getMessageCode(),
                message = this.messages[code];

            if (code == "countdown") {
                var remain = Math.floor(model.getTimeToScheduledDate() / 1000) % 86400,
                    hours = Math.floor(remain / 3600);
                remain = remain % 3600;
                var mins = Math.floor(remain / 60);
                remain = remain % 60;
                var secs = Math.floor(remain),
                    time = (hours < 10 ? "0" : "") + hours + ":" + (mins < 10 ? "0" : "")
                        + mins + ":" + (secs < 10 ? "0" : "") + secs;
                message = message.replace("{0}", time);

                // since we're in a countdown, we need to keep calling showMessage
                // don't worry about the timerId because it's safe to recall this method as many times as you want
                setTimeout(function(){
                    self.showMessage(model);
                }, 1000);
            }

            this.message.html(message);
            this.message.show();
            this._positionElements();
        },

        showVideo: function(model) {
            var url = model.getVideoURL();

            if (this.videoURL && this.videoURL == url) {
                // video is the same as it was before, so ignore
                return;
            }

            this.videoURL = url;
            this.message.hide();

            switch (View.formatFor(url)) {
                case "FLASH":
                    this._embedFlash(url);
                    break;
                case "WMV":
                    this._embedWMV(url);
                    break;
                case "NONE":
                    break;
            }

            this.video.show();
        }

    });


    /**
     * Acts as the Controller and as the jQueryUI widget
     */
    $.widget("ui.jwidget", {

        options: {
            eventId: null,
            pollingInterval: 10000,
            token: ""
        },

        _create: function() {
            this.view = new View(this.element);
            this.model = new Model(this.view, this, this.options);
        },

        _init: function() {
            gaPageView(this.model.getURI());
            this.model.refresh();
        },

        _onEventData: function(event) {
            var model = this.getModel();

            this._trigger("data", event, model);

            if (model != null && model.isMonitored() && this.options.pollingInterval > 0) {
                setTimeout(function() {
                    model.refresh();
                }, this.options.pollingInterval);
            }
        },

        getModel: function() {
            if (this.model.data == null) return null;
            return this.model;
        }

    });

})(jQuery);
