/**
 * G-Script Analytics
 * Centralized tracking using PostHog
 */

(function() {
    'use strict';

    // ==========================================
    // PostHog Initialization
    // ==========================================
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    posthog.init('phc_L9nsYxXjcoW9uaEZWeevNL2FvuYjUHxZmX7nViPXkmO', {
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'always'
    });

    // ==========================================
    // Scroll Depth Tracking
    // ==========================================
    (function() {
        var scrollMilestones = [25, 50, 75, 100];
        var milestonesReached = {};

        function getScrollPercentage() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (docHeight === 0) return 100;
            return Math.round((scrollTop / docHeight) * 100);
        }

        function checkScrollDepth() {
            var currentScroll = getScrollPercentage();
            scrollMilestones.forEach(function(milestone) {
                if (currentScroll >= milestone && !milestonesReached[milestone]) {
                    milestonesReached[milestone] = true;
                    if (typeof posthog !== 'undefined') {
                        posthog.capture('scroll_depth', {
                            depth_percentage: milestone,
                            page_path: window.location.pathname,
                            page_title: document.title
                        });
                    }
                }
            });
        }

        var throttleTimer;
        function throttledScrollCheck() {
            if (throttleTimer) return;
            throttleTimer = setTimeout(function() {
                checkScrollDepth();
                throttleTimer = null;
            }, 200);
        }

        window.addEventListener('scroll', throttledScrollCheck, { passive: true });
        window.addEventListener('load', checkScrollDepth);
    })();

    // ==========================================
    // Time on Page Tracking
    // ==========================================
    (function() {
        var startTime = Date.now();
        var activeTime = 0;
        var lastActiveTimestamp = startTime;
        var isPageVisible = !document.hidden;
        var hasSentEvent = false;

        function updateActiveTime() {
            if (isPageVisible) {
                activeTime += Date.now() - lastActiveTimestamp;
            }
            lastActiveTimestamp = Date.now();
        }

        function getTimeBucket(seconds) {
            if (seconds < 10) return '0-10s';
            if (seconds < 30) return '10-30s';
            if (seconds < 60) return '30-60s';
            if (seconds < 180) return '1-3min';
            if (seconds < 300) return '3-5min';
            return '5min+';
        }

        function sendTimeOnPage() {
            if (hasSentEvent) return;
            updateActiveTime();

            var totalTimeSeconds = Math.round((Date.now() - startTime) / 1000);
            var activeTimeSeconds = Math.round(activeTime / 1000);

            if (typeof posthog !== 'undefined' && activeTimeSeconds > 0) {
                hasSentEvent = true;
                posthog.capture('time_on_page', {
                    total_time_seconds: totalTimeSeconds,
                    active_time_seconds: activeTimeSeconds,
                    time_bucket: getTimeBucket(activeTimeSeconds),
                    page_path: window.location.pathname,
                    page_title: document.title
                });
            }
        }

        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                updateActiveTime();
                isPageVisible = false;
                sendTimeOnPage();
            } else {
                // Resume tracking but don't reset hasSentEvent
                // to prevent duplicate events on tab switch + navigate away
                isPageVisible = true;
                lastActiveTimestamp = Date.now();
            }
        });

        window.addEventListener('beforeunload', sendTimeOnPage);
        window.addEventListener('pagehide', sendTimeOnPage);
    })();

})();
