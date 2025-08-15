// movesTable.js
"use strict";
import { allMoves } from './index.js';
import { trigger } from './common.js';
import { resetCurrentVideoIndex, resetAutoplaySwitch, setLoopEnabled } from './player.js';

export let moveTableIndices = [];   // store the indices (into allMoves) of moves displayed in the table

console.info('[Global] movesTable.js loaded');

// Display notes in the notes panel with move name and formatted content
export function displayNotes(moveName, notes) {
	// Normalize
	const name = moveName || "";
	const body = notes || "";
	
	// Convert double spaces to newlines for formatting
	const formattedBody = body.replace(/  /g, "\n");

	const nameEl = document.getElementById('notes-move-name');
	const sepEl  = document.getElementById('notes-separator');
	const bodyEl = document.getElementById('notes-body');

	if (nameEl) nameEl.textContent = name;
	if (bodyEl) bodyEl.textContent = formattedBody;

	// Show separator only if both non-empty
	const showSeparator = !!(name && body);
	if (sepEl) {
		sepEl.style.display = showSeparator ? '' : 'none';
	}
}

// Setup Moves Table
export function setupMovesTable() {
    document.getElementById('moves-table-container').addEventListener('click', (event) => {
        const clickedButton = event.target;
    
        if (clickedButton.tagName === 'BUTTON' && clickedButton.classList.contains('loop-guide-button')) {
            const action = clickedButton.textContent.trim().toLowerCase();
    
            // Set or clear the loop state based on the button action
            if (action === 'loop') {
                setLoopEnabled(true); // Enable looping
                console.info('[Moves Table] Loop mode enabled.');
            } else if (action === 'guide') {
                setLoopEnabled(false); // Disable looping
                console.info('[Moves Table] Guide mode selected, looping disabled.');
            }
    
            // Determine the move index based on the clicked row
            const currentRow = clickedButton.closest('tr');
            const rowIndex = Array.from(currentRow.parentNode.children).indexOf(currentRow);
            const moveIndex = moveTableIndices[rowIndex];
    
            // Trigger moveAction with the move index
            trigger('moveAction', { moveIndex });
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
