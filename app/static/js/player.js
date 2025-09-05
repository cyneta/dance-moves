// player.js
"use strict";
import { allMoves } from './index.js';
import { on } from './common.js';
import { moveTableIndices, displayNotes } from './movesTable.js';

console.info('[Global] player.js loaded');

const speeds = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0
];

let player;
let isSpeedOverride = false;
let isAutoplayEnabled = false;
let currentVideoIndex = -1;         // Index of the currently playing video in allMoves
let isLoopEnabled = false;
let isAlternateSoundtrackEnabled = false;
let isDebugOverlayEnabled = false;

const REPEAT_COUNT = 2;
let currentRepeat = 0;

let audioPlayer = new Audio();      // Create an audio element for the alternate soundtrack

let lastStep = null;                // Track the last displayed step for updateStepCounter
let isStopMotionEnabled = false;    // Global flag for stop-motion effect
let isMoveAnnouncementEnabled = false;  // Global flag for move announcements (disabled by default)

// Auto-mute timeout system for iPad keyboard navigation
let originalMuteState = false;      // Remember original video mute state before keyboard navigation
let originalAudioMuteState = false; // Remember original alternate audio mute state
let keyboardMuteTimer = null;       // Timer for restoring audio after keyboard inactivity
const KEYBOARD_MUTE_TIMEOUT = 3000; // 3 seconds timeout

// Define alternate soundtracks
const altSoundtracksByType = {
    "salsa": "salsa_loop.mp3",
    "bachata": "Bachata Mix 2020 OSOCITY.mp3",
    "casino": "Rueda De Casino - En Mi Puertorro - Timba Heat Music Video.m4a",
    "ecs": "Aretha Franklin - Good times.mp3",
    "wcs": "West Coast Swing Classic.mp3",
};

// Initialize Player UI
export function initializePlayerUI() {
    console.info('[Player UI] Initializing...');

    const instructions = [
        "Pick a dance style to practice.",
        "Select a playlist on the left.",
        "Choose a move from the list.",
        "Press 'Loop' or 'Guide' for targeted practice.",
        "Use the speed control to adjust playback."
    ];
    showInstructions(instructions);

    // Initialize Plyr player
    const videoElement = document.getElementById('player');
    if (!videoElement) {
        console.error('[Player UI] No video element found for initialization.');
        return;
    }

    // Destroy existing player instance if present
    if (player) player.destroy();

    player = new Plyr(videoElement, {
        controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
    });

    console.info('[Player] Player initialized.');

    // Attach hideInstructions to player "play" event
    if (player) {

        player.on('ready', () => {
            console.debug('[Player UI] Player is fully loaded, making it visible.');
            document.body.classList.add('player-loaded');
        });

        player.on('play', () => {
            hideInstructions();
            console.debug('[Player UI] Instructions hidden.');
            
            // Ensure video has focus for keyboard controls on touch devices
            ensureVideoFocus();
            
            // Resume Alternate Soundtrack when Video Plays
            if (isAlternateSoundtrackEnabled && audioPlayer.paused) {
                console.info('[Alternate Soundtrack] Resuming playback.');
                audioPlayer.play();
            }
        });

        player.on('pause', () => {
            // Pause Alternate Soundtrack when Video Pauses
            if (isAlternateSoundtrackEnabled && !audioPlayer.paused) {
                console.info('[Alternate Soundtrack] Pausing playback.');
                audioPlayer.pause();
            }
        });
    }

    // Initialize stop-motion toggle control
    initializeStopMotionToggle();
    initializeAlternateSoundtrackToggle();

    // Handle moveAction events
    on('moveAction', ({ moveIndex }) => {
        console.debug('[moveAction] Event triggered with parameters:', { moveIndex });
    
        // Fetch the move by index
        const move = allMoves[moveIndex];
        if (!move) {
            console.error(`[Player] No move found for index ${moveIndex}.`);
            // console.debug('[Player] All available moves:', allMoves);
            return;
        }
    
        console.debug('[Player] Move data retrieved:', move);
    
        // Extract move properties
        const { video_filename, loop_start, loop_end, loop_speed, step_counter, guide_start, notes } = move;
    
        // Determine playback speed with override logic
        const speed = determinePlaybackSpeed(loop_speed);
        console.debug('[Player] Determined playback speed:', speed);
    
        // Explicitly set player speed when move is selected
        setPlaybackSpeed(speed);

        // Update the global index
        currentVideoIndex = moveIndex;
        console.debug(`[Player] Updated currentVideoIndex to ${currentVideoIndex}.`);

        // Play the selected video
        const isLooping = getLoopEnabled(); // Use the global loop state
        playVideo({
            video_filename,
            start: isLooping ? loop_start : guide_start,
            end: isLooping ? loop_end : null,
            speed,
            notes,
            move_name: move.move_name,
            step_counter
        });
    });
}

export function setupMediaSessionHandlers() {
    if (!("mediaSession" in navigator)) {
        console.warn("[MediaSession] Not supported in this browser.");
        return;
    }

    navigator.mediaSession.setActionHandler("play", () => {
        logToDebugWindow("[MediaSession] Play triggered");
        togglePlayPause();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
        logToDebugWindow("[MediaSession] Pause triggered");
        togglePlayPause();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
        logToDebugWindow("[MediaSession] Previous Track triggered");
        previousVideo();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
        logToDebugWindow("[MediaSession] Next Track triggered");
        nextVideo();
    });

    logToDebugWindow("[MediaSession] Action handlers registered.");
}

// Setup the autoplay toggle button
export function setupAutoplayToggle() {
    const autoplayToggle = document.getElementById('autoplay-switch');
    if (!autoplayToggle) {
        console.error('[Autoplay] Toggle switch not found in the DOM.');
        return;
    }

    autoplayToggle.addEventListener('change', (event) => {
        const isEnabled = event.target.checked;
        setAutoplayEnabled(isEnabled);
    });

    console.info('[Autoplay] Toggle switch setup complete.');
}

// Initialize and Setup Speed Slider
export function initializeSpeedSlider() {
    const slider = document.getElementById('speed-slider');
    if (!slider) {
        console.error('[Player] Speed slider element not found in the DOM.');
        return;
    }

    console.info('[Player] Found speed slider. Initializing...');

    // Initialize slider to default speed
    const defaultSpeed = 1.0;
    const defaultIndex = speeds.indexOf(defaultSpeed);

    if (defaultIndex !== -1) {
        slider.value = defaultIndex;
        updateSpeedFromSlider(defaultIndex);
        console.info(`[Player] Speed slider initialized to ${defaultSpeed}x.`);
    } else {
        console.warn('[Player] Default speed (1.0) not found in speeds array.');
    }

    // Debug: Log when event listeners are attached
    console.debug('[Speed Slider] Adding event listeners...');

    slider.addEventListener('mousedown', () => {
        isSpeedOverride = true;
        console.debug('[Speed Override] isSpeedOverride set to true (mousedown)');
    });
    
    slider.addEventListener('keydown', () => {
        isSpeedOverride = true;
        console.debug('[Speed Override] isSpeedOverride set to true (keydown)');
    });

    slider.addEventListener('input', (event) => {
        const sliderIndex = parseInt(event.target.value, 10);
        updateSpeedFromSlider(sliderIndex);
        console.debug(`[Speed Override] Speed slider adjusted to index: ${sliderIndex}`);
    });

    console.info('[Player] Speed slider setup and initialization complete.');
}

// Initialize Freeze Frame Toggle
export function initializeStopMotionToggle() {
    const stopMotionToggle = document.getElementById('stop-motion-toggle');
    if (!stopMotionToggle) {
        console.error('[Freeze Frame] Toggle switch not found in the DOM.');
        return;
    }

    stopMotionToggle.addEventListener('change', (event) => {
        isStopMotionEnabled = event.target.checked;
        console.info(`[Freeze Frame] Stop motion is now ${isStopMotionEnabled ? 'enabled' : 'disabled'}.`);

        if (isStopMotionEnabled) {
            console.info('[Freeze Frame] Muting video and alternate soundtrack.');
            player.muted = true;
            audioPlayer.muted = true;
        } else {
            console.info('[Freeze Frame] Restoring audio settings.');
            player.muted = isAlternateSoundtrackEnabled;
            audioPlayer.muted = !isAlternateSoundtrackEnabled;
        }
    });

    console.info('[Freeze Frame] Toggle switch initialized.');
}

// Initialize Alternate Soundtrack Toggle
export function initializeAlternateSoundtrackToggle() {
    const altSoundtrackToggle = document.getElementById('alternate-soundtrack-switch');
    if (!altSoundtrackToggle) {
        console.error('[Alternate Soundtrack] Toggle switch not found in the DOM.');
        return;
    }

    altSoundtrackToggle.addEventListener('change', (event) => {
        toggleAlternateAudio(event.target.checked);
    });

    console.info('[Alternate Soundtrack] Toggle switch initialized.');
}

// Initialize orientation handling
export function initializeOrientationHandling() {
    handleOrientationChange(); // Initial placement
    window.addEventListener('resize', handleOrientationChange); // Adjust on window resize
    console.info('[Orientation Change] Orientation handling initialized.');
}

export function playVideo({
    video_filename,
    start,
    end,
    speed = 1,
    notes = '',
    move_name = '',
    step_counter = null
}) {
    if (!video_filename) {
        console.warn('[Player: Play Video] No video filename provided. Displaying placeholder.');
        document.getElementById('player').style.display = 'none';
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes(move_name, "No video available for this move.");
        return;
    }

    const sliderElement = document.getElementById('speed-slider');
    const sliderValue = sliderElement ? parseInt(sliderElement.value, 10) : null;

    // Use loop speed unless manually overridden by the user
    const calculatedSpeed = isSpeedOverride ? getPlaybackSpeed() : speed;

    console.debug(`[Player] isSpeedOverride: ${isSpeedOverride}, Slider Value: ${sliderValue}, Using Speed: ${calculatedSpeed}`);

    setPlaybackSpeed(calculatedSpeed);

    const videoSrc = `/static/videos/${video_filename}`;
    console.debug(`[Player: Play Video] Resolving playback for "${video_filename}".`);

    // Get correct alternate audio based on dance type
    const danceType = document.body.dataset.danceType || "salsa"; // Default to Salsa
    const alt_soundtrack = altSoundtracksByType[danceType];

    try {
        console.debug('[Player: Play Video] Updating player source');
        player.source = {
            type: 'video',
            sources: [{ src: videoSrc, type: 'video/mp4' }]
        };

        player.once('loadedmetadata', () => {
            // Ensure video has focus when it loads for keyboard controls
            ensureVideoFocus();
            
            startPlayback(
                video_filename,
                start,
                end,
                calculatedSpeed,
                move_name,
                notes,
                step_counter,
                alt_soundtrack
            );
        });

        player.once('error', (error) => {
            console.error('[Player: Play Video] Error loading video:', error);
            hidePlayer();
            document.getElementById('player-placeholder').style.display = 'block';
            displayNotes(move_name, "Failed to load video.");
        });
    } catch (error) {
        console.error('[Player: Play Video] Unexpected error:', error);
        hidePlayer();
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes("", "Unexpected error occurred while loading video.");
    }
}

function playMoveByIndex(moveIndex) {
    const move = allMoves[moveIndex];
    if (!move) {
        console.error(`[Play Move By Index] No move found for index ${moveIndex}.`);
        return;
    }

    console.info(`[Play Move By Index] Playing move: "${move.move_name}"`);

    playVideo({
        video_filename: move.video_filename,
        start: move.loop_start,
        end: move.loop_end,
        speed: move.loop_speed,
        notes: move.notes,
        move_name: move.move_name,
        step_counter: move.step_counter
    });

    currentVideoIndex = moveIndex;
}

function pausePlayer() {
    if (player) {
        player.pause();
        console.debug("[Player] Video paused.");
    } else {
        console.error("[Player] Cannot pause, player is undefined.");
    }
}

function showPlayer() {
    const videoElement = getVideoElement();
    if (videoElement) {
        videoElement.style.display = "block";
        console.debug("[Player] Video shown.");
    } else {
        console.error("[Player] Cannot show player, element not found.");
    }
}

function hidePlayer() {
    const videoElement = getVideoElement();
    if (videoElement) {
        videoElement.style.display = "none";
        console.debug("[Player] Video hidden.");
    } else {
        console.error("[Player] Cannot hide player, element not found.");
    }
}

// Set Player Speed
export function setPlaybackSpeed(speed) {
    const closestSpeed = speeds.reduce((prev, curr) => Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev);
    player.speed = closestSpeed;

    const sliderIndex = speeds.indexOf(closestSpeed);
    if (sliderIndex < 0 || sliderIndex >= speeds.length) {
        console.error('[Player] Invalid slider index:', sliderIndex);
        return;
    }

    document.getElementById('speed-slider').value = sliderIndex;
    document.getElementById('speed-display').innerText = `${closestSpeed}x`;

    console.info(`[Player] Speed set to ${closestSpeed}.`);
}

function getPlaybackSpeed() {
    const slider = document.getElementById('speed-slider');
    const sliderValue = parseInt(slider?.value, 10);
    return speeds[sliderValue] || 1.0;
}

export function determinePlaybackSpeed(loopSpeed) {
    return isSpeedOverride ? getPlaybackSpeed() : (loopSpeed || 1.0);
}

function updateSpeedFromSlider(sliderIndex) {
    if (sliderIndex < 0 || sliderIndex >= speeds.length) {
        console.error('[Player] Invalid slider index:', sliderIndex);
        return;
    }

    const speed = speeds[sliderIndex];
    player.speed = speed;

    document.getElementById('speed-display').innerText = `${speed}x`;

    console.debug(`[Player] Speed updated to ${speed} (Slider index: ${sliderIndex}).`);

    // Also update alternate audio speed if it's enabled
    if (isAlternateSoundtrackEnabled) {
        audioPlayer.playbackRate = speed;
        logToDebugWindow(`[Alt Audio] Updated playback rate to ${speed}`);
    }
}

export function toggleAutoplay(enabled) {
    isAutoplayEnabled = enabled;
    console.info(`[Autoplay] Autoplay is now ${enabled ? 'enabled' : 'disabled'}.`);
}    

export function setAutoplayEnabled(enabled) {
    isAutoplayEnabled = enabled; // Update the global autoplay state
    const autoplayToggle = document.getElementById('autoplay-switch');
    if (autoplayToggle) {
        autoplayToggle.checked = enabled; // Sync the UI toggle
    }
    console.info(`[Player] Autoplay enabled: ${enabled}`);
}

export function playVideoByDesignator(designator) {
    const move = allMoves.find(
        move => move.video_id === designator || move.video_filename === designator
    );
    if (move) {
        playVideo({
            video_filename: move.video_filename,
            start: move.loop_start || 0,
            end: move.loop_end || null,
            speed: player.speed,
            notes: move.notes,
            move_name: move.move_name,
            step_counter: move.step_counter
        });

        // Ensure the video is paused after loading
        player.once('loadedmetadata', () => {
            player.pause(); // Pause the player after metadata is loaded
            console.info(`[Player] Video "${move.video_filename}" loaded and paused.`);
        });
    } else {
        console.error(`[Player] Video not found for designator: ${designator}`);
    }
}

function playNextVideo() {
    playVideoRelativeToCurrent(1);
}

function playPreviousVideo() {
    playVideoRelativeToCurrent(-1);
}

function playVideoRelativeToCurrent(offset) {
    console.info(`[Autoplay] Attempting to play move with offset ${offset}.`);

    if (!moveTableIndices.length) {
        console.error('[Autoplay] No moves available in the table.');
        return;
    }

    const currentTableIndex = moveTableIndices.indexOf(currentVideoIndex);
    if (currentTableIndex === -1) {
        console.error(`[Autoplay] Current video index is not in the table: ${currentVideoIndex}.`);
        return;
    }

    let targetTableIndex = currentTableIndex + offset;

    // Wrap forward or clamp backward
    if (targetTableIndex >= moveTableIndices.length) {
        targetTableIndex = 0;
    } else if (targetTableIndex < 0) {
        targetTableIndex = 0; // Or optionally: moveTableIndices.length - 1
    }

    const targetMoveIndex = moveTableIndices[targetTableIndex];
    const targetMove = allMoves[targetMoveIndex];

    if (!targetMove) {
        console.error('[Autoplay] Target move not found.');
        return;
    }

    console.info(`[Autoplay] Playing move: "${targetMove.move_name}"`);

    // Clear existing loop handler
    if (player?.media?.loopHandler) {
        player.media.removeEventListener('timeupdate', player.media.loopHandler);
        player.media.loopHandler = null;
        console.info("[Autoplay] Cleared existing loop listener.");
    }

    if (isMoveAnnouncementEnabled) {
        announceMove(sanitizeMoveName(targetMove.move_name)).then(() => {
            console.info("[Autoplay] Move announcement finished, now playing video.");
            playMoveByIndex(targetMoveIndex);
        });
    } else {
        console.info(`[Navigation] Playing move: "${targetMove.move_name}"`);
        playMoveByIndex(targetMoveIndex);
    }
}

// Apply looping with autoplay support
function applyLooping(start, end, stepCounterParams) {
    console.debug(`[Looping] Applying loop: Start=${start}, End=${end}`);

    if (!player || !player.media) {
        console.error('[Looping] Player or media is not initialized.');
        return;
    }

    const media = player.media;

    // Remove existing loop handler
    if (media.loopHandler) {
        media.removeEventListener('timeupdate', media.loopHandler);
        console.debug('[Looping] Cleared existing loop listener.');
    }

    const loopHandler = () => {
        // console.debug(`[Looping] Current Time: ${player.currentTime}, End: ${end}`);
        
        if (player.currentTime >= end || player.ended) {
            if (isAutoplayEnabled) {
                // Check if we've repeated enough times
                if (currentRepeat < REPEAT_COUNT - 1) {
                    currentRepeat++; // Increment repeat count
                    console.info(`[Looping] Repeating move (${currentRepeat + 1}/${REPEAT_COUNT})`);
                    player.currentTime = start;
                    player.play();
                } else {
                    console.info('[Autoplay] Moving to the next move.');
                    currentRepeat = 0; // Reset repeat counter for the next move
                    playNextVideo();
                    hideFrameAndStepCounters();
                }
            } else {
                console.info(`[Looping] Loop triggered. Restarting at ${start}`);
                player.currentTime = start;
                player.play();
            }
        }

        // Update the frame timer and step counter if available
        if (stepCounterParams) {
            updateFrameTimer(stepCounterParams, start);
            updateStepCounter(stepCounterParams);
        }
    };

    // Attach new loop handler
    media.addEventListener('timeupdate', loopHandler);
    media.loopHandler = loopHandler;

    // Show counters only if stepCounterParams exist
    if (stepCounterParams) {
        showFrameAndStepCounters();
    } else {
        hideFrameAndStepCounters();
    }

    console.debug('[Looping] New loop listener added.');
}

export function resetAutoplaySwitch() {
    const autoplaySwitch = document.getElementById('autoplay-switch');
    if (autoplaySwitch) {
        autoplaySwitch.checked = false; // Reset the switch to off
        console.info('[Autoplay] Autoplay switch reset.');
    } else {
        console.error('[Autoplay] Autoplay switch element not found.');
    }        
}        

export function resetCurrentVideoIndex() {
    currentVideoIndex = -1;
    console.info('[Player] currentVideoIndex has been reset.');
}

export function getLoopEnabled() {
    return isLoopEnabled;
}

export function setLoopEnabled(enabled, stepCounterParams) {
    isLoopEnabled = enabled;
    console.info(`[Player] Looping is now ${enabled ? 'enabled' : 'disabled'}.`);

    if (!enabled || !stepCounterParams) {
        hideFrameAndStepCounters(); // Hide counters if looping is disabled or no params
    }
}

async function announceMove(moveName) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.warn('[Speech] Speech Synthesis API not supported.');
            resolve(); // Resolve immediately if speech synthesis isn't available
            return;
        }

        console.info(`[Speech] Announcing move: "${moveName}"`);

        // Pause player and hide it
        pausePlayer();
        hidePlayer();

        // Display the move name overlay
        displayMoveNameOverlay(moveName);

        const utterance = new SpeechSynthesisUtterance(moveName);
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        utterance.onend = () => {
            console.info('[Speech] Move announcement complete.');
            
            // Hide move name and show player
            hideMoveNameOverlay();
            showPlayer();

            resolve(); // Resolve the promise when the announcement is done
        };

        speechSynthesis.speak(utterance);
    });
}

window.announceMove = announceMove;

function displayMoveNameOverlay(moveName) {
    const overlay = document.getElementById("move-name-overlay");
    if (overlay) {
        overlay.textContent = moveName;
        overlay.style.display = "block";
        console.debug(`[Overlay] Move name displayed: "${moveName}"`);
    } else {
        console.error("[Overlay] Move name overlay not found.");
    }
}

function hideMoveNameOverlay() {
    const overlay = document.getElementById("move-name-overlay");
    if (overlay) {
        overlay.style.display = "none";
        console.debug("[Overlay] Move name overlay hidden.");
    } else {
        console.error("[Overlay] Move name overlay not found.");
    }
}

// Function to adjust the speed slider
function adjustSpeed(change) {
    const slider = document.getElementById('speed-slider');
    if (!slider) {
        console.error('[Speed Control] Speed slider not found in the DOM.');
        return;
    }

    const currentValue = parseInt(slider.value, 10);
    const newValue = Math.min(Math.max(currentValue + change, 0), speeds.length - 1);

    slider.value = newValue;
    slider.dispatchEvent(new Event('input'));
    console.debug(`[Speed Control] Speed slider adjusted to index: ${newValue}`);
}    

// Setup Keyboard & Remote Control Events
export function setupKeyboardControls() {
    window.addEventListener('keydown', (event) => {
        if (!player) return;

        const key = event.key;
        const shiftPressed = event.shiftKey;

        console.debug('[Keyboard] Keydown event captured:', { key, shiftPressed });

    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'm', 'f', 's', 'S', 'N', 'n', 'Enter', 'MediaPlayPause', 'MediaTrackNext', 'MediaTrackPrevious'].includes(key)) {
        event.preventDefault();
    }

        // Ensure video player has focus for media controls on touch devices
        if ([' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'n', 'N'].includes(key)) {
            ensureVideoFocus();
        }

        switch (key) {
            case ' ':
            case 'Enter':
                handleKeyboardMuting();
                togglePlayPause();
                break;
            case 'ArrowLeft':
                scrubVideoFast("back");
                break;
            case 'ArrowRight':
                scrubVideoFast("forward");
                break;
            case 'ArrowUp':
                scrubVideoSlow("back");
                break;
            case 'ArrowDown':
                scrubVideoSlow("forward");
                break;
            case 'S':
                adjustSpeed(1);
                break;
            case 's':
                adjustSpeed(-1);
                break;
            case 'Home':
                player.currentTime = 0;
                break;
            case 'End':
                player.currentTime = player.duration;
                break;
            case 'm':
                // Visual feedback to confirm 'm' key detected
                document.body.style.backgroundColor = 'orange';
                setTimeout(() => document.body.style.backgroundColor = '', 200);
                
                if (isAlternateSoundtrackEnabled) {
                    // In alternate mode: toggle alternate audio, keep video muted
                    audioPlayer.muted = !audioPlayer.muted;
                    player.muted = true;  // Video always muted in this mode
                    console.info(`[Manual Mute] Alternate audio: ${audioPlayer.muted ? 'muted' : 'unmuted'}`);
                } else {
                    // Normal mode: toggle video audio
                    player.muted = !player.muted;
                    console.info(`[Manual Mute] Video: ${player.muted ? 'muted' : 'unmuted'}`);
                }
                
                // End keyboard navigation session immediately (user wants control now)
                if (keyboardMuteTimer) {
                    clearTimeout(keyboardMuteTimer);
                    keyboardMuteTimer = null;
                    console.info(`[Manual Mute] Ended keyboard navigation session`);
                }
                break;
            case 'f':
                player.fullscreen.toggle();
                break;
            case 'N':  // Shift + N for Previous Move
                console.info("[Keyboard] Jumping to previous move.");
                handleKeyboardMuting();
                previousVideo();
                break;
            case 'n':  // N for Next Move
                console.info("[Keyboard] Jumping to next move.");
                handleKeyboardMuting();
                nextVideo();
                break;
        }
    });

    // Setup media session controls after player is ready
    setupMediaSessionHandlers();        

}

// Bind media control events (for iPad remote control)
navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());
navigator.mediaSession.setActionHandler("previoustrack", () => previousVideo());
navigator.mediaSession.setActionHandler("nexttrack", () => nextVideo());

// Player control event handlers
function togglePlayPause() {
    if (player.paused) {
        if (currentVideoIndex === -1 && moveTableIndices.length > 0) {
            logToDebugWindow("[Player] No move loaded. Playing first move in playlist.");
            setLoopEnabled(true); // Ensure looping is active
            playMoveByIndex(moveTableIndices[0]);
        } else {
            player.play();
        }
        logToDebugWindow("[Player] Play");
    } else {
        player.pause();
        logToDebugWindow("[Player] Pause");
    }
}

function nextVideo() {
    logToDebugWindow("[Media Control] Next Video");
    playNextVideo();
}

function previousVideo() {
    logToDebugWindow("[Media Control] Previous Video");
    playPreviousVideo();
}

function scrubVideoFast(direction) {
    const seekAmount = direction === "forward" ? .5 : -.5;
    player.currentTime = Math.max(0, player.currentTime + seekAmount);
    logToDebugWindow(`[Media Control] Fast Scrub: ${seekAmount}s`);
}

function handleKeyboardMuting() {
    // Auto-mute system for iPad keyboard navigation
    // Safari blocks keyboard events during unmuted video playback, but allows them when muted.
    // This function temporarily mutes videos during keyboard navigation, then restores audio
    // after 3 seconds of inactivity, enabling reliable n/spacebar controls on iPad.
    if (!keyboardMuteTimer) {
        // First keypress - save original states and mute both audio sources
        originalMuteState = player.muted;
        originalAudioMuteState = audioPlayer.muted;
        player.muted = true;
        audioPlayer.muted = true;
        console.info(`[Keyboard Mute] Auto-muted video: ${originalMuteState}, audio: ${originalAudioMuteState}`);
        
        // Visual feedback - bright green for first keypress
        document.body.style.backgroundColor = 'lightgreen';
        setTimeout(() => document.body.style.backgroundColor = '', 200);
    } else {
        // Subsequent keypress - ensure both stay muted and show timer reset
        player.muted = true;
        audioPlayer.muted = true;
        console.info(`[Keyboard Mute] Timer reset - maintaining silence`);
        document.body.style.backgroundColor = 'lightblue';
        setTimeout(() => document.body.style.backgroundColor = '', 150);
    }
    
    // Reset/extend timer for each keypress
    clearTimeout(keyboardMuteTimer);
    keyboardMuteTimer = setTimeout(() => {
        if (isAlternateSoundtrackEnabled) {
            // In alternate mode: video stays muted, restore alternate audio state
            player.muted = true;
            audioPlayer.muted = originalAudioMuteState;
            console.info(`[Keyboard Mute] Auto-restored alternate audio: ${originalAudioMuteState} (video stays muted)`);
        } else {
            // Normal mode: restore video state, alternate audio stays muted
            player.muted = originalMuteState;
            audioPlayer.muted = true;
            console.info(`[Keyboard Mute] Auto-restored video: ${originalMuteState} (alternate audio stays muted)`);
        }
        keyboardMuteTimer = null;
    }, KEYBOARD_MUTE_TIMEOUT);
}

function scrubVideoSlow(direction) {
    const seekAmount = direction === "forward" ? .034 : -.034;
    player.currentTime = Math.max(0, player.currentTime + seekAmount);
    logToDebugWindow(`[Media Control] Slow Scrub: ${seekAmount}s`);
}

function toggleAlternateAudio(force) {
    const newState = typeof force === 'boolean' ? force : !isAlternateSoundtrackEnabled;
    
    if (newState === isAlternateSoundtrackEnabled) {
        return; // No change, exit early
    }

    isAlternateSoundtrackEnabled = newState;

    const toggle = document.getElementById('alternate-soundtrack-switch');
    if (toggle && toggle.checked !== newState) {
        toggle.checked = newState; // This updates UI without triggering change event
    }

    logToDebugWindow(`[Alternate Audio] ${newState ? "Enabled" : "Disabled"}`);

    const danceType = document.body.dataset.danceType || "salsa";
    const alt_soundtrack = altSoundtracksByType[danceType];

    if (newState) {
        // Enable alternate audio
        if (audioPlayer.src !== `/static/videos/${alt_soundtrack}`) {
            audioPlayer.src = `/static/videos/${alt_soundtrack}`;
        }
    
        audioPlayer.loop = true;

        // Sync playback rate with speed slider
        const speed = getPlaybackSpeed();
        audioPlayer.playbackRate = speed;
        logToDebugWindow(`[Alt Audio] Set playback rate to ${speed}`);

        audioPlayer.play().catch(err => logToDebugWindow(`[Alt Audio] Playback failed: ${err}`));
    
        // Always mute video when alternate audio is active
        if (!player.muted) {
            player.muted = true;
            logToDebugWindow("[Alt Audio] Muted video player.");
        }
    
    } else {
        // Disable alternate audio
        audioPlayer.pause();
    
        // Only unmute video if autoplay is not active
        if (!isAutoplayEnabled && player.muted) {
            player.muted = false;
            logToDebugWindow("[Alt Audio] Unmuted video player.");
        }
    }    
}

function sanitizeMoveName(moveName) {
    if (!moveName) return "";

    return moveName
        .replace(/^\./, "") // Remove leading periods
        .replace(/\bCBL\b/g, "Cross Body Lead")
        .replace(/\bRCBL\b/g, "Reverse Cross Body Lead")
        .replace(/\bCOP\b/g, "Change Of Place")
        .replace(/LL/g, "") // Remove LL
        .replace(/RR/g, "") // Remove RR
        .replace(/LR/g, "") // Remove LR
        .replace(/RL/g, "") // Remove RL
        .replace(/&/g, "and") // Expand '&' to 'and'
        .trim(); // Remove any trailing spaces after modifications
}

function getVideoElement() {
    return document.querySelector(".plyr__video-wrapper video");
}

// Ensure video player has focus for keyboard controls on touch devices
function ensureVideoFocus() {
    if (!player || !player.media) return;
    
    try {
        // Focus the video element to ensure keyboard controls work on touch devices
        player.media.focus({ preventScroll: true });
        console.debug('[Focus] Video player focused for keyboard control');
    } catch (error) {
        console.debug('[Focus] Could not focus video element:', error);
    }
}

function updateFrameTimer(stepCounterParams, loopStart) {
    const frameTimer = document.getElementById('frame-timer');
    if (!frameTimer || !player || !player.currentTime) return;

    // Determine the reference time:
    // Use one_time from stepCounterParams (if available)
    // If missing, fallback to loopStart
    const referenceTime = stepCounterParams?.one_time ?? loopStart ?? 0;

    // Get absolute and relative times
    const absoluteTime = player.currentTime.toFixed(2);
    const relativeTime = (player.currentTime - referenceTime).toFixed(2);

    // Update the frame timer display
    frameTimer.textContent = `${absoluteTime} / ${relativeTime >= 0 ? '+' : ''}${relativeTime}`;

    // console.debug(`[Frame Timer] Absolute: ${absoluteTime}, Relative (to reference=${referenceTime}): ${relativeTime}`);
}

// Modify the updateStepCounter to respect the stop-motion effect
function updateStepCounter({ one_time, measure_time, measure_count, visibleCounts }) {
    const stepCounter = document.getElementById('step-counter');
    if (!stepCounter || !player || !player.currentTime) return;

    // Improve Naming: Default sync offset at normal speed
    const defaultSyncOffset = 0.090; // Offset at 1.0x speed
    const playbackSpeed = player.speed || 1.0; // Prevent division by zero

    // Fix Scaling: Decrease offset when playing slower, increase when playing faster
    const syncOffset = defaultSyncOffset * playbackSpeed; // Adjust dynamically

    // Apply the corrected synchronization offset
    const elapsedTime = (player.currentTime - (one_time - syncOffset) + measure_time) % measure_time;
    const step = Math.floor((elapsedTime / measure_time) * measure_count) + 1;

    // Only trigger on step transitions
    if (step !== lastStep && visibleCounts.includes(step)) {
        lastStep = step; // Update the last step
        stepCounter.textContent = step; // Display the step number
        stepCounter.style.display = 'block';

        // Adjust Freeze Frame Pause Based on Speed (from previous step)
        if (isStopMotionEnabled && !player.paused) {
            const basePauseTime = 300; // Base pause duration in ms at normal speed
            const adjustedPauseTime = basePauseTime / playbackSpeed; // Scale pause time

            console.info(`[Freeze Frame] Pausing for ${adjustedPauseTime.toFixed(0)} ms (Speed: ${playbackSpeed}x)`);

            // Hide controls for this brief pause, to prevent the distracting flicker
            player.elements.controls.hidden = true;
            player.pause();

            setTimeout(() => {
                player.play();
                player.elements.controls.hidden = false; // Unhide controls after pause
            }, adjustedPauseTime);
        }
    } else if (!visibleCounts.includes(step)) {
        stepCounter.style.display = 'none'; // Hide for skipped counts
    }

    console.debug(`[Step Counter] Speed: ${playbackSpeed}x | Sync Offset: ${syncOffset.toFixed(3)}s`);
}

function showFrameAndStepCounters() {
    const frameTimer = document.getElementById('frame-timer');
    const stepCounter = document.getElementById('step-counter');

    if (frameTimer) frameTimer.style.display = 'block';
    if (stepCounter) stepCounter.style.display = 'block';

    console.debug('[Counters] Frame and step counters are now visible.');
}

function hideFrameAndStepCounters() {
    const frameTimer = document.getElementById('frame-timer');
    const stepCounter = document.getElementById('step-counter');

    if (frameTimer) frameTimer.style.display = 'none';
    if (stepCounter) stepCounter.style.display = 'none';

    console.debug('[Counters] Frame and step counters are now hidden.');
}

// Add this function to handle player placement based on orientation
function handleOrientationChange() {
    const playerWrapper = document.getElementById('player-wrapper');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const notesCard = leftPanel.querySelector('.card'); // Reference the entire card containing notes

    if (!playerWrapper || !leftPanel || !rightPanel || !notesCard) {
        console.error('[Orientation Change] Missing required elements for orientation handling.');
        return;
    }

    if (window.innerHeight > window.innerWidth) {
        // Portrait mode: Move player above the notes card
        if (!leftPanel.contains(playerWrapper)) {
            if (notesCard && leftPanel.contains(notesCard)) {
                leftPanel.insertBefore(playerWrapper, notesCard);
            } else {
                leftPanel.appendChild(playerWrapper); // Fallback to appending at the end
            }
            console.debug('[Orientation Change] Player moved to left panel (portrait mode).');
        }
    } else {
        // Landscape mode: Move player to the right panel
        if (!rightPanel.contains(playerWrapper)) {
            rightPanel.appendChild(playerWrapper);
            console.debug('[Orientation Change] Player moved to right panel (landscape mode).');
        }
    }
}

// Splash Screen Functions
function showInstructions(text) {
    const overlay = document.querySelector('.instructions-overlay');
    if (!overlay) {
        console.error('[Player UI] Missing instructions overlay.');
        return;
    }

    const instructionsText = `
        <ol>
            ${text.map(item => `<li>${item}</li>`).join('')}
        </ol>
    `;
    overlay.innerHTML = `<div class="instructions-text">${instructionsText}</div>`;
    overlay.style.display = 'flex';
    console.info('[Player UI] Splash screen displayed.');
}

function hideInstructions() {
    const overlay = document.querySelector('.instructions-overlay');
    if (!overlay) {
        console.error('[Player UI] Missing instructions overlay.');
        return;
    }

    overlay.style.display = 'none';
    console.debug('[Player UI] Splash screen hidden.');
}

// displayNotes function moved to movesTable.js


function startPlayback(video_filename, start, end, speed, move_name, notes, step_counter, alt_soundtrack) {
    console.info(`[Start Playback] Playing video "${video_filename}" | Start=${start}, End=${end}, Speed=${speed}`);
    console.debug(`[Alternate Soundtrack] Received filename: ${alt_soundtrack}`);

    updateCurrentMoveHighlight();
    setPlaybackSpeed(speed);
    displayNotes(move_name, notes);

    if (isLoopEnabled && end !== null) {
        applyLooping(start, end, step_counter);
        updateFrameTimer(step_counter, start);
    }

    seekToStart(start).then(() => {
        console.debug('[Start Playback] Seek completed');

        // Alternate Soundtrack Logic (Only Runs if Enabled)
        if (isAlternateSoundtrackEnabled && alt_soundtrack) {
            // When alternate soundtrack is enabled, ALWAYS mute video (play music instead)
            console.info(`[Alternate Soundtrack] Playing "${alt_soundtrack}". Muting video.`);
            player.muted = true;

            if (audioPlayer.src !== `/static/videos/${alt_soundtrack}`) {
                audioPlayer.src = `/static/videos/${alt_soundtrack}`;
            }

            console.debug(`[Alternate Soundtrack] Attempting to play: ${audioPlayer.src}`);

            audioPlayer.loop = true;
            audioPlayer.play().then(() => {
                console.info(`[Alternate Soundtrack] Audio playback started.`);
            }).catch(error => {
                console.error('[Alternate Soundtrack] Audio playback failed:', error);
            });

            // Ensure alternate audio stops when the video ends
            player.once('ended', () => {
                console.debug('[Alternate Soundtrack] Video ended, stopping alternate soundtrack.');
                audioPlayer.pause();
            });

        } else {
            console.info('[Alternate Soundtrack] No alternate track.');
            audioPlayer.pause();
            
            // Respect keyboard mute state - only unmute if not in keyboard navigation mode
            if (!keyboardMuteTimer) {
                console.info('[Alternate Soundtrack] Unmuting video (no keyboard navigation active).');
                player.muted = false;
            } else {
                console.info('[Alternate Soundtrack] Keeping video muted (keyboard navigation active).');
                player.muted = true;
            }
        }
    }).catch(error => {
        console.error('[Start Playback] Seek failed:', error);
    });
}

function updateCurrentMoveHighlight() {
    const moveTable = document.querySelector('#moves-table-container tbody');
    if (!moveTable) {
        console.error('[Move Highlighting] Moves table not found.');
        return;
    }

    // Clear previous bolding
    Array.from(moveTable.rows).forEach(row => {
        const moveNameCell = row.cells[0]; // Assume move name is in the first column
        if (moveNameCell) {
            moveNameCell.classList.remove('current-move');
        }
    });

    if (currentVideoIndex === -1 || !allMoves[currentVideoIndex]) {
        console.info('[Move Highlighting] No move is currently playing.');
        return;
    }

    console.debug('[Move Highlighting] currentVideoIndex:', currentVideoIndex, 'allMoves[currentVideoIndex]:', allMoves[currentVideoIndex]);

    const currentTableIndex = moveTableIndices.indexOf(currentVideoIndex);
    if (currentTableIndex !== -1) {
        const currentRow = moveTable.rows[currentTableIndex];
        if (currentRow) {
            const moveNameCell = currentRow.cells[0];
            if (moveNameCell) {
                moveNameCell.classList.add('current-move');
                console.info(`[Move Highlighting] Bolded move name for "${allMoves[currentVideoIndex].move_name}".`);
            }

            // Use the correct scroll container
            const scrollContainer = document.getElementById('moves-table-container');
            if (scrollContainer) {
                const rowOffset = currentRow.offsetTop;
                const rowHeight = currentRow.offsetHeight;
                const visibleHeight = scrollContainer.clientHeight;

                const scrollTarget = rowOffset - (visibleHeight / 2) + (rowHeight / 2);
                scrollContainer.scrollTop = Math.max(0, scrollTarget);
            }
        }
    }
}

function seekToStart(start) {
    console.debug(`[Seek] Attempting to set start time to: ${start}`);
    return new Promise((resolve, reject) => {
        player.play().then(() => {
            console.debug('[Seek] Playback started to enable seeking.');
            player.currentTime = start;

            player.once('seeked', () => {
                if (Math.abs(player.currentTime - start) <= 0.5) {
                    console.info(`[Seek Success] Sought to: Target time=${start}, Current time=${player.currentTime}`);
                    resolve();
                } else {
                    console.error(`[Seek Failed] Time mismatch: Target time=${start}, Current time=${player.currentTime}`);
                    reject(new Error('Seek operation failed.'));
                }    
            });    
        }).catch(error => {
            console.error('[Seek] Failed to start playback:', error);
            reject(error);
        });    
    });    
}

function logToDebugWindow(message) {
    console.log(message); // Always log to browser console

    const debugContainer = document.getElementById("debug-log");
    const messageContainer = document.getElementById("debug-messages");

    if (!isDebugOverlayEnabled) {
        if (debugContainer) {
            debugContainer.style.display = "none"; // 🔒 Hide the container
        }
        return;
    }

    if (!messageContainer) {
        console.warn("[Debug] #debug-messages container not found.");
        return;
    }

    debugContainer.style.display = "block"; // 🔓 Ensure it's visible when enabled

    const p = document.createElement("p");
    p.style.margin = "0";
    p.textContent = message;
    messageContainer.appendChild(p);

    debugContainer.scrollTop = debugContainer.scrollHeight;
}

// Log all keyboard events
document.addEventListener("keydown", (event) => {
    logToDebugWindow(`[Keyboard] Keydown: ${event.key}, Code: ${event.code}`);
});

document.addEventListener("DOMContentLoaded", () => {
    const debugContainer = document.getElementById("debug-log");
    if (debugContainer) {
        debugContainer.style.display = isDebugOverlayEnabled ? "block" : "none";
    }
});