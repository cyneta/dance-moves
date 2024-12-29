// movesTable.js
"use strict";
import { allMoves } from './index.js';
import { trigger } from './common.js';
import { resetCurrentVideoIndex, resetAutoplaySwitch } from './player.js';

export let moveTableIndices = [];   // store the indices (into allMoves) of moves displayed in the table

console.info('[Global] movesTable.js loaded');

// Setup Moves Table
export function setupMovesTable() {
    document.getElementById('moves-table-container').addEventListener('click', (event) => {
        const clickedButton = event.target;

        if (clickedButton.tagName === 'BUTTON' && clickedButton.classList.contains('loop-guide-button')) {
            const action = clickedButton.textContent.trim().toLowerCase();
            const currentRow = clickedButton.closest('tr');
            const rowIndex = Array.from(currentRow.parentNode.children).indexOf(currentRow); // Find the row index

            if (rowIndex < 0 || rowIndex >= moveTableIndices.length) {
                console.error('[Moves Table] Invalid row index in the table.');
                return;
            }

            const moveIndex = moveTableIndices[rowIndex]; // Map the row index to the global indices array

            console.info(`[Moves Table] Action "${action}" triggered for move index ${moveIndex}.`);
            trigger('moveAction', { moveIndex, action });
        }
    });
}

// Update Moves Table
export function updateMoveTable(filteredMoves = []) {
    console.debug(`[Moves Table] Rendering ${filteredMoves.length} moves.`);
    const moveTable = document.querySelector('#moves-table-container tbody');
    moveTable.innerHTML = '';

    // Update the global moveTableIndices
    moveTableIndices = filteredMoves.map(move => allMoves.indexOf(move)).filter(index => index !== -1);
    console.debug(`[Moves Table] Updated moveTableIndices: ${moveTableIndices}`);

    if (filteredMoves.length === 0) {
        console.warn('[Moves Table] No moves found for the current filters.');
        moveTable.innerHTML = '<tr><td colspan="3">No moves available.</td></tr>';
        resetCurrentVideoIndex(); // Reset on empty table
        return;
    }

    resetCurrentVideoIndex(); // Reset to prevent stale index
    console.info('[Moves Table] Reset currentVideoIndex due to table update.');

    filteredMoves.forEach((move) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${move.move_name}</td>
            <td><button class="btn btn-outline-primary btn-sm w-100 loop-guide-button">Loop</button></td>
            <td><button class="btn btn-outline-primary btn-sm w-100 loop-guide-button">Guide</button></td>
        `;
        moveTable.appendChild(row);
    });

    resetAutoplaySwitch(); // Ensure autoplay switch is reset on table changes
    console.debug(`[Moves Table] Rendered ${filteredMoves.length} moves.`);
}
