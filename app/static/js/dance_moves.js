console.debug('[Debug] Script version: 1.0.1');

console.debug('Dance type:', '{{ dance_type }}');

const speeds = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.57, 0.63, 0.7, 0.8,
    0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.6, 1.8, 2.0
];

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

    console.debug(`[Speed Set] Closest value: ${closestSpeed}`);
}

function displayNotes(notes) {
    const formattedNotes = notes.replace(/  /g, "\n"); // Replace double spaces with newlines
    document.getElementById('notes-content').innerText = formattedNotes; // Preserve newlines
    console.debug(`[Notes] Updated notes: ${formattedNotes}`);
}                

function updateSpeed(value) {
    const index = parseInt(value, 10);
    const speed = speeds[index];
    setPlayerSpeed(speed);
    document.getElementById('speed-display').innerText = `${speed}x`;
    console.info(`[Speed Control] Speed set to: ${speed} (Index: ${index})`);
}            

function playVideo({ videoFilename, start, end = null, speed = 1, notes = '', isLooping = false }) {
    const videoSrc = `/static/videos/${videoFilename}`;
    console.debug(`[Play Video] Video source: ${videoSrc}`);
    console.info(`[Play Video] Playing video "${videoFilename}" | Start=${start}, End=${end}, Speed=${speed}, Loop=${isLooping}`);
    
    try {
        // Check if the video source needs to be updated
        if (player.source?.sources?.[0]?.src === videoSrc) {
            console.debug('[Play Video] Source unchanged, skipping reload');
            executePlayback(start, end, speed, notes, isLooping);
            return;
        }            

        // Update the video source
        console.debug('[Play Video] Updating player source');
        player.source = {
            type: 'video',
            sources: [{ src: videoSrc, type: 'video/mp4' }]
        };            

        // Wait for metadata to load
        player.once('loadedmetadata', () => {
            console.debug(`[Play Video] Metadata loaded. Preparing playback.`);
            executePlayback(start, end, speed, notes, isLooping);
        });            
        
    } catch (error) {
        console.error('[Play Video] Unexpected error:', error);
    }            
}            

function executePlayback(start, end, speed, notes, isLooping) {
    console.debug('[Execute Playback] Starting playback logic');
    
    // Update notes and speed
    setPlayerSpeed(speed);
    displayNotes(notes);

    // Apply looping only after playback starts
    if (isLooping && end !== null) {
        applyLooping(start, end); // Setup looping
    }            
    
    // Seek to the start time (prereq: playback has started)
    seekToStart(start).then(() => {
        console.debug('[Execute Playback] Seek completed');
    }).catch(error => {
        console.error('[Execute Playback] Seek failed:', error);
    });            
}            

function seekToStart(start) {
    console.debug(`[Seek] Attempting to set start time to: ${start}`);
    return new Promise((resolve, reject) => {
        player.play().then(() => {
            console.debug('[Seek] Playback started to enable seeking.');
            player.currentTime = start;

            player.once('seeked', () => {
                if (Math.abs(player.currentTime - start) <= 0.5) {
                    console.info(`[Seek Success] Sought to: Target time=${start}, Current time: ${player.currentTime}`);
                    resolve();
                } else {
                    console.error(`[Seek Failed] Time mismatch: Target time=${start}, Current time=${player.currentTime}`);
                    reject(new Error('Seek operation failed.'));
                }
            });
        }).catch(error => {
            console.error('[Seek] Failed to start playback:', error);
            reject(error);
        });
    });
}

function applyLooping(start, end) {
    console.debug(`[Looping] Applying loop: Start=${start}, End=${end}`);

    const videoElement = player.media; // Access the native <video> element

    // Clear all existing listeners
    videoElement.removeEventListener('timeupdate', loopHandler);

    // Define a reusable handler
    function loopHandler(event) {
        if (event.target.currentTime >= end) {
            console.debug(`[Looping] Restarting loop at: ${start}`);
            event.target.currentTime = start;
        }
    }

    // Add the new listener
    videoElement.addEventListener('timeupdate', loopHandler);
    console.debug('[Looping] New timeupdate listener added.');
}

function handleMoveAction(moveIndex, action) {
    console.debug(`[Action] Received: Action=${action}, Move Index=${moveIndex}`);
    
    const move = movesData[moveIndex];
    if (!move) {
        console.error(`[Error] No move found for index: ${moveIndex}`);
        return;
    }
    
    console.debug('[Debug] Retrieved Move Data:', move);
    
    // Map actions to playback settings
    if (action === 'loop') {
        playVideo({
            videoFilename: move.video_filename,
            start: move.loop_start,
            end: move.loop_end,
            speed: move.loop_speed,
            notes: move.notes,
            isLooping: true
        });
    } else if (action === 'guide') {
        playVideo({
            videoFilename: move.video_filename,
            start: move.guide_start,
            speed: 1,
            notes: move.notes,
            isLooping: false
        });
    }
}

document.getElementById('moves-table-container').addEventListener('click', (event) => {
    const clickedButton = event.target;

    if (clickedButton.tagName === 'BUTTON') {
        const action = clickedButton.textContent.trim().toLowerCase(); // Determine action (loop/guide)
        const currentRow = clickedButton.closest('tr');
        const moveIndex = currentRow?.dataset.index;

        // Highlight the current row
        document.querySelectorAll('#moves-table-container tbody tr').forEach(row => row.classList.remove('fw-bold'));
        currentRow.classList.add('fw-bold');
        console.debug(`[Action] Highlighted row with index: ${moveIndex}`);

        // Handle the action
        if (moveIndex) {
            console.info(`[Event Listener] Button clicked. Action: ${action}, Move Index: ${moveIndex}`);
            handleMoveAction(moveIndex, action);
        } else {
            console.error('[Event Listener] Move index not found in the current row.');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Plyr initialization
    const videoElement = document.getElementById('player');

    console.debug('Moves Data Loaded:', movesData);

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

    console.debug('[Debug] Plyr instance initialized:', player);

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
                console.debug(`[Seek] Rewound by ${seekAmount} seconds. Current time: ${player.currentTime}`);
                break;
            case 'ArrowRight': // Fast-forward by 1 or 5 seconds
                player.currentTime = Math.min(player.duration, player.currentTime + seekAmount);
                console.debug(`[Seek] Fast-forwarded by ${seekAmount} seconds. Current time: ${player.currentTime}`);
                break;
            case 'ArrowUp': // Increase volume
                player.volume = Math.min(1, player.volume + 0.1);
                console.debug(`[Volume] Increased to: ${player.volume}`);
                break;
            case 'ArrowDown': // Decrease volume
                player.volume = Math.max(0, player.volume - 0.1);
                console.debug(`[Volume] Decreased to: ${player.volume}`);
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
                console.debug('Video player moved to left panel (portrait mode).');
            }
        } else {
            // Landscape Mode: Move video player back to right panel
            const rightPanel = document.getElementById('right-panel');
            if (rightPanel && !rightPanel.contains(videoWrapper)) {
                rightPanel.appendChild(videoWrapper);
                console.debug('Video player moved back to right panel (landscape mode).');
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
    console.debug('[Event Listeners] Reapplying Plyr event listeners.');
    player.on('play', () => console.info(`[Event: Play] Playback started.`));
    player.on('pause', () => console.info(`[Event: Pause] Playback paused.`));
    player.on('seeked', () => console.info(`[Event: Seeked] Seek operation completed. Current time: ${player.currentTime}`));
    player.on('ended', () => console.info(`[Event: Ended] Video playback ended.`));
    player.on('error', (error) => console.error(`[Event: Error]`, error));
});
