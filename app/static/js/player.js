// player.js
"use strict";
import { allMoves } from './index.js';
import { on } from './common.js';

console.debug('[Global] player.js loaded');

const speeds = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.57, 0.63, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.6, 1.8, 2.0
];

let player;
let isSpeedOverride = false; // Tracks if the speed slider is overriding move speeds

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

    console.debug(`[Player] Speed set to ${closestSpeed}.`);
}

// Centralized Speed Determination
function determinePlaybackSpeed(action, loopSpeed) {
    if (action === 'guide') return 1.0; // Fixed speed for guide actions

    if (isSpeedOverride) {
        const sliderValue = parseInt(document.getElementById('speed-slider')?.value, 10);
        return speeds[sliderValue] || 1.0;
    }

    return speeds.reduce((prev, curr) => Math.abs(curr - loopSpeed) < Math.abs(prev - loopSpeed) ? curr : prev);
}

// Initialize Player
export function initializePlayer(videoElement) {
    if (player) player.destroy();

    player = new Plyr(videoElement, {
        controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
    });

    console.debug('[Player] Initialized.');
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

// Setup Speed Control
export function setupSpeedControl() {
    const slider = document.getElementById('speed-slider');
    slider.addEventListener('input', (event) => {
        const sliderIndex = parseInt(event.target.value, 10);
        console.debug(`[Player] Slider value changed: ${sliderIndex}`);
        updateSpeedFromSlider(sliderIndex);

        isSpeedOverride = true; // Activate speed override
        console.info('[Player] Speed override activated.');
    });
}

// Initialize Speed Slider
function initializeSpeedSlider(slider) {
    const defaultSpeed = 1.0;
    const defaultIndex = speeds.indexOf(defaultSpeed);

    if (defaultIndex !== -1) {
        slider.value = defaultIndex;
        updateSpeedFromSlider(defaultIndex);
        console.info(`[Player] Speed slider initialized to ${defaultSpeed}x.`);
    } else {
        console.warn('[Player] Default speed (1.0) not found in speeds array.');
    }
}

// Setup Keyboard Controls
export function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
        if (!player) return;

        const key = event.key;
        const shiftPressed = event.shiftKey;
        const seekAmount = shiftPressed ? 5 : 1;

        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'm', 'f'].includes(key)) {
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
                break;
            case 'ArrowDown':
                player.volume = Math.max(0, player.volume - 0.1);
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

// Splash Screen Functions
function showInstructions(text) {
    const overlay = document.querySelector('.instructions-overlay');
    if (!overlay) {
        console.error('[Splash Screen] No .instructions-overlay element found.');
        return;
    }

    const instructionsText = `
        <ol>
            ${text.map(item => `<li>${item}</li>`).join('')}
        </ol>
    `;
    overlay.innerHTML = `<div class="instructions-text">${instructionsText}</div>`;
    overlay.style.display = 'flex';
    console.debug('[Splash Screen] Instructions displayed.');
}

function hideInstructions() {
    const overlay = document.querySelector('.instructions-overlay');
    if (!overlay) {
        console.error('[Splash Screen] No .instructions-overlay element found.');
        return;
    }

    overlay.style.display = 'none';
    console.debug('[Splash Screen] Instructions hidden.');
}

// Initialize Player UI
export function initializePlayerUI() {
    console.debug('[Player UI] Initializing...');

    // Player instructions
    const instructions = [
        "Pick a dance style to practice.",
        "Select a playlist on the left.",
        "Choose a move from the list.",
        "Press 'Loop' or 'Guide' for targeted practice.",
        "Use the speed control to adjust playback."
    ];
    showInstructions(instructions);

    // Initialize player
    const videoElement = document.getElementById('player');
    if (!videoElement) {
        console.error('[Player UI] No video element found for player initialization.');
        return;
    }

    initializePlayer(videoElement);

    // Attach hideInstructions to player's play event after initialization
    if (player) {
        player.on('play', hideInstructions);
        console.debug('[Player UI] Attached hideInstructions to player "play" event.');
    } else {
        console.warn('[Player UI] Player not initialized. Cannot attach hideInstructions.');
    }

    // Handle moveAction events
    on('moveAction', ({ moveIndex, action }) => {
        console.debug('[moveAction] Event triggered with parameters:', { moveIndex, action });
    
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
        console.debug('[Player] Extracted move properties:', {
            video_filename, loop_start, loop_end, loop_speed, guide_start, notes
        });
    
        // Determine playback speed
        const speed = determinePlaybackSpeed(action, loop_speed);
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
    
        // Play the video
        console.debug('[Player] Preparing to play video with parameters:', {
            videoFilename: video_filename,
            start: action === 'loop' ? loop_start : guide_start,
            end: action === 'loop' ? loop_end : null,
            speed,
            notes,
            isLooping: action === 'loop'
        });
    
        playVideo({
            videoFilename: video_filename,
            start: action === 'loop' ? loop_start : guide_start,
            end: action === 'loop' ? loop_end : null,
            speed,
            notes,
            isLooping: action === 'loop',
        });
    });

    console.info('[Player UI] Initialization complete.');
}

function displayNotes(notes) {
    const formattedNotes = notes.replace(/  /g, "\n"); // Replace double spaces with newlines
    document.getElementById('notes-content').innerText = formattedNotes; // Preserve newlines
    console.debug(`[Notes] Updated notes: ${formattedNotes}`);
}

function executePlayback(start, end, speed, notes, isLooping) {
    console.debug('[Execute Playback] Starting playback logic');

    setPlayerSpeed(speed);
    displayNotes(notes);

    if (isLooping && end !== null) {
        applyLooping(start, end);
    }

    seekToStart(start).then(() => {
        console.debug('[Execute Playback] Seek completed');
    }).catch(error => {
        console.error('[Execute Playback] Seek failed:', error);
    });
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

function applyLooping(start, end) {
    console.debug(`[Looping] Applying loop: Start=${start}, End=${end}`);

    // Ensure the player and media are available
    if (!player || !player.media) {
        console.error('[Looping] Player or media is not initialized.');
        return;
    }

    const videoElement = player.media;

    // Remove any existing loop handler
    if (videoElement.loopHandler) {
        videoElement.removeEventListener('timeupdate', videoElement.loopHandler);
        console.debug('[Looping] Cleared existing timeupdate listener.');
    }

    // Define the loop handler
    const loopHandler = (event) => {
        if (event.target.currentTime >= end) {
            console.debug(`[Looping] Loop complete. Restarting at: ${start}`);
            event.target.currentTime = start;
        }
    };

    // Add the new loop handler
    videoElement.addEventListener('timeupdate', loopHandler);
    videoElement.loopHandler = loopHandler; // Store the handler for easy removal
    console.debug('[Looping] New timeupdate listener added.');
}

function playVideo({
    videoFilename,
    start,
    end = null,
    speed = 1,
    notes = '',
    isLooping = false
}) {
    if (!videoFilename) {
        console.warn('[Player: Play Video] No video filename provided. Displaying placeholder.');
        document.getElementById('player').style.display = 'none';
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes("No video available for this move.");
        return;
    }

    const videoSrc = `/static/videos/${videoFilename}`;
    console.debug(`[Player: Play Video] Video source: ${videoSrc}`);
    console.info(`[Player: Play Video] Playing video "${videoFilename}" | Start=${start}, End=${end}, Speed=${speed}, Loop=${isLooping}`);

    // Check for slider override
    const sliderElement = document.getElementById('speed-slider');
    const sliderValue = sliderElement ? parseInt(sliderElement.value, 10) : null;
    const finalSpeed = isSpeedOverride && sliderValue !== null ? speeds[sliderValue] : speed;

    try {
        const currentSrc = player.source?.sources?.[0]?.src;

        if (currentSrc === videoSrc) {
            console.debug('[Player: Play Video] Source unchanged, skipping reload');
            executePlayback(start, end, finalSpeed, notes, isLooping);
            return;
        }

        console.debug('[Player: Play Video] Updating player source');
        player.source = {
            type: 'video',
            sources: [{ src: videoSrc, type: 'video/mp4' }]
        };

        player.once('loadedmetadata', () => {
            console.debug(`[Player: Play Video] Metadata loaded for "${videoFilename}". Preparing playback.`);
            executePlayback(start, end, finalSpeed, notes, isLooping);
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
