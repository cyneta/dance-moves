// index.js
"use strict";
import { setupPlaylistButtons, initializePlaylists } from './playlist.js';
import { setupMovesTable } from './movesTable.js';
import { initializeSpeedSlider, initializePlayerUI, setupKeyboardControls } from './player.js';

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
        const { moves, playlists } = await response.json();
        console.info(`[API] Loaded ${moves.length} moves and ${playlists.length} playlists.`);
        return { moves, playlists };
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
    setupPlaylistButtons();     // Set up playlists
    initializePlaylists();      // Activates the first playlist
    setupMovesTable();          // Render the moves table based on the playlist and tag filter
    initializeSpeedSlider();
    initializePlayerUI();
    setupKeyboardControls();

    console.info('[Index] Application initialized.');
}

document.addEventListener('DOMContentLoaded', async () => {
    console.info('[Index] DOM content loaded.');
    const danceType = document.body.dataset.danceType || 'salsa';
    await initializeApp(danceType);

    // Validate tag dropdown menu
    const tagDropdown = document.getElementById('tagDropdownMenu');
    if (!tagDropdown) {
        console.error('[Tag Filter] Tag dropdown menu not found.');
    }
});
