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

    function mediaId() {
        return "media_" + mediaId.next++;
    }
    mediaId.next = 0;

    function View(element) {
        this.element = element;
        var self = this,
            position = element.css("position");

        if (position == "static") {
            element.css("position", "relative");
        }

        this.message = $("<span/>")
            .appendTo(element)
            .css({position: "absolute"})
            .hide();

        this.video = $("<div id='" + mediaId() + "'/>")
            .appendTo(element)
            .css({
                position: "absolute",
                top: "0",
                right: "0",
                bottom: "0",
                left: "0"
            });

        this._positionElements();

        $($window).resize(function() {
            self._positionElements();
        });

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

            this.video.html(object);

            this.removeVideo = function() {
                this.video.empty();
            }
        },

        _positionElements: function() {
            this.message.position({
                my: "center center",
                at: "center center",
                of: this.element
            });
        },

        getElement: function() {
            return this.root;
        },

        showMessage: function(code) {
            this._removeVideo();

            var message = this.messages[code];
            this.message.text(message);
            this.message.show();
        },

        showVideo: function(url) {
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


    function Model(view) {
        this.view = view;
        this.data = null;
    }

    $.extend(Model.prototype, {

        options: {
            afterEventPollWindow: 1000 * 60 * 60 * 8,
            beforeEventPollWindow: 1000 * 60 * 30
        },

        getMessageCode: function() {
            var broadcast = this.data.broadcast;

            if (broadcast.live == "pre") {
                return "liveNotYetAvailable";
            } else if (broadcast.live == "in") {
                if (!broadcast.live_visible) {
                   return "liveNotYetAvailable";
                } else {
                    // do nothing, a video is available
                }
            } else {
                if (broadcast.vod == "pre") {
                    return "vodNotYetAvailable";
                } else if (broadcast.vod == "in") {
                    if (!broadcast.vod_visible) {
                        return "vodNotYetAvailable";
                    } else {
                        // do nothing, a video is available
                    }
                } else if (broadcast.vod == "post") {
                    return "vodNoLongerAvailable";
                } else {
                    if (broadcast.live == "un") {
                        return "nothingAvailable";
                    } else {
                        return "vodNotAvailable";
                    }
                }
            }

        },

        getURI: function() {
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
                scheduled = new Date(this.data.scheduledDate).getTime();

            if (scheduled > now && scheduled - this.options.beforeEventPollWindow <= now) {
                return true;
            }

            if (scheduled <= now
                    && scheduled + this.options.afterEventPollWindow > now) {
                return true;
            }

            return false;

        },

        isLive: function() {
            return this.data.broadcast.live == "in" && this.data.broadcast.live_visible;
        },
        isVOD: function() {
            return this.data.broadcast.vod == "in" && this.data.broadcast.vod_visible;
        },

        setData: function(data) {
            var data_json = JSON.stringify(data);
            if (this.data_json && this.data_json == data_json) {
                // data is identical. abort.
                return;
            }

            this.data = data;
            this.data_json = data_json; // for future comparison

            if (this.isLive() || this.isVOD()) {
                this.view.showVideo(this.getVideoURL());
                gaEvent(this.getURI(), "View Video", this.isLive() ? "Live" : "VOD")
            } else {
                this.view.showMessage(this.getMessageCode());
            }
        }

    });


    // Acts as the Controller
    $.widget("ui.jwidget", {

        options: {
            eventId: null,
            statusInterval: 10000,
            token: ""
        },

        timer: null,

        _create: function() {
            this.view = new View(this.element);
            this.model = new Model(this.view);
            this.svc = $.wsdata(this.options);
        },

        _init: function() {
            this._getEventData();
            gaPageView(this.getEventUri());
        },

        _getEventData: function() {
            var self = this;
            this.svc.get(this.getEventUri(), {
                context: this,
                success: function(data) {
                    this.model.setData(data);
                    if (this.model.isMonitored()) {
                        this.timer = setTimeout(function() {
                            self._getEventData();
                        }, this.options.statusInterval);
                    }
                }
            });
        },

        getEventUri: function() {
            return "/events/" + this.options.eventId;
        }

    });

})(jQuery);