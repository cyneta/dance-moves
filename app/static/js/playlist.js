// playlist.js
"use strict";
import { allPlaylists, allMoves } from './index.js';
import { updateMoveTable } from './movesTable.js';
import { updateTagFilter } from './tagFilter.js';
import { resetAutoplaySwitch } from './player.js';

console.debug('[Global] playlist.js loaded');

// Setup Playlist Buttons
export function setupPlaylistButtons() {
    const playlistContainer = document.getElementById('playlist-container');
    if (!playlistContainer) {
        console.error('[Playlist] Playlist container not found.');
        return;
    }

    if (!Array.isArray(allPlaylists) || allPlaylists.length === 0) {
        playlistContainer.innerHTML = `<p class="text-danger">No playlists available.</p>`;
        return;
    }

    // Clear existing buttons before adding new ones
    playlistContainer.innerHTML = '';

    allPlaylists.forEach(playlist => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary playlist-button w-100 mb-2';
        button.dataset.playlist = playlist;
        button.textContent = playlist;

        // Add event listener for playlist selection
        button.addEventListener('click', () => {
            selectPlaylist(playlist);
        });

        playlistContainer.appendChild(button);
    });

    console.info(`[Playlist] Initialized with ${allPlaylists.length} playlists.`);
}

// Update Active Button Styles
export function updatePlaylistButtons(activePlaylist) {
    const playlistButtons = document.querySelectorAll('.playlist-button');
    playlistButtons.forEach(button => {
        const isActive = button.dataset.playlist === activePlaylist;
        button.classList.toggle('btn-primary', isActive);
        button.classList.toggle('btn-outline-primary', !isActive);
    });
    console.debug(`[Playlist] Active playlist set to: "${activePlaylist}".`);
}

// Select Playlist and Emit Event
export function selectPlaylist(playlistName) {
    console.info(`[Playlist] Attempting to set active playlist to "${playlistName}".`);

    const filteredMoves = allMoves.filter(move => move.playlist_tags?.[playlistName]?.length > 0);

    console.info(`[Playlist] Playlist "${playlistName}" active with ${filteredMoves.length} moves.`);

    // Update the moves table and filters
    updateMoveTable(filteredMoves);
    updateTagFilter(playlistName);
    resetAutoplaySwitch();

    // Update button styles
    updatePlaylistButtons(playlistName);

    // Emit a custom event for URL updates
    const playlistChangedEvent = new CustomEvent('playlistChanged', { detail: { playlistName } });
    document.dispatchEvent(playlistChangedEvent);
}

export function initializePlaylists() {
    if (!Array.isArray(allPlaylists) || allPlaylists.length === 0) {
        console.warn('[Playlist] No playlists available to initialize.');
        return;
    }

    const numberedPlaylist = allPlaylists.find(pl => /^\d/.test(pl));
    const initialPlaylist = numberedPlaylist || allPlaylists[0];

    console.debug(`[Playlist Init] Selected playlist: "${initialPlaylist}"`);

    selectPlaylist(initialPlaylist);
    updatePlaylistButtons(initialPlaylist);
}
