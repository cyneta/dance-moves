"use strict";
import { updateMoveTable } from './movesTable.js';
import { allMoves } from './index.js';

console.debug('[Global] tagFilter.js loaded');

export const DEFAULT_TAG = 'no filter';

let currentTag = DEFAULT_TAG;

export function setTag(tag, playlist) {
    console.debug(`[Tag Filter] setTag called with tag: ${tag}`);
    currentTag = tag || DEFAULT_TAG;

    const filteredMoves = allMoves.filter(move => {
        if (playlist && !move.playlist_tags?.[playlist]?.length) {
            return false;
        }
        if (currentTag !== DEFAULT_TAG && !move.playlist_tags?.[playlist]?.includes(currentTag)) {
            return false;
        }
        return true;
    });

    console.debug('[Tag Filter] Filtered moves for tag and playlist:', filteredMoves);
    updateMoveTable(filteredMoves);
}

export function updateTagFilter(playlist) {
    console.debug('[Tag Filter] updateTagFilter called for playlist:', playlist);

    // Gather unique tags for the playlist
    const tags = [DEFAULT_TAG]; // Add the default filter option
    allMoves.forEach(move => {
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
            setTag(selectedTag, playlist);
        });
    });

    console.info('[Tag Filter] Dropdown updated successfully.');
}
