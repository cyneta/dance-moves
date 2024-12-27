"use strict";
import { trigger } from './common.js';
import { updateMoveTable } from './movesTable.js';
import { updateTagFilter } from './tagFilter.js';

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

export function selectPlaylist(playlistName, moves) {
    console.info(`[Playlist] Attempting to set active playlist to "${playlistName}".`);

    // Filter moves for the selected playlist
    const filteredMoves = moves.filter(move => {
        if (!move.playlist_tags) {
            console.warn(`[Playlist] Move "${move.move_name}" is missing playlist_tags.`);
            return false;
        }
        const tags = move.playlist_tags[playlistName];
        return Array.isArray(tags) && tags.length > 0;
    });

    console.debug(`[Playlist] Filtered moves for playlist "${playlistName}":`, filteredMoves);

    // Update the moves table and the tag filter dropdown
    updateMoveTable(filteredMoves);
    updateTagFilter(playlistName, filteredMoves);

    // Trigger a playlist change event
    trigger('playlistChange', playlistName);
}

// Setup Playlist Buttons
export function setupPlaylistButtons(playlists, moves = []) {
    console.debug('[Playlist] setupPlaylistButtons called with:', { playlists, moves });

    const playlistContainer = document.getElementById('playlist-container');
    if (!playlistContainer) {
        console.error('[Playlist] Playlist container not found.');
        return;
    }

    // Validate playlists data
    if (!Array.isArray(playlists) || playlists.length === 0) {
        console.error('[Playlist] Invalid or empty playlists data:', playlists);
        playlistContainer.innerHTML = `<p class="text-danger">No playlists available.</p>`;
        return;
    }

    playlists.forEach(playlist => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary playlist-button w-100 mb-2';
        button.dataset.playlist = playlist;
        button.textContent = playlist;

        // Attach click event listener
        button.addEventListener('click', () => {
            console.debug(`[Playlist] Button clicked for playlist: "${playlist}"`);
            selectPlaylist(playlist, moves);
            updatePlaylistButtons(playlist);
        });

        playlistContainer.appendChild(button);
    });

    console.info(`[Playlist] ${playlists.length} playlist buttons initialized.`);
}

// Initialize Playlists
export function initializePlaylists(playlists, moves) {
    // Validate playlists and moves
    if (!Array.isArray(playlists) || playlists.length === 0) {
        console.warn('[Playlist] No playlists available to initialize.');
        return;
    }

    if (!Array.isArray(moves)) {
        console.warn('[Playlist] Moves data is invalid or undefined during initialization:', moves);
        return;
    }

    // Set the first playlist as active
    selectPlaylist(playlists[0], moves); 
    updatePlaylistButtons(playlists[0]);
}
