"use strict";
import { trigger } from './common.js';
import { allMoves } from './index.js';

console.debug('[Global] movesTable.js loaded');

// Setup Moves Table
export function setupMovesTable() {
    document.getElementById('moves-table-container').addEventListener('click', (event) => {
        const clickedButton = event.target;

        if (clickedButton.tagName === 'BUTTON' && clickedButton.classList.contains('loop-guide-button')) {
            const action = clickedButton.textContent.trim().toLowerCase();
            const currentRow = clickedButton.closest('tr');
            const moveIndex = parseInt(currentRow?.dataset.index, 10); // Extract data-index

            console.debug('[Move Table] Extracted data-index:', moveIndex);

            if (!Number.isInteger(moveIndex)) {
                console.error('[Move Table] Invalid or missing move index in the row.');
                return;
            }

            console.info(`[Move Table] Move action triggered: ${action} for move index ${moveIndex}.`);
            trigger('moveAction', { moveIndex, action });
        }
    });
}

// Update Moves Table
export function updateMoveTable(filteredMoves = []) {
    console.debug('[Moves Table] Rendering with filtered moves:', filteredMoves);

    const moveTable = document.querySelector('#moves-table-container tbody');
    moveTable.innerHTML = '';

    if (filteredMoves.length === 0) {
        console.warn('[Moves Table] No moves found for the current filters.');
        moveTable.innerHTML = '<tr><td colspan="3">No moves available.</td></tr>';
        return;
    }

    filteredMoves.forEach((move) => {
        const originalIndex = allMoves.indexOf(move); // Get the index in allMoves
        const row = document.createElement('tr');
        row.setAttribute('data-index', originalIndex); // Store the index in allMoves

        row.innerHTML = `
            <td>${move.move_name}</td>
            <td><button class="btn btn-outline-primary btn-sm w-100 loop-guide-button">Loop</button></td>
            <td><button class="btn btn-outline-primary btn-sm w-100 loop-guide-button">Guide</button></td>
        `;

        moveTable.appendChild(row);
    });

    console.debug('[Move Table] Rendered with filtered moves:', filteredMoves);
}
