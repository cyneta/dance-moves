// index.js
"use strict";
import { setupPlaylistButtons, initializePlaylists, selectPlaylist } from './playlist.js';
import { setupMovesTable } from './movesTable.js';
import { initializePlayerUI,
     updateURLWithState,
     initializeSpeedSlider,
     setupAutoplayToggle,
     setAutoplayEnabled,
     setupKeyboardControls,
     initializeOrientationHandling,
     setPlayerSpeed,
     setLoopEnabled,
     playVideoByDesignator } from './player.js';

// Export global variables
export let allMoves = [];
export let allPlaylists = [];

console.info('[Global] index.js loaded.');

async function fetchDanceData(danceType) {
    try {
        const response = await fetch(`/api/moves/${danceType}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const { moves,
             playlists } = await response.json();
        console.info(`[API] Loaded ${moves.length} moves and ${playlists.length} playlists.`);
        return { moves,
             playlists };
    } catch (error) {
        console.error('[API] Error loading data:', error);
        return { playlists: [], moves: [] };
    }
}

async function initializeApp(danceType) {
    // Fetch data and set globals
    ({ playlists: allPlaylists, moves: allMoves } = await fetchDanceData(danceType));

    if (allPlaylists.length === 0) {
        console.warn('[Index] No playlists found. Application may be incomplete.');
    }
    if (allMoves.length === 0) {
        console.warn('[Index] No moves found. Application may be incomplete.');
    }

    // Initialize components
    setupPlaylistButtons();             // Set up playlists
    initializePlaylists();              // Activates the first playlist
    setupMovesTable();                  // Render the moves table based on the playlist and tag filter
    initializePlayerUI();               // Set up the player UI
    initializeSpeedSlider();            // Set up the speed slider, which controls the player speed
    setupAutoplayToggle();              // Set up the autoplay toggle switch
    setupKeyboardControls();            // Set up keyboard controls for the player
    initializeOrientationHandling();    // Set up orientation handling for mobile devices

    console.info('[Index] Application initialized.');
}

document.addEventListener('DOMContentLoaded', async () => {
    console.info('[Index] DOM content loaded.');

    const queryParams = parseQueryParams();
    const danceType = queryParams.style || 'salsa'; // Default to salsa if style is missing
    await initializeApp(danceType);

    // Apply state from the URL
    updateStateFromURL();
});

function parseQueryParams() {
    const params = new URLSearchParams(window.location.search);

    return {
        style: params.get('style'),
        playlist: params.get('playlist'),
        video: params.get('video'),
        loop: params.get('loop') === 'true',
        autoplay: params.get('autoplay') === 'true', // Parse autoplay as a boolean
        speed: parseFloat(params.get('speed')) || 1.0,
        volume: parseFloat(params.get('volume')) || 1.0,
    };
}

function updateStateFromURL() {
    const queryParams = parseQueryParams();

    // Apply dance style and initialize app only if style is specified
    if (queryParams.style) {
        console.info(`[URL] Initializing app with style: ${queryParams.style}`);
        initializeApp(queryParams.style);
    }

    // Apply playlist if specified
    if (queryParams.playlist) {
        console.info(`[URL] Selecting playlist: ${queryParams.playlist}`);
        selectPlaylist(queryParams.playlist);
    }

    // Apply loop state
    if (queryParams.loop !== undefined) {
        const loopEnabled = queryParams.loop === 'true'; // Convert to boolean
        setLoopEnabled(loopEnabled);
        console.info(`[Player] Loop state set to: ${loopEnabled}`);
    }

    // Apply playback speed
    if (queryParams.speed) {
        const speed = parseFloat(queryParams.speed);
        setPlayerSpeed(speed);
        console.info(`[Player] Speed set to: ${speed}`);
    }

    // Apply volume
    if (queryParams.volume !== undefined) {
        const volume = parseFloat(queryParams.volume);
        if (!isNaN(volume)) {
            player.volume = volume;
            console.info(`[Player] Volume set to: ${volume}`);
        } else {
            console.error(`[URL] Invalid volume: ${queryParams.volume}`);
        }
    }

    // Apply autoplay state
    if (queryParams.autoplay !== undefined) {
        const autoplayEnabled = queryParams.autoplay === 'true'; // Convert to boolean
        setAutoplayEnabled(autoplayEnabled);
        console.info(`[Player] Autoplay state set to: ${autoplayEnabled}`);
    }

    // Apply video state
    if (queryParams.video) {
        console.info(`[URL] Loading video: ${queryParams.video}`);
        playVideoByDesignator(queryParams.video);
    }
}
