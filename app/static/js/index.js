"use strict";
import { setupPlaylistButtons, initializePlaylists } from './playlist.js';
import { setupMovesTable, updateMoveTable } from './movesTable.js';
import { initializePlayerUI } from './player.js';

console.debug('[Global] index.js loaded.');

async function fetchDanceData(danceType) {
    try {
        const response = await fetch(`/api/moves/${danceType}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const { moves, playlists } = await response.json();
        console.debug('[API] Moves and playlists loaded:', { moves, playlists });
        return { moves, playlists };
    } catch (error) {
        console.error('[API] Error loading data:', error);
        return { playlists: [], moves: [] };
    }
}

async function initializeApp(danceType) {
    const { playlists, moves } = await fetchDanceData(danceType);

    console.debug('[Index] Initializing app with:', { moves, playlists });

    // Initialize components with the fetched data
    setupPlaylistButtons(playlists, moves);
    initializePlaylists(playlists, moves);
    setupMovesTable(moves);
    initializePlayerUI();

    // Populate the moves table with initial data
    updateMoveTable(moves);

    console.info('[Index] All modules initialized.');
}

document.addEventListener('DOMContentLoaded', async () => {
    console.debug('[Index] DOM Content Loaded.');
    const danceType = document.body.dataset.danceType || 'salsa';
    await initializeApp(danceType);

    document.addEventListener('DOMContentLoaded', () => {
        const tagDropdown = document.getElementById('tagDropdownMenu');
        if (!tagDropdown) {
            console.error('[Tag Filter] Tag dropdown menu not found.');
        } else {
            console.debug('[Tag Filter] Tag dropdown menu exists.');
        }
    });    
});
