// player.js
"use strict";
import { allMoves } from './index.js';
import { on } from './common.js';
import { moveTableIndices } from './movesTable.js';
import { getCurrentTag } from './tagFilter.js';

console.info('[Global] player.js loaded');

const speeds = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.57, 0.63, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.6, 1.8, 2.0
];

let player;
let isSpeedOverride = false;
let isAutoplayEnabled = false;
let currentVideoIndex = -1;         // Index of the currently playing video in allMoves
let isLoopEnabled = false;

export function setLoopEnabled(enabled) {
    isLoopEnabled = enabled;
    console.info(`[Player] Looping is now ${enabled ? 'enabled' : 'disabled'}.`);

    if (!enabled) {
        hideStepCounter();
    }    
}

export function getLoopEnabled() {
    return isLoopEnabled;
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

// Function to toggle autoplay
export function toggleAutoplay(enabled) {
    isAutoplayEnabled = enabled;
    console.info(`[Autoplay] Autoplay is now ${enabled ? 'enabled' : 'disabled'}.`);
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

function showStepCounter() {
    const stepCounter = document.getElementById('step-counter');
    if (stepCounter) stepCounter.style.display = 'block';
}

function hideStepCounter() {
    const stepCounter = document.getElementById('step-counter');
    if (stepCounter) stepCounter.style.display = 'none';
}

function updateAbsoluteTimer() {
    const absoluteTimer = document.getElementById('absolute-timer');
    if (!absoluteTimer || !player || !player.currentTime) return;

    const currentTime = player.currentTime.toFixed(2);
    absoluteTimer.textContent = `Time: ${currentTime}`;
}

function updateRelativeTimer(one_time = 0) {
    const relativeTimer = document.getElementById('relative-timer');
    if (!relativeTimer || !player || !player.currentTime) return;

    const relativeTime = (player.currentTime - one_time).toFixed(2);
    relativeTimer.textContent = `${relativeTime >= 0 ? '+' : ''}${relativeTime}`;
}

function updateStepCounter({ one_time, measure_count, measure_time, visibleCounts }) {
    const stepCounter = document.getElementById('step-counter');
    if (!stepCounter || !player || !player.currentTime) return;

    const elapsedTime = (player.currentTime - one_time + measure_time) % measure_time;
    const step = Math.floor((elapsedTime / measure_time) * measure_count) + 1;

    // Only display steps in visibleCounts
    if (visibleCounts.includes(step)) {
        stepCounter.textContent = step; // Display the step number
        stepCounter.style.display = 'block';
    } else {
        stepCounter.style.display = 'none'; // Hide for skipped counts
    }
}

// Apply looping with autoplay support
function applyLooping(start, end, counterParams) {
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
        if (player.currentTime >= end || player.ended) {
            if (isAutoplayEnabled) {
                console.info('[Autoplay] Moving to the next video.');
                playNextVideo();
            } else {
                console.info(`[Looping] Loop triggered. Looping back to start (${start}).`);
                player.currentTime = start;
                player.play();
            }
        }

        // Update the frame timer
        updateAbsoluteTimer();
        updateRelativeTimer(counterParams?.one_time);

        // Update the step counter
        if (counterParams) updateStepCounter(counterParams);
    };

    // Attach new loop handler
    media.addEventListener('timeupdate', loopHandler);
    media.loopHandler = loopHandler;

    // Show the step counter during looping
    showStepCounter();
    console.debug('[Looping] New loop listener added.');
}

// Play the next video in the sequence
function playNextVideo() {
    if (!moveTableIndices.length) {
        console.error('[Autoplay] No moves available in the table.');
        return;
    }

    // Find the current table index (position within moveTableIndices)
    const currentTableIndex = moveTableIndices.indexOf(currentVideoIndex);
    if (currentTableIndex === -1) {
        console.error(`[Autoplay] Current video index is not in the table: ${currentVideoIndex}.`);
        return;
    }

    // Calculate the next table index (wrap around with modulo)
    const nextTableIndex = (currentTableIndex + 1) % moveTableIndices.length;

    // Get the next move index from moveTableIndices
    const nextMoveIndex = moveTableIndices[nextTableIndex];
    const nextMove = allMoves[nextMoveIndex];

    if (!nextMove) {
        console.error('[Autoplay] No next move found.');
        return;
    }

    console.info(`[Autoplay] Playing next video: "${nextMove.move_name}"`);

    // Update currentVideoIndex to the next move index
    currentVideoIndex = nextMoveIndex;
    console.debug(`[Autoplay] Updated currentVideoIndex to ${currentVideoIndex}.`);

    // Play the next video
    console.info(`[Autoplay] Playing next video: "${nextMove.move_name}"`);
    playVideo({
        video_filename: nextMove.video_filename,
        start: nextMove.loop_start,
        end: nextMove.loop_end,
        speed: nextMove.loop_speed,
        notes: nextMove.notes
    });
}

export function setAutoplayEnabled(enabled) {
    isAutoplayEnabled = enabled; // Update the global autoplay state
    const autoplayToggle = document.getElementById('autoplay-switch');
    if (autoplayToggle) {
        autoplayToggle.checked = enabled; // Sync the UI toggle
    }
    console.info(`[Player] Autoplay enabled: ${enabled}`);
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

// Initialize and Setup Speed Slider
export function initializeSpeedSlider() {
    const slider = document.getElementById('speed-slider');
    if (!slider) {
        console.error('[Player] Speed slider element not found in the DOM.');
        return;
    }

    // Initialize slider to default speed
    const defaultSpeed = 1.0;
    const defaultIndex = speeds.indexOf(defaultSpeed);

    if (defaultIndex !== -1) {
        slider.value = defaultIndex;            // Set slider position
        updateSpeedFromSlider(defaultIndex);    // Sync player speed
        console.info(`[Player] Speed slider initialized to ${defaultSpeed}x.`);
    } else {
        console.warn('[Player] Default speed (1.0) not found in speeds array.');
    }

    // Set up event listener for slider interaction
    slider.addEventListener('input', (event) => {
        const sliderIndex = parseInt(event.target.value, 10);
        updateSpeedFromSlider(sliderIndex);
        isSpeedOverride = true; // Mark override as active
        console.info('[Player] Speed override activated via slider.');
    });

    console.info('[Player] Speed slider setup and initialization complete.');
}

// Setup Keyboard Controls
export function setupKeyboardControls() { 
    document.addEventListener('keydown', (event) => {
        if (!player) return;
    
        const key = event.key;
        const shiftPressed = event.shiftKey;
        const seekAmount = shiftPressed ? 5 : 1;
    
        console.debug('[Debug] Keydown event captured:', { key, shiftPressed });
    
        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'm', 'f', 's', 'S'].includes(key)) {
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
        }
    });
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

    if (player) player.destroy();

    player = new Plyr(videoElement, {
        controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
    });

    console.info('[Player] Player initialized.');

    // Attach hideInstructions to player "play" event
    if (player) {
        player.on('play', () => {
            hideInstructions();
            player.media.focus(); // Ensure focus is set to the player
            console.debug('[Player UI] Instructions hidden and focus set to media.');
        });
    }

    // Handle moveAction events
    on('moveAction', ({ moveIndex }) => {
        console.debug('[moveAction] Event triggered with parameters:', { moveIndex });
    
        // Fetch the move by index
        const move = allMoves[moveIndex];
        if (!move) {
            console.error(`[Player] No move found for index ${moveIndex}.`);
            console.debug('[Player] All available moves:', allMoves);
            return;
        }
    
        console.debug('[Player] Move data retrieved:', move);
    
        // Destructure the move data
        const { video_filename, loop_start, loop_end, loop_speed, guide_start, notes } = move;
    
        // Determine playback speed with override logic
        const speed = determinePlaybackSpeed(loop_speed);
        console.debug('[Player] Determined playback speed:', speed);
    
        // Update the speed slider
        const slider = document.getElementById('speed-slider');
        if (!slider) {
            console.error('[Player] Speed slider not found in the DOM.');
            return;
        }
        const sliderIndex = speeds.indexOf(speed);
    
        if (sliderIndex === -1) {
            console.error('[Player] Speed not found in predefined speeds:', speed);
            console.debug('[Player] Predefined speeds:', speeds);
            return;
        }
    
        console.debug('[Player] Updating speed slider to index:', sliderIndex);
        slider.value = sliderIndex;
        slider.dispatchEvent(new Event('input'));
    
        // Update the global currentVideoIndex to track the current video
        currentVideoIndex = moveIndex;
        console.debug(`[Player] Updated currentVideoIndex to ${currentVideoIndex}.`);

        // Play the selected video
        const isLooping = getLoopEnabled(); // Use the global loop state
        playVideo({
            video_filename,
            start: isLooping ? loop_start : guide_start,
            end: isLooping ? loop_end : null,
            speed,
            notes
        });
    });
}

function displayNotes(notes) {
    const formattedNotes = notes.replace(/  /g, "\n"); // Replace double spaces with newlines
    document.getElementById('notes-content').innerText = formattedNotes; // Preserve newlines
    console.debug(`[Notes] Updated notes: ${formattedNotes}`);
}

function startPlayback(video_filename, start, end, speed, notes) {
    console.info(`[Start Playback] Playing video "${video_filename}" | Start=${start}, End=${end}, Speed=${speed}`);

    // Update current video index
    const moveIndex = allMoves.findIndex(move => move.video_filename === video_filename);
    if (moveIndex !== -1) {
        currentVideoIndex = moveIndex;
    }

    updateCurrentMoveHighlight();
    setPlayerSpeed(speed);
    displayNotes(notes);

    if (isLoopEnabled && end !== null) {
        applyLooping(start, end, {
            one_time: 136.7,                   // The time when the first "one" occurs in seconds
            measure_count: 8,                  // Number of steps in one measure
            measure_time: 3,                   // Duration of one measure in seconds      
            visibleCounts: [1, 2, 3, 5, 6, 7]  // Display only these counts
        });        
    }

    seekToStart(start).then(() => {
        console.debug('[Start Playback] Seek completed');
    }).catch(error => {
        console.error('[Start Playback] Seek failed:', error);
    });
}

function updateCurrentMoveHighlight() {
    const moveTable = document.querySelector('#moves-table-container tbody');
    if (!moveTable) {
        console.error('[Current Move] Moves table not found.');
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
        console.info('[Current Move] No move is currently playing.');
        return;
    }

    const currentTableIndex = moveTableIndices.indexOf(currentVideoIndex);
    if (currentTableIndex !== -1) {
        const currentRow = moveTable.rows[currentTableIndex];
        if (currentRow) {
            const moveNameCell = currentRow.cells[0];
            if (moveNameCell) {
                moveNameCell.classList.add('current-move');
                console.info(`[Current Move] Bolded move name for "${allMoves[currentVideoIndex].move_name}".`);
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

export function playVideo({
    video_filename,
    start,
    end,
    speed = 1,
    notes = ''
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
    const calculatedSpeed = isSpeedOverride && sliderValue !== null ? speeds[sliderValue] : speed;

    const videoSrc = `/static/videos/${video_filename}`;
    console.debug(`[Player: Play Video] Resolving playback for "${video_filename}".`);

    try {
        console.debug('[Player: Play Video] Updating player source');
        player.source = {
            type: 'video',
            sources: [{ src: videoSrc, type: 'video/mp4' }]
        };

        player.once('loadedmetadata', () => {
            startPlayback(video_filename, start, end, calculatedSpeed, notes);
        });

        player.once('error', (error) => {
            console.error('[Player: Play Video] Error loading video:', error);
            document.getElementById('player').style.display = 'none';
            document.getElementById('player-placeholder').style.display = 'block';
            displayNotes("Failed to load video.");
        });
    } catch (error) {
        console.error('[Player: Play Video] Unexpected error:', error);
        document.getElementById('player').style.display = 'none';
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes("Unexpected error occurred while loading video.");
    }
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

// Initialize orientation handling
export function initializeOrientationHandling() {
    handleOrientationChange(); // Initial placement
    window.addEventListener('resize', handleOrientationChange); // Adjust on window resize
    console.info('[Orientation Change] Orientation handling initialized.');
}
