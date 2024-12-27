"use strict";
import { trigger } from './common.js';

console.debug('[Global] movesTable.js loaded');

// Setup Moves Table
export function setupMovesTable(moves) {
    console.debug('[Move Table] setupMovesTable called.');

    document.getElementById('moves-table-container').addEventListener('click', (event) => {
        const clickedButton = event.target;

        if (clickedButton.tagName === 'BUTTON' && clickedButton.classList.contains('loop-guide-button')) {
            const action = clickedButton.textContent.trim().toLowerCase();
            const currentRow = clickedButton.closest('tr');
            const moveIndex = currentRow?.dataset.index;

            if (!moveIndex) {
                console.error('[Move Table] Invalid or missing move index in the row.');
                return;
            }

            console.info(`[Move Table] Move action triggered: ${action} for move index ${moveIndex}.`);
            trigger('moveAction', { moveIndex, action, moves });
        }
    });
}

// Update Moves Table
export function updateMoveTable(moves) {
    const moveTable = document.querySelector('#moves-table-container tbody');
    moveTable.innerHTML = '';

    if (moves.length === 0) {
        console.warn('[Move Table] No moves found for the active playlist or tag.');
        moveTable.innerHTML = '<tr><td colspan="3">No moves available.</td></tr>';
        return;
    }

    moves.forEach((move, index) => {
        const originalIndex = moves.indexOf(move);
        const row = document.createElement('tr');
        row.setAttribute('data-index', originalIndex);

        row.innerHTML = `
            <td>${move.move_name}</td>
            <td><button class="btn btn-outline-primary btn-sm w-100 loop-guide-button">Loop</button></td>
            <td><button class="btn btn-outline-primary btn-sm w-100 loop-guide-button">Guide</button></td>
        `;

        moveTable.appendChild(row);
    });

    console.debug('[Move Table] Updated with filtered moves.');
}
