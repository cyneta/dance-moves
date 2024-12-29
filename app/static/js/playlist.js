// playlist.js
"use strict";
import { updateMoveTable } from './movesTable.js';
import { updateTagFilter } from './tagFilter.js';
import { allPlaylists } from './index.js';
import { allMoves } from './index.js';

console.debug('[Global] playlist.js loaded');

// Update Active Button Styles
export function updatePlaylistButtons(activePlaylist) {
    const playlistButtons = document.querySelectorAll('.playlist-button');
    playlistButtons.forEach(button => {
        const isActive = button.dataset.playlist === activePlaylist;
        button.classList.toggle('btn-primary', isActive);
        button.classList.toggle('btn-outline-primary', !isActive);
    });
    console.debug('[Playlist] Buttons updated.');
}

export function selectPlaylist(playlistName) {
    console.info(`[Playlist] Attempting to set active playlist to "${playlistName}".`);

    const filteredMoves = allMoves.filter(move => move.playlist_tags?.[playlistName]?.length > 0);

    console.info(`[Playlist] Playlist "${playlistName}" active with ${filteredMoves.length} moves.`);

    updateMoveTable(filteredMoves);
    updateTagFilter(playlistName);
}

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

    allPlaylists.forEach(playlist => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary playlist-button w-100 mb-2';
        button.dataset.playlist = playlist;
        button.textContent = playlist;

        button.addEventListener('click', () => {
            selectPlaylist(playlist);
            updatePlaylistButtons(playlist);
        });

        playlistContainer.appendChild(button);
    });

    console.info(`[Playlist] Initialized with ${allPlaylists.length} playlists.`);
}

export function initializePlaylists() {
    if (!Array.isArray(allPlaylists) || allPlaylists.length === 0) {
        console.warn('[Playlist] No playlists available to initialize.');
        return;
    }

    // Set the first playlist as active
    selectPlaylist(allPlaylists[0]);
    updatePlaylistButtons(allPlaylists[0]);
}
