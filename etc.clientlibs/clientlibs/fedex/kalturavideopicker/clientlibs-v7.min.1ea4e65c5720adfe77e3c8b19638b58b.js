/**
 * Copyright © 2024 WeCreate, Inc., All Rights Reserved
 * Author: Will Carpenter
 **/
;

(function ($, win, mK) {

    mK.setInitHandler('[data-mavice-kaltura-simple-player-v7]', init_v7);

    /////////////

    function init_v7(components) {

        if (components.length === 0) {
            return;
        }

        components.each(function () {

            var $cnt = $(this);

            var hasData = $cnt.data('mavice-kpinit');

            if (hasData || hasData === 'true') {

                if (typeof mK.playerV7InstanceIds === 'undefined' || mK.playerV7InstanceIds === null) {
                    mK.playerV7InstanceIds = [];
                }

                if (typeof mK.playerV7Instances === 'undefined' || mK.playerV7Instances === null) {
                    mK.playerV7Instances = [];
                }

                var videoId = $cnt.data('mavice-kp-videoid'),
                    partnerId = $cnt.data('mavice-kp-partnerid'),
                    playerId = $cnt.data('mavice-kp-playerid'),
                    playerToken = $cnt.data('mavice-kp-playertoken'),
                    isEditMode = $cnt.data('mavice-kp-iseditmode'),
                    // should never autoplay in edit mode...edit overlay leaves authors no way to stop the video.
                    autoPlay = (isEditMode) ? false : $cnt.data('mavice-kp-autoplay'),
                    thumbnail = $cnt.data('mavice-kp-thumbnail'),
                    aemPageTitle = $cnt.data('mavice-kp-aempagetitle'),
                    playerInstanceId = $cnt.find('.mavice-kp-player').attr('id'),
                    kpRef = null;

                if (playerInstanceId === '' || playerInstanceId === 'mavice-kaltura-vp') {
                    playerInstanceId = 'mavice-kaltura-vp_' + mK.playerV7InstanceIds.length;
                    $cnt.find('.mavice-kp-player').attr('id', playerInstanceId);
                }

                mK.playerV7InstanceIds.push(playerInstanceId);

                // called when player is initialized and sets up listener for play event and subsequent call to pause other players
                function kpReady(playerId) {
                    kpRef = mK.playerV7Instances[playerId];

                    kpRef.addEventListener("play", function (e) {
                        pauseOtherPlayers(playerId);
                    });
                }

                // called when another player begins playback and effectively pauses other players
                function pauseOtherPlayers(currentId) {

                    for (var i = 0; i < mK.playerV7InstanceIds.length; i++) {
                        var pid = mK.playerV7InstanceIds[i];

                        if (pid !== currentId) {
                            var kp = mK.playerV7Instances[pid];

                            if (typeof kp !== 'undefined' && kp !== null) {
                                kp.pause();
                            }
                        }
                    }
                }

                // Basic Config Only
                var kpV7Cfg = {

                    targetId: playerInstanceId,
                    provider: {
                        partnerId: partnerId,
                        uiConfId: playerId
                    }

                    ,
                    playback: {
                        autoplay: autoPlay
                    }
                }

                    ;

                // Define KS if Player Token Exists
                if (typeof playerToken !== 'undefined' && playerToken !== '' && playerToken !== null) {
                    kpV7Cfg.provider.ks = playerToken;
                }

                // Define Thumbnail if Thumbnail Url Exists
                if (typeof thumbnail !== 'undefined' && thumbnail !== '' && thumbnail !== null) {

                    // setting failover image if given image cannot be loaded

                    var failOverImg = new Image();
                    failOverImg.src = thumbnail;

                    failOverImg.addEventListener('load', function () {
                        // embed with given thumbnail
                        kpV7Cfg.sources = {
                            poster: thumbnail
                        };
                        v7Load();
                    });

                    failOverImg.addEventListener('error', function () {
                        // embed with placeholder thumbnail
                        thumbnail = '/content/dam/fedex-com/images/default-image/image-placeholder.jpg';

                        kpV7Cfg.sources = {
                            poster: thumbnail
                        };
                        v7Load();
                    });
                } else {
                    v7Load();
                }

                // Initialize Player, Add Event Listener(s) and Load Video
                function v7Load() {
                    try {
                        var kpV7 = KalturaPlayer.setup(kpV7Cfg);

                        // Add event listener for ready?
                        kpV7.ready().then(() => {
                            const langName = document.querySelector('#supportedLocales').getAttribute('value');
                            // reset the translations labels for dropdown based on the required languages
                            const allowedLanguages = [...langName.split(",")];
                            kpV7._localPlayer._tracks = kpV7._localPlayer._tracks.filter(item => {
                                return (
                                    item._language === "" || allowedLanguages.includes(item._language, item._active = false) || item._language === "off"
                                );
                            });

                            kpV7._localPlayer._sources.captions = kpV7._localPlayer._sources.captions.filter(item => {
                                return allowedLanguages.includes(item.language);
                            });

                            // Based on the country URL, retrieve and display the corresponding language for video subtitles in Kaltura
                            const currentPath = FDX.DATALAYER.page.pageInfo.locale;
                            const lang = currentPath.split('_')[0];
                            let textTracks = kpV7.getTracks(kpV7.Track.TEXT);
                            let track = textTracks.find(track => track.language === lang);
                            if (track) {
                                kpV7.selectTrack(track);
                            }

                            mK.playerV7Instances[playerInstanceId] = kpV7;
                            kpReady(playerInstanceId);
                        });

                        if (isEditMode) {
                            // Set up global title observer for video player
                            if (!mK.titleObserver) {
                                mK.originalTitle = aemPageTitle;
                                document.title = aemPageTitle;
                                
                                mK.titleObserver = new MutationObserver(function() {
                                    if (document.title !== mK.originalTitle) {
                                        document.title = mK.originalTitle;
                                    }
                                });
                                
                                mK.titleObserver.observe(
                                    document.querySelector('title'),
                                    { childList: true, characterData: true, subtree: true }
                                );
                            }
                        }

                        kpV7.loadMedia({
                            entryId: videoId
                        });
                    }
                    catch (e) {
                        console.error(e.message);
                    }
                }
            }
        });
    }

    function handleScroll() {
        const scrollY = document.documentElement.scrollTop || window.scrollY;
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const isNotNearBottom = scrollY + viewportHeight < documentHeight - 10;

        if (isNotNearBottom) {
            sessionStorage.setItem('scrollY', scrollY);
        }
    }

    function restoreScrollListener() {
        window.removeEventListener('scroll', handleScroll);
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Run once initially
    }

    // Initial attach
    restoreScrollListener();

    // Detect fullscreen toggle
    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = !!document.fullscreenElement;

        if (!isFullscreen) {
            window.scrollBy(0, sessionStorage.getItem('scrollY'));
            restoreScrollListener(); // Reattach scroll handling
        }
    });

})(jQuery, window, mavice.kaltura);