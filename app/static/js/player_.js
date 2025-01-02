// Core Playback Functions
export function loadVideo(videoIdentifier, startTime = 0) { /* Reuse playVideo logic, focus on loading */ }
export function startPlayback() { /* Resume playback dynamically */ }
export function setPlaybackMode(mode, startTime, endTime = null) { /* Manage play/loop modes */ }

// Automation Logic
export function applyLooping(startTime, endTime) { /* Modularize looping logic */ }
export function applyAutoplay(currentIndex) { /* Modularize autoplay logic */ }

// State Management
export let isLoopEnabled = false;
export let isAutoplayEnabled = false;
export function setLoopEnabled(enabled) { /* Manage loop state */ }
export function setAutoplayEnabled(enabled) { /* Manage autoplay state */ }

// Synchronization
export function updateURLWithState() { /* Dynamic state-to-URL synchronization */ }
export function updateStateFromURL(queryParams) { /* Apply URL state to the app */ }

export function loadVideo(videoIdentifier, startTime = 0) {
    const move = allMoves.find(
        move => move.video_id === videoIdentifier || move.video_filename === videoIdentifier
    );

    if (!move) {
        console.error(`[Player] Video not found for identifier: ${videoIdentifier}`);
        return false;
    }

    player.source = {
        type: 'video',
        sources: [{ src: `/static/videos/${move.video_filename}`, type: 'video/mp4' }]
    };

    player.once('loadedmetadata', () => {
        player.currentTime = startTime;
        player.pause(); // Explicitly pause to ensure consistent behavior
        console.info(`[Player] Video "${move.video_filename}" loaded at ${startTime}s and paused.`);
    });

    player.once('error', (error) => {
        console.error(`[Player] Error loading video: ${move.video_filename}`, error);
    });

    return true;
}

export function startPlayback() {
    if (!player.source) {
        console.error('[Player] Cannot start playback. No video source loaded.');
        return;
    }

    player.play().then(() => {
        console.info(`[Player] Playback started at ${player.currentTime}s.`);
    }).catch((error) => {
        console.error('[Player] Error starting playback:', error);
    });
}

export function configurePlaybackMode(mode, startTime, endTime = null) {
    if (mode === 'loop') {
        console.info('[Player] Configuring playback mode: loop.');
        setupLooping(startTime, endTime);
    } else {
        console.info('[Player] Configuring playback mode: play.');
        player.currentTime = startTime;
    }
}

export function setupLooping(startTime, endTime) {
    if (!endTime) {
        console.warn('[Player] End time is not defined for looping.');
        return;
    }

    const loopHandler = () => {
        if (player.currentTime >= endTime) {
            console.info(`[Player] Looping back to start: ${startTime}s.`);
            player.currentTime = startTime;
            player.play();
        }
    };

    player.addEventListener('timeupdate', loopHandler);
    console.info(`[Player] Looping enabled: Start=${startTime}, End=${endTime}.`);
}

export function prepareAutoplay(currentIndex) {
    if (!isAutoplayEnabled) return;

    const nextMoveIndex = currentIndex + 1;
    const nextMove = allMoves[nextMoveIndex];

    if (!nextMove) {
        console.info('[Autoplay] No next video in the playlist.');
        return;
    }

    console.info(`[Autoplay] Preparing next video: "${nextMove.video_filename}".`);
    loadVideo(nextMove.video_filename, nextMove.loop_start || 0);
}

