// player.js
"use strict";
import { on, trigger } from './common.js';
import { allMoves } from './index.js';

console.debug('[Global] player.js loaded');

const speeds = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.57, 0.63, 0.7, 0.8,
    0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.6, 1.8, 2.0
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

// Initialize Player
export function initializePlayer(videoElement) {
    if (player) player.destroy();

    player = new Plyr(videoElement, {
        controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
    });

    // Handle Playback Events
    player.on('play', () => trigger('playbackStarted'));
    player.on('ended', () => trigger('playbackEnded'));

    console.debug('[Player] Initialized.');

    console.debug('[Player] Speed Slider Config:', {
        min: document.getElementById('speed-slider').min,
        max: document.getElementById('speed-slider').max,
        step: document.getElementById('speed-slider').step,
        value: document.getElementById('speed-slider').value,
    });    
}

// Setup Speed Control
export function setupSpeedControl() {
    document.getElementById('speed-slider').addEventListener('input', (event) => {
        const speedValue = parseInt(event.target.value, 10);
        console.debug(`[Player] Slider value changed: ${speedValue}`);
        setPlayerSpeed(speedValue);

        isSpeedOverride = true;
        console.info('[Player] Speed override activated.');
    });
}

// Initialize
export function initializePlayerUI() {
    on('playbackStarted', () => console.info('[App Event] Playback started.'));
    on('playbackEnded', () => console.info('[App Event] Playback ended.'));

    on('moveAction', ({ moveIndex, action }) => {
        console.debug('[Player] moveAction event parameters:', { moveIndex, action });
    
        // Retrieve the move
        const move = allMoves[moveIndex];
        if (!move) {
            console.error(`[Player] No move found for index ${moveIndex}.`);
            return;
        }
        console.debug('[Player] Retrieved move for moveIndex:', { moveIndex, move });
    
        // Log move details
        console.debug('[Player] Retrieved move:', move);
    
        // Destructure move properties
        const { video_filename, loop_start, loop_end, loop_speed, guide_start, notes } = move;
    
        // Calculate playback speed
        const sliderValue = document.getElementById('speed-slider')?.value;
        const speed = isSpeedOverride && sliderValue !== undefined
            ? speeds[parseInt(sliderValue, 10)]
            : loop_speed;
    
        // Log playback details
        console.info(`[Player] Playing move: ${action} with speed: ${speed}, start: ${action === 'loop' ? loop_start : guide_start}, end: ${action === 'loop' ? loop_end : null}.`);
    
        // Play the video
        playVideo({
            videoFilename: video_filename,
            start: action === 'loop' ? loop_start : guide_start,
            end: action === 'loop' ? loop_end : null,
            speed,
            notes,
            isLooping: action === 'loop',
        });
    });

    const videoElement = document.getElementById('player');
    if (!videoElement) {
        console.error('[Player] No video element found.');
        return;
    }
    initializePlayer(videoElement);
    setupSpeedControl();
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
