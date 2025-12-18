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

    // ==========================================
    // Blog Post Viewed Tracking
    // ==========================================
    (function() {
        function isBlogPost() {
            return window.location.pathname.includes('/blog-posts/');
        }

        function getBlogMetadata() {
            var metadata = {
                post_title: '',
                post_category: 'Screenwriting', // Default category
                post_author: '',
                post_publish_date: '',
                post_url: window.location.href
            };

            // Extract from Open Graph meta tags
            var ogTitle = document.querySelector('meta[property="og:title"]');
            var ogAuthor = document.querySelector('meta[property="article:author"]');
            var ogPublishTime = document.querySelector('meta[property="article:published_time"]');

            if (ogTitle) metadata.post_title = ogTitle.content;
            if (ogAuthor) metadata.post_author = ogAuthor.content;
            if (ogPublishTime) metadata.post_publish_date = ogPublishTime.content;

            // Fallback to page title if OG title not found
            if (!metadata.post_title) {
                metadata.post_title = document.title.split(' - ')[0].trim();
            }

            // Try to extract category from keywords meta tag
            var keywords = document.querySelector('meta[name="keywords"]');
            if (keywords) {
                var keywordList = keywords.content.split(',').map(function(k) { return k.trim(); });
                if (keywordList.length > 0) {
                    metadata.post_category = keywordList[0];
                }
            }

            return metadata;
        }

        function trackBlogPostViewed() {
            if (!isBlogPost()) return;

            var metadata = getBlogMetadata();

            if (typeof posthog !== 'undefined') {
                posthog.capture('blog_post_viewed', metadata);
            }
        }

        // Track on page load
        if (document.readyState === 'complete') {
            trackBlogPostViewed();
        } else {
            window.addEventListener('load', trackBlogPostViewed);
        }
    })();

    // ==========================================
    // Blog CTA Click Tracking
    // ==========================================
    (function() {
        function isBlogPost() {
            return window.location.pathname.includes('/blog-posts/');
        }

        function getBlogContext() {
            var ogTitle = document.querySelector('meta[property="og:title"]');
            return {
                post_title: ogTitle ? ogTitle.content : document.title.split(' - ')[0].trim(),
                post_url: window.location.href,
                page_path: window.location.pathname
            };
        }

        function trackCTAClicks() {
            if (!isBlogPost()) return;

            // Find all CTA buttons within the main content area
            var ctaButtons = document.querySelectorAll('main .cta-button, article .cta-button');

            ctaButtons.forEach(function(button) {
                button.addEventListener('click', function(e) {
                    var context = getBlogContext();

                    if (typeof posthog !== 'undefined') {
                        posthog.capture('blog_cta_clicked', {
                            cta_text: button.textContent.trim(),
                            cta_url: button.href || '',
                            cta_location: button.closest('article') ? 'article_body' : 'blog_header',
                            post_title: context.post_title,
                            post_url: context.post_url,
                            page_path: context.page_path
                        });
                    }
                });
            });
        }

        if (document.readyState === 'complete') {
            trackCTAClicks();
        } else {
            window.addEventListener('DOMContentLoaded', trackCTAClicks);
        }
    })();

    // ==========================================
    // Blog Share Button Tracking
    // ==========================================
    (function() {
        function isBlogPost() {
            return window.location.pathname.includes('/blog-posts/');
        }

        function getBlogContext() {
            var ogTitle = document.querySelector('meta[property="og:title"]');
            return {
                post_title: ogTitle ? ogTitle.content : document.title.split(' - ')[0].trim(),
                post_url: window.location.href,
                page_path: window.location.pathname
            };
        }

        function trackShare(platform) {
            var context = getBlogContext();

            if (typeof posthog !== 'undefined') {
                posthog.capture('blog_shared', {
                    share_platform: platform,
                    post_title: context.post_title,
                    post_url: context.post_url,
                    page_path: context.page_path
                });
            }
        }

        function createShareButtons() {
            if (!isBlogPost()) return;

            // Find the author info section (after the date)
            var authorSection = document.querySelector('main section > div > div[style*="display: flex"][style*="align-items: center"][style*="gap: 1rem"]');
            if (!authorSection) return;

            // Check if share buttons already exist
            if (document.querySelector('.blog-share-buttons')) return;

            var pageUrl = encodeURIComponent(window.location.href);
            var pageTitle = encodeURIComponent(document.title);

            var shareContainer = document.createElement('div');
            shareContainer.className = 'blog-share-buttons';
            shareContainer.innerHTML =
                '<span class="share-label">Share:</span>' +
                '<button class="share-btn share-twitter" aria-label="Share on Twitter" data-platform="twitter">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
                '</button>' +
                '<button class="share-btn share-linkedin" aria-label="Share on LinkedIn" data-platform="linkedin">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' +
                '</button>' +
                '<button class="share-btn share-copy" aria-label="Copy link" data-platform="copy_link">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' +
                '</button>';

            // Insert after the author section
            authorSection.parentNode.insertBefore(shareContainer, authorSection.nextSibling);

            // Add click handlers
            shareContainer.querySelectorAll('.share-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var platform = this.getAttribute('data-platform');
                    var url = window.location.href;
                    var title = document.title;

                    trackShare(platform);

                    if (platform === 'twitter') {
                        window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title), '_blank', 'width=550,height=420');
                    } else if (platform === 'linkedin') {
                        window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank', 'width=550,height=420');
                    } else if (platform === 'copy_link') {
                        navigator.clipboard.writeText(url).then(function() {
                            var originalHTML = btn.innerHTML;
                            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                            btn.classList.add('copied');
                            setTimeout(function() {
                                btn.innerHTML = originalHTML;
                                btn.classList.remove('copied');
                            }, 2000);
                        });
                    }
                });
            });
        }

        if (document.readyState === 'complete') {
            createShareButtons();
        } else {
            window.addEventListener('DOMContentLoaded', createShareButtons);
        }
    })();

})();
