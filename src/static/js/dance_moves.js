console.log('[Debug] Script version: 1.0.1');

console.log('Dance type:', '{{ dance_type }}');

const speeds = [0.25, 0.32, 0.4, 0.5, 0.63, 0.8, 1, 1.26, 1.58, 2];
let player;

function findClosestSpeed(speed) {
    return speeds.reduce((prev, curr) => Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev);
}

function setPlayerSpeed(speed) {
    const closestSpeed = findClosestSpeed(speed);
    player.speed = closestSpeed;
    const sliderIndex = speeds.indexOf(closestSpeed);
    document.getElementById('speed-slider').value = sliderIndex;
    document.getElementById('speed-display').innerText = `${closestSpeed}x`;

    console.log(`[Speed Set] Closest value: ${closestSpeed}`);
}

let currentlyPlayingRow = null;

function loadVideo(videoFilename, start, end, speed, notes, event) {
    const videoSrc = `/static/videos/${videoFilename}`;
    console.log(`[Load Video] Filename: ${videoFilename}, Start: ${start}, End: ${end}, Speed: ${speed}`);

    // Remove bold from all rows
    const rows = document.querySelectorAll('#moves-table-container tbody tr');
    rows.forEach(row => row.classList.remove('fw-bold')); // Clear bolding

    // Bold only the row associated with the clicked button
    const clickedButton = event.target; // Button triggering the event
    const currentRow = clickedButton.closest('tr');
    if (currentRow) {
        currentRow.classList.add('fw-bold');
        console.log(`[Load Video] Highlighting row for video: ${currentRow.dataset.video}`);
    } else {
        console.warn(`[Load Video] No matching row found for video: ${videoFilename}`);
    }

    // Load the video if the source has changed
    if (player.source?.sources?.[0]?.src === videoSrc) {
        console.log(`[Load Video] Source unchanged, skipping reload.`);
        seekToStart(start);
        applyLooping(start, end, notes, speed);
        displayNotes(notes);
        return;
    }

    player.source = {
        type: 'video',
        sources: [{ src: videoSrc, type: 'video/mp4' }]
    };

    player.once('loadedmetadata', () => {
        console.log(`[Load Video] Metadata loaded for: ${videoSrc}`);
        seekToStart(start);
        applyLooping(start, end, notes, speed);
        displayNotes(notes);
    });
}

function playGuide(videoFilename, guideStart, notes, event) {
    const videoSrc = `/static/videos/${videoFilename}`;
    console.log(`[Guide] Loading guide: ${videoSrc}, Start: ${guideStart}`);

    // Remove bold from all rows
    const rows = document.querySelectorAll('#moves-table-container tbody tr');
    rows.forEach(row => row.classList.remove('fw-bold')); // Clear bolding

    // Bold only the row associated with the clicked button
    const clickedButton = event.target; // Button triggering the event
    const currentRow = clickedButton.closest('tr');
    if (currentRow) {
        currentRow.classList.add('fw-bold');
        console.log(`[Guide] Highlighting row for video: ${currentRow.dataset.video}`);
    } else {
        console.warn(`[Guide] No matching row found for video: ${videoFilename}`);
    }

    // If the video source hasn't changed, just seek and play
    if (player.source?.sources?.[0]?.src === videoSrc) {
        console.log(`[Guide] Source unchanged, skipping reload.`);
        seekToStart(guideStart); // Seek to the guide start time
        displayNotes(notes); // Update notes
        setPlayerSpeed(1); // Reset speed for guide playback
        return;
    }

    // Load the new video source
    player.source = {
        type: 'video',
        sources: [{ src: videoSrc, type: 'video/mp4' }]
    };

    player.once('loadedmetadata', () => {
        console.log(`[Guide] Metadata loaded. Seeking to guide start.`);
        seekToStart(guideStart);
        displayNotes(notes);
        setPlayerSpeed(1);
    });

    player.on('error', (error) => {
        console.error(`[Guide Error]`, error);
    });
}

function startGuidePlayback(guideStart, notes) {
    // Clear previous timeupdate listener to ensure no looping
    player.off('timeupdate');

    // Seek to the guide start time
    seekToStart(guideStart);

    // Display notes
    displayNotes(notes);

    console.log(`[Guide] Playing from start time: ${guideStart}`);
}

function displayNotes(notes) {
    const formattedNotes = notes.replace(/  /g, "\n"); // Replace double spaces with newlines
    document.getElementById('notes-content').innerText = formattedNotes; // Preserve newlines
    console.log(`[Notes] Updated notes: ${formattedNotes}`);
}

function seekToStart(start) {
    console.log(`[Seek] Attempting to set start time to: ${start}`);
    let retryCount = 0;
    const maxRetries = 5; // Limit retries
    const retryDelay = 500; // Delay between retries in ms
    let seekSuccessful = false; // Flag to prevent redundant retries

    function attemptSeek() {
        if (seekSuccessful) return; // Exit if already successful

        console.log(`[Seek Attempt] Retry #${retryCount + 1}`);

        // Set the player to the start time
        player.currentTime = start;

        // Delay before checking if the seek succeeded
        setTimeout(() => {
            if (Math.abs(player.currentTime - start) <= 0.5) {
                console.log(`[Seek Success] Successfully sought to: ${player.currentTime}`);
                player.play().catch(error => console.error(`[Play Error]`, error));
                seekSuccessful = true; // Mark as successful
            } else if (retryCount < maxRetries) {
                retryCount++;
                console.warn(`[Seek Retry] Current time: ${player.currentTime}, Expected: ${start}. Retrying...`);
                attemptSeek(); // Retry seek
            } else {
                console.error(`[Seek Failed] Exceeded maximum retries.`);
            }
        }, retryDelay); // Delay before checking success
    }

    attemptSeek(); // Initial attempt
}

function applyLooping(start, end, notes, speed) {
    console.log(`[Looping] Applying looping: Start: ${start}, End: ${end}`);

    // Clear previous listeners
    player.off('timeupdate');
    player.on('timeupdate', () => {
        if (player.currentTime >= end) {
            console.log(`[Looping] Looping back to start: ${start}`);
            seekToStart(start);
        }
    });

    // Display notes and update speed
    document.getElementById('notes-content').innerText = notes;
    setPlayerSpeed(speed);
}

function updateSpeed(value) {
    const speed = speeds[parseInt(value, 10)];
    setPlayerSpeed(speed);
}

document.addEventListener('DOMContentLoaded', () => {
    // Plyr initialization
    const videoElement = document.getElementById('player');

    if (!videoElement) {
        console.error('[Error] Video element not found!');
        return;
    }

    if (player) {
        player.destroy();
    }

    player = new Plyr(videoElement, {
        controls: [
            'play',           // Play/Pause button
            'progress',       // Seek bar
            'current-time',   // Time elapsed
            'duration',       // Total duration
            'mute',           // Mute/Unmute button
            'volume',         // Volume control
            'fullscreen'      // Fullscreen toggle
        ]
    });

    console.log('[Debug] Plyr instance initialized:', player);

    // Ensure the player always has focus
    document.getElementById('player').focus();

    // Add keyboard controls for the player
    document.addEventListener('keydown', (event) => {
        const key = event.key;
        const shiftPressed = event.shiftKey; // Check if Shift is pressed
        const seekAmount = shiftPressed ? 5 : 1; // Shift for 5 seconds, otherwise 1 second

        // Prevent default actions for handled keys
        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
            event.preventDefault();
        }

        switch (key) {
            case ' ': // Spacebar to play/pause
                player.togglePlay();
                break;
            case 'ArrowLeft': // Rewind by 1 or 5 seconds
                player.currentTime = Math.max(0, player.currentTime - seekAmount);
                console.log(`[Seek] Rewound by ${seekAmount} seconds. Current time: ${player.currentTime}`);
                break;
            case 'ArrowRight': // Fast-forward by 1 or 5 seconds
                player.currentTime = Math.min(player.duration, player.currentTime + seekAmount);
                console.log(`[Seek] Fast-forwarded by ${seekAmount} seconds. Current time: ${player.currentTime}`);
                break;
            case 'ArrowUp': // Increase volume
                player.volume = Math.min(1, player.volume + 0.1);
                console.log(`[Volume] Increased to: ${player.volume}`);
                break;
            case 'ArrowDown': // Decrease volume
                player.volume = Math.max(0, player.volume - 0.1);
                console.log(`[Volume] Decreased to: ${player.volume}`);
                break;
        }
    });

    // Attach event listener to speed slider
    document.getElementById('speed-slider').addEventListener('input', (event) => {
        updateSpeed(event.target.value);
    });

    // Handle orientation changes for video player  
    const videoWrapper = document.getElementById('player-wrapper');
    const leftPanel = document.getElementById('left-panel');
    const movesTable = document.getElementById('moves-table-container');
    const notesSection = document.querySelector('.card');

    function handleOrientationChange() {
        if (window.innerHeight > window.innerWidth) {
            // Portrait Mode: Move video player between moves table and notes panel
            if (!movesTable.nextElementSibling?.contains(videoWrapper)) {
                leftPanel.insertBefore(videoWrapper, notesSection);
                console.log('Video player moved to left panel (portrait mode).');
            }
        } else {
            // Landscape Mode: Move video player back to right panel
            const rightPanel = document.getElementById('right-panel');
            if (rightPanel && !rightPanel.contains(videoWrapper)) {
                rightPanel.appendChild(videoWrapper);
                console.log('Video player moved back to right panel (landscape mode).');
            }
        }
    }

    // Run on load and when orientation changes
    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);

    player.off('play');
    player.off('pause');
    player.off('seeked');
    player.off('ended');
    player.off('error');

    // Add logging for Plyr events
    player.on('play', () => console.log(`[Event: Play] Playback started.`));
    player.on('pause', () => console.log(`[Event: Pause] Playback paused.`));
    player.on('seeked', () => console.log(`[Event: Seeked] Seek operation completed. Current time: ${player.currentTime}`));
    player.on('ended', () => console.log(`[Event: Ended] Video playback ended.`));
    player.on('error', (error) => console.error(`[Event: Error]`, error));
});
