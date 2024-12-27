// tagFilter.js
"use strict";
import { trigger } from './common.js';
import { updateMoveTable } from './movesTable.js';

console.debug('[Global] tagFilter.js loaded');

export const DEFAULT_TAG = 'no filter';

export const tagFilter = {
    currentTag: DEFAULT_TAG,

    setTag(tag, moves, playlist) {
        console.debug(`[Tag Filter] setTag called with tag: ${tag}`);
        this.currentTag = tag || DEFAULT_TAG;

        const tagDropdownButton = document.getElementById('tagDropdown');
        tagDropdownButton.innerText = tag === DEFAULT_TAG ? `Tag filter: ${DEFAULT_TAG}` : `Tag filter: ${tag}`;

        this.applyFilter(moves, playlist);
    },

    // Filter moves based on the current tag
    applyFilter(moves, playlist) {
        console.debug(`[Tag Filter] applyFilter called for tag: ${this.currentTag}`);

        const filteredMoves = this.currentTag === DEFAULT_TAG
            ? moves.filter(move => move.playlist_tags[playlist]?.length > 0)
            : moves.filter(move => move.playlist_tags[playlist]?.includes(this.currentTag));

        console.debug(`[Tag Filter] Filtered ${filteredMoves.length} moves based on tag "${this.currentTag}".`);
        updateMoveTable(filteredMoves);
        trigger('tagFilterChange', filteredMoves);
    },

    reset(moves, playlist) {
        console.debug('[Tag Filter] reset called.');
        this.setTag(DEFAULT_TAG, moves, playlist);
    },  
};

export function updateTagFilter(playlist, moves) {
    console.debug('[Tag Filter] updateTagFilter called.');
    console.debug('[Tag Filter] Playlist:', playlist);
    console.debug('[Tag Filter] Moves:', moves);

    // Gather unique tags for the playlist
    const tags = [DEFAULT_TAG]; // Add the default filter option
    moves.forEach(move => {
        if (move.playlist_tags && move.playlist_tags[playlist]) {
            tags.push(...move.playlist_tags[playlist]);
        }
    });

    // Deduplicate tags
    const uniqueTags = [...new Set(tags)];
    console.debug('[Tag Filter] Extracted unique tags:', uniqueTags);

    // Populate the dropdown
    const tagDropdownMenu = document.getElementById('tagDropdownMenu');
    if (!tagDropdownMenu) {
        console.error('[Tag Filter] Dropdown menu element not found.');
        return;
    }

    tagDropdownMenu.innerHTML = uniqueTags.map(tag =>
        `<li><a class="dropdown-item" href="#" data-tag="${tag}">${tag}</a></li>`
    ).join('');
    console.debug('[Tag Filter] Dropdown HTML:', tagDropdownMenu.innerHTML);

    // Add event listeners to the dropdown items
    tagDropdownMenu.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', event => {
            const selectedTag = event.target.dataset.tag;
            console.info(`[Tag Filter] Selected tag: ${selectedTag}`);
            tagFilter.setTag(selectedTag, moves, playlist);
        });
    });

    console.info('[Tag Filter] Dropdown updated successfully.');
}

