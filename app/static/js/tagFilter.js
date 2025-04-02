// tagFilter.js
"use strict";
import { updateMoveTable } from './movesTable.js';
import { allMoves } from './index.js';

console.info('[Global] tagFilter.js loaded');

const DEFAULT_TAG = 'no filter';
let currentTag = DEFAULT_TAG;

// Parse numeric prefix from a tag like '12#cool_moves' -> { order: 12, tag: 'cool_moves' }
function parsePrefixedTag(tag) {
    const match = tag.match(/^(\d+)#(.*)$/);
    if (match) {
        return {
            order: parseInt(match[1], 10),
            tag: `#${match[2]}`  // <- retain the leading hash
        };
    }
    return { order: null, tag };
}

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

// Filters and sorts moves by normalized tag group
function filterMovesByTag(selectedTag, playlist) {
    if (selectedTag === DEFAULT_TAG) {
        return allMoves.filter(move => move.playlist_tags?.[playlist]?.length);
    }

    const results = [];

    for (const move of allMoves) {
        const rawTags = move.playlist_tags?.[playlist] || [];

        for (const rawTag of rawTags) {
            const { order, tag } = parsePrefixedTag(rawTag);
            if (tag === selectedTag) {
                results.push({
                    move,
                    sortOrder: order !== null ? order : Infinity
                });
                break; // Only one match per move is expected
            }
        }
    }

    results.sort((a, b) => a.sortOrder - b.sortOrder);
    return results.map(entry => entry.move);
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

// Updates the dropdown menu with normalized tags only
export function updateTagFilter(playlist) {
    const normalizedTags = new Set([DEFAULT_TAG]);

    for (const move of allMoves) {
        const rawTags = move.playlist_tags?.[playlist] || [];
    
        for (const rawTag of rawTags) {
            const hasPrefix = /^\d+#/.test(rawTag);
            const normalized = hasPrefix ? parsePrefixedTag(rawTag).tag : rawTag;
            normalizedTags.add(normalized);
        }
    }

    const sortedTags = [...normalizedTags];
    console.info(`[Tag Filter] Updated dropdown menu with ${sortedTags.length} tags for playlist "${playlist}".`);

    const tagDropdownMenu = document.getElementById('tagDropdownMenu');
    if (!tagDropdownMenu) {
        console.error('[Tag Filter] Dropdown menu element not found.');
        return;
    }

    tagDropdownMenu.innerHTML = sortedTags.map(tag =>
        `<li><a class="dropdown-item" href="#" data-tag="${tag}">${tag}</a></li>`
    ).join('');

    tagDropdownMenu.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', event => {
            const selectedTag = event.target.dataset.tag;
            setTag(selectedTag, playlist);
        });
    });

    // Reset the tag filter after updating the dropdown
    const tagArray = [...normalizedTags];
    const initialTag = tagArray.find(tag => tag !== DEFAULT_TAG) || DEFAULT_TAG;
    setTag(initialTag, playlist);

    console.info('[Tag Filter] Tag filter initialized to first available tag.');
}
