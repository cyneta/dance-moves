// tagFilter.js
"use strict";
import { updateMoveTable } from './movesTable.js';
import { allMoves } from './index.js';

console.info('[Global] tagFilter.js loaded');

const DEFAULT_TAG = 'no filter';
let currentTag = DEFAULT_TAG;

// Getter for the current tag
export function getCurrentTag() {
    return currentTag;
}

// Updates the tag dropdown button text
function updateDropdownButtonText(tag) {
    const tagDropdownButton = document.getElementById('tagDropdown');
    if (!tagDropdownButton) {
        console.warn('[Tag Filter] Dropdown button element not found.');
        return;
    }

    tagDropdownButton.innerText = tag === DEFAULT_TAG
        ? `Tag filter: ${DEFAULT_TAG}`
        : `Tag filter: ${tag}`;
}

// Filters moves based on the selected tag and playlist
function filterMovesByTag(tag, playlist) {
    return allMoves.filter(move => {
        if (playlist && !move.playlist_tags?.[playlist]?.length) {
            return false;
        }
        if (tag !== DEFAULT_TAG && !move.playlist_tags?.[playlist]?.includes(tag)) {
            return false;
        }
        return true;
    });
}

// Sets the current tag and updates the move table
export function setTag(tag, playlist) {
    currentTag = tag || DEFAULT_TAG;
    console.info(`[Tag Filter] Setting tag to "${currentTag}".`);

    updateDropdownButtonText(currentTag);

    const filteredMoves = filterMovesByTag(currentTag, playlist);
    console.info(`[Tag Filter] Filtered ${filteredMoves.length} moves for tag "${currentTag}".`);
    updateMoveTable(filteredMoves);
}

// Resets the tag filter to its default state
export function resetTagFilter(playlist) {
    console.info('[Tag Filter] Resetting tag filter.');
    setTag(DEFAULT_TAG, playlist);
}

// Updates the dropdown menu with available tags
export function updateTagFilter(playlist) {
    const tags = [DEFAULT_TAG];
    allMoves.forEach(move => {
        if (move.playlist_tags?.[playlist]) {
            tags.push(...move.playlist_tags[playlist]);
        }
    });

    const uniqueTags = [...new Set(tags)];
    console.info(`[Tag Filter] Updated dropdown menu with ${uniqueTags.length} tags for playlist "${playlist}".`);

    const tagDropdownMenu = document.getElementById('tagDropdownMenu');
    if (!tagDropdownMenu) {
        console.error('[Tag Filter] Dropdown menu element not found.');
        return;
    }

    tagDropdownMenu.innerHTML = uniqueTags.map(tag =>
        `<li><a class="dropdown-item" href="#" data-tag="${tag}">${tag}</a></li>`
    ).join('');

    tagDropdownMenu.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', event => {
            const selectedTag = event.target.dataset.tag;
            setTag(selectedTag, playlist);
        });
    });

    // Reset the tag filter after updating the dropdown
    resetTagFilter(playlist);
    console.info('[Tag Filter] Tag filter reset after updating dropdown.');
}
