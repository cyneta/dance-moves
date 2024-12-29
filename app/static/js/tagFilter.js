"use strict";
import { updateMoveTable } from './movesTable.js';
import { allMoves } from './index.js';

console.info('[Global] tagFilter.js loaded');

export const DEFAULT_TAG = 'no filter';

let currentTag = DEFAULT_TAG;

export function setTag(tag, playlist) {
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

    console.info(`[Tag Filter] Set tag "${currentTag}" for playlist "${playlist}". Filtered ${filteredMoves.length} moves.`);
    updateMoveTable(filteredMoves);
}

export function updateTagFilter(playlist) {
    const tags = [DEFAULT_TAG];
    allMoves.forEach(move => {
        if (move.playlist_tags && move.playlist_tags[playlist]) {
            tags.push(...move.playlist_tags[playlist]);
        }
    });

    const uniqueTags = [...new Set(tags)];
    console.info(`[Tag Filter] ${uniqueTags.length} tags updated for playlist "${playlist}".`);

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
}
