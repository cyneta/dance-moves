// player.js
"use strict";
import { allMoves } from './index.js';
import { on } from './common.js';
import { moveTableIndices } from './movesTable.js';

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

const REPEAT_COUNT = 2;
let currentRepeat = 0;

let audioPlayer = new Audio();      // Create an audio element for the alternate soundtrack

let lastStep = null;                // Track the last displayed step for updateStepCounter
let isStopMotionEnabled = false;    // Global flag for stop-motion effect

// Define alternate soundtracks
const altSoundtracksByType = {
    "salsa": "salsa_loop.mp3",
    "bachata": "Bachata Mix 2020 OSOCITY.mp3",
    "ecs": "Aretha Franklin - Good times.mp3",
    "wcs": "West Coast Swing Classic.mp3",
    "zouk": "Zouk Love - Ultimate Mix.mp3"
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
        setPlayerSpeed(speed);

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
            step_counter
        });
    });
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

    // ✅ Debug: Log when event listeners are attached
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
        isAlternateSoundtrackEnabled = event.target.checked;
        console.info(`[Alternate Soundtrack] Toggle set to ${isAlternateSoundtrackEnabled ? 'enabled' : 'disabled'}.`);

        // Get dance type
        const danceType = document.body.dataset.danceType || "salsa"; // Default to Salsa
        const alt_soundtrack = altSoundtracksByType[danceType];

        if (isAlternateSoundtrackEnabled) {
            console.info(`[Alternate Soundtrack] Switching to "${alt_soundtrack}" for ${danceType}.`);
            player.muted = true;
            
            if (audioPlayer.src !== `/static/videos/${alt_soundtrack}`) {
                audioPlayer.src = `/static/videos/${alt_soundtrack}`;
            }

            audioPlayer.loop = true;
            // audioPlayer.currentTime = ??
            audioPlayer.play().catch(error => {
                console.error('[Alternate Soundtrack] Audio playback failed:', error);
            });

        } else {
            console.info('[Alternate Soundtrack] Disabling alternate soundtrack.');
            player.muted = false;
            audioPlayer.pause();
        }
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
    step_counter = null
}) {
    if (!video_filename) {
        console.warn('[Player: Play Video] No video filename provided. Displaying placeholder.');
        document.getElementById('player').style.display = 'none';
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes("No video available for this move.");
        return;
    }

    const sliderElement = document.getElementById('speed-slider');
    const sliderValue = sliderElement ? parseInt(sliderElement.value, 10) : null;

    // Use loop speed unless manually overridden by the user
    const calculatedSpeed = (isSpeedOverride && sliderValue !== null) ? speeds[sliderValue] : speed;

    console.debug(`[Player] isSpeedOverride: ${isSpeedOverride}, Slider Value: ${sliderValue}, Using Speed: ${calculatedSpeed}`);

    setPlayerSpeed(calculatedSpeed);

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
            startPlayback(
                video_filename,
                start,
                end,
                calculatedSpeed,
                notes,
                step_counter,
                alt_soundtrack
            );
        });

        player.once('error', (error) => {
            console.error('[Player: Play Video] Error loading video:', error);
            hidePlayer();
            document.getElementById('player-placeholder').style.display = 'block';
            displayNotes("Failed to load video.");
        });
    } catch (error) {
        console.error('[Player: Play Video] Unexpected error:', error);
        hidePlayer();
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes("Unexpected error occurred while loading video.");
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
export function setPlayerSpeed(speed) {
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

// Determine Playback Speed
export function determinePlaybackSpeed(loopSpeed) {
    if (isSpeedOverride) {
        const sliderValue = parseInt(document.getElementById('speed-slider')?.value, 10);
        return speeds[sliderValue] || 1.0; // Use the override value if set
    }
    return loopSpeed || 1.0; // Default to loop speed or 1x
}

// Update Speed From Slider
function updateSpeedFromSlider(sliderIndex) {
    if (sliderIndex < 0 || sliderIndex >= speeds.length) {
        console.error('[Player] Invalid slider index:', sliderIndex);
        return;
    }

    const speed = speeds[sliderIndex];
    player.speed = speed;

    document.getElementById('speed-display').innerText = `${speed}x`;

    console.debug(`[Player] Speed updated to ${speed} (Slider index: ${sliderIndex}).`);
}

// Function to toggle autoplay
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
            speed: player.speed, // Use the player's current speed
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

// Play the next video in the sequence
function playNextVideo() {
    console.info("[Autoplay] Attempting to play the next move.");

    if (!moveTableIndices.length) {
        console.error('[Autoplay] No moves available in the table.');
        return;
    }

    const currentTableIndex = moveTableIndices.indexOf(currentVideoIndex);
    if (currentTableIndex === -1) {
        console.error(`[Autoplay] Current video index is not in the table: ${currentVideoIndex}.`);
        return;
    }

    const nextTableIndex = (currentTableIndex + 1) % moveTableIndices.length;
    const nextMoveIndex = moveTableIndices[nextTableIndex];
    const nextMove = allMoves[nextMoveIndex];

    if (!nextMove) {
        console.error('[Autoplay] No next move found.');
        return;
    }

    console.info(`[Autoplay] Playing next move: "${nextMove.move_name}"`);

    // Remove existing loop handler to prevent unintended repeats
    if (player?.media?.loopHandler) {
        player.media.removeEventListener('timeupdate', player.media.loopHandler);
        player.media.loopHandler = null;
        console.info("[Autoplay] Cleared existing loop listener.");
    }

    // Announce the move, then play the next move only after the announcement finishes
    announceMove(sanitizeMoveName(nextMove.move_name)).then(() => {
        console.info("[Autoplay] Move announcement finished, now playing video.");
        playMoveByIndex(nextMoveIndex);
    });
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

function jumpToPreviousMove() {
    if (!moveTableIndices.length) return;
    
    const currentTableIndex = moveTableIndices.indexOf(currentVideoIndex);
    if (currentTableIndex === -1 || currentTableIndex === 0) {
        console.warn("[Keyboard] Already at the first move.");
        return;
    }

    const previousMoveIndex = moveTableIndices[currentTableIndex - 1];
    const previousMove = allMoves[previousMoveIndex];

    console.info(`[Keyboard] Jumping to previous move: "${previousMove.move_name}"`);

    playMoveByIndex(previousMoveIndex);
}

function jumpToNextMove() {
    if (!moveTableIndices.length) return;
    
    const currentTableIndex = moveTableIndices.indexOf(currentVideoIndex);
    if (currentTableIndex === -1 || currentTableIndex >= moveTableIndices.length - 1) {
        console.warn("[Keyboard] Already at the last move.");
        return;
    }

    const nextMoveIndex = moveTableIndices[currentTableIndex + 1];
    const nextMove = allMoves[nextMoveIndex];

    console.info(`[Keyboard] Jumping to next move: "${nextMove.move_name}"`);

    playMoveByIndex(nextMoveIndex);
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

// Setup Keyboard Controls
export function setupKeyboardControls() { 
    window.addEventListener('keydown', (event) => {
        if (!player) return;
    
        const key = event.key;
        const shiftPressed = event.shiftKey;
        const seekAmount = shiftPressed ? .5 : .034;

        console.debug('[Keyboard] Keydown event captured:', { key, shiftPressed });

        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'm', 'f', 's', 'S', 'N', 'n'].includes(key)) {
            event.preventDefault();
        }

        switch (key) {
            case ' ':
                player.togglePlay();
                break;
            case 'ArrowLeft':
                player.currentTime = Math.max(0, player.currentTime - seekAmount);
                break;
            case 'ArrowRight':
                player.currentTime = Math.min(player.duration, player.currentTime + seekAmount);
                break;
            case 'ArrowUp':
                player.volume = Math.min(1, player.volume + 0.1);
                console.debug(`[Volume] Increased to: ${player.volume}`);
                break;
            case 'ArrowDown':
                player.volume = Math.max(0, player.volume - 0.1);
                console.debug(`[Volume] Decreased to: ${player.volume}`);
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
                player.muted = !player.muted;
                break;
            case 'f':
                player.fullscreen.toggle();
                break;
            case 'N':  // Shift + N for Previous Move
                if (isLoopEnabled) {
                    console.info("[Keyboard] Jumping to previous move.");
                    jumpToPreviousMove();
                }
                break;
            case 'n':  // N for Next Move
                if (isLoopEnabled) {
                    console.info("[Keyboard] Jumping to next move.");
                    jumpToNextMove();
                }
                break;
        }
    });
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

function displayNotes(notes) {
    const formattedNotes = notes.replace(/  /g, "\n"); // Replace double spaces with newlines
    document.getElementById('notes-content').innerText = formattedNotes; // Preserve newlines
    console.debug(`[Notes] Updated notes: ${formattedNotes}`);
}

function startPlayback(video_filename, start, end, speed, notes, step_counter, alt_soundtrack) {
    console.info(`[Start Playback] Playing video "${video_filename}" | Start=${start}, End=${end}, Speed=${speed}`);
    console.debug(`[Alternate Soundtrack] Received filename: ${alt_soundtrack}`);

    updateCurrentMoveHighlight();
    setPlayerSpeed(speed);
    displayNotes(notes);

    if (isLoopEnabled && end !== null) {
        applyLooping(start, end, step_counter);
        updateFrameTimer(step_counter, start);
    }

    seekToStart(start).then(() => {
        console.debug('[Start Playback] Seek completed');

        // Alternate Soundtrack Logic (Only Runs if Enabled)
        if (isAlternateSoundtrackEnabled && alt_soundtrack) {
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
            console.info('[Alternate Soundtrack] No alternate track, unmuting video.');
            player.muted = false;
            audioPlayer.pause();
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

// function logDebugMessage(message) {
//     const debugContainer = document.getElementById("debug-messages");
//     if (!debugContainer) return;

//     const newMessage = document.createElement("div");
//     newMessage.textContent = message;
//     debugContainer.appendChild(newMessage);

//     // Scroll to the bottom so latest messages are visible
//     debugContainer.parentElement.scrollTop = debugContainer.parentElement.scrollHeight;

//     console.debug(message); // Still log to console if available
// }
