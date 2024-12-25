console.debug('[Debug] Script version: 1.1.0');

const speeds = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.57, 0.63, 0.7, 0.8,
    0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.6, 1.8, 2.0
];

let player;
let activePlaylist = ""; // Tracks the currently selected playlist
let isSpeedOverride = false; // Tracks if the speed slider is overriding move speeds

// allMoves is already declared in the HTML and accessible globally
console.debug('Loaded allMoves from HTML:', allMoves);

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
    if (!videoFilename) {
        console.warn('[Play Video] No video filename provided. Displaying placeholder.');
        document.getElementById('player').style.display = 'none';
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes("No video available for this move.");
        return;
    }

    const videoSrc = `/static/videos/${videoFilename}`;
    console.debug(`[Play Video] Video source: ${videoSrc}`);
    console.info(`[Play Video] Playing video "${videoFilename}" | Start=${start}, End=${end}, Speed=${speed}, Loop=${isLooping}`);

    // Use slider speed if override is active
    const sliderValue = parseInt(document.getElementById('speed-slider').value, 10);
    const finalSpeed = isSpeedOverride ? speeds[sliderValue] : speed;

    try {
        const currentSrc = player.source?.sources?.[0]?.src;

        if (currentSrc === videoSrc) {
            console.debug('[Play Video] Source unchanged, skipping reload');
            executePlayback(start, end, finalSpeed, notes, isLooping);
            return;
        }

        console.debug('[Play Video] Updating player source');
        player.source = {
            type: 'video',
            sources: [{ src: videoSrc, type: 'video/mp4' }]
        };

        player.once('loadedmetadata', () => {
            console.debug(`[Play Video] Metadata loaded for "${videoFilename}". Preparing playback.`);
            executePlayback(start, end, finalSpeed, notes, isLooping);
        });

        player.once('error', (error) => {
            console.error('[Play Video] Error loading video:', error);
            document.getElementById('player').style.display = 'none';
            document.getElementById('player-placeholder').style.display = 'block';
            displayNotes("Failed to load video.");
        });
    } catch (error) {
        console.error('[Play Video] Unexpected error:', error);
        document.getElementById('player').style.display = 'none';
        document.getElementById('player-placeholder').style.display = 'block';
        displayNotes("Unexpected error occurred while loading video.");
    }
}

function executePlayback(start, end, speed, notes, isLooping) {
    console.debug('[Execute Playback] Starting playback logic');

    setPlayerSpeed(speed);
    displayNotes(notes);

    if (isLooping && end !== null) {
        applyLooping(start, end);
    }

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
                    console.info(`[Seek Success] Sought to: Target time=${start}, Current time=${player.currentTime}`);
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

    // Ensure the player and media are available
    if (!player || !player.media) {
        console.error('[Looping] Player or media is not initialized.');
        return;
    }

    const videoElement = player.media;

    // Remove any existing loop handler
    if (videoElement.loopHandler) {
        videoElement.removeEventListener('timeupdate', videoElement.loopHandler);
        console.debug('[Looping] Cleared existing timeupdate listener.');
    }

    // Define the loop handler
    const loopHandler = (event) => {
        if (event.target.currentTime >= end) {
            console.debug(`[Looping] Loop complete. Restarting at: ${start}`);
            event.target.currentTime = start;
        }
    };

    // Add the new loop handler
    videoElement.addEventListener('timeupdate', loopHandler);
    videoElement.loopHandler = loopHandler; // Store the handler for easy removal
    console.debug('[Looping] New timeupdate listener added.');
}

function updateMoveTable(moves = allMoves) {
    const moveTable = document.querySelector('#moves-table-container tbody');
    moveTable.innerHTML = '';

    if (moves.length === 0) {
        console.warn('[Move Table] No moves found for the active playlist or tag.');
        moveTable.innerHTML = '<tr><td colspan="3">No moves available.</td></tr>';
        return;
    }

    moves.forEach((move, index) => {
        const originalIndex = allMoves.indexOf(move);
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

function updateTagDropdown() {
    const tags = [...new Set(
        allMoves.flatMap(move => move.playlist_tags[activePlaylist] || [])
    )];
    const tagDropdownMenu = document.getElementById('tagDropdownMenu');
    tagDropdownMenu.innerHTML = tags.length
        ? tags.map(tag => `<li><a class="dropdown-item" href="#" data-tag="${tag}">${tag}</a></li>`).join('')
        : '<li><a class="dropdown-item" href="#" data-tag="all">All</a></li>';

    console.debug('[Tag Dropdown] Updated with tags:', tags);
}

const DEFAULT_TAG = 'no filter';

const tagFilter = {
    currentTag: DEFAULT_TAG,

    setTag(tag) {
        this.currentTag = tag || DEFAULT_TAG;

        const tagDropdownButton = document.getElementById('tagDropdown');
        tagDropdownButton.innerText = tag === DEFAULT_TAG ? `Tag filter: ${DEFAULT_TAG}` : `Tag filter: ${tag}`;

        this.applyFilter();
    },

    applyFilter() {
        const moves = this.currentTag === DEFAULT_TAG
            ? allMoves.filter(move => move.playlist_tags[activePlaylist]?.length > 0)
            : allMoves.filter(move => move.playlist_tags[activePlaylist]?.includes(this.currentTag));

        updateMoveTable(moves);
        console.info(`[Tag Filter] Applied: ${this.currentTag}`);
    },

    reset() {
        this.setTag(DEFAULT_TAG);
    }
};

function selectPlaylist(playlistName) {
    activePlaylist = playlistName;
    isSpeedOverride = false; // Reset speed override when changing playlists

    // Reset tag filter
    tagFilter.reset();

    const filteredMoves = allMoves.filter(move => move.playlist_tags[activePlaylist]?.length > 0);
    updateMoveTable(filteredMoves);
    updateTagDropdown();

    console.info(`[Playlist] Active playlist updated to "${playlistName}".`);
}

function handleMoveAction(moveIndex, action) {
    const move = allMoves[moveIndex]; // Ensure we use the original index
    if (!move) {
        console.error(`[Error] No move found for index: ${moveIndex}`);
        return;
    }

    console.debug('[Debug] Retrieved Move Data:', move);

    if (action === 'loop') {
        playVideo({
            videoFilename: move.video_filename,
            start: move.loop_start,
            end: move.loop_end,
            speed: move.loop_speed,
            notes: move.notes,
            isLooping: true,
        });
    } else if (action === 'guide') {
        playVideo({
            videoFilename: move.video_filename,
            start: move.guide_start,
            speed: 1,
            notes: move.notes,
            isLooping: false,
        });
    }
}

document.getElementById('moves-table-container').addEventListener('click', (event) => {
    const clickedButton = event.target;

    if (clickedButton.tagName === 'BUTTON' && clickedButton.classList.contains('loop-guide-button')) {
        const action = clickedButton.textContent.trim().toLowerCase(); // Determine action (loop/guide)
        const currentRow = clickedButton.closest('tr');
        const moveIndex = currentRow?.dataset.index;

        if (!moveIndex) {
            console.error('[Event Listener] Invalid or missing move index in the row.');
            return;
        }

        // Clear 'btn-primary' from all Loop/Guide buttons in the entire table
        document.querySelectorAll('.loop-guide-button').forEach(button => {
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline-primary');
        });

        // Highlight the clicked button as active
        clickedButton.classList.add('btn-primary');
        clickedButton.classList.remove('btn-outline-primary');

        console.info(`[Event Listener] Button clicked. Action: ${action}, Move Index: ${moveIndex}`);
        handleMoveAction(moveIndex, action);
    }
});

document.getElementById('tagDropdown').addEventListener('click', () => {
    console.debug('[Tag Dropdown] Dropdown button clicked.');

    // Simulate a manual toggle
    const dropdownMenu = document.getElementById('tagDropdownMenu');
    dropdownMenu.classList.toggle('show');
});

function updateTagDropdown() {
    // Gather unique tags across all moves in the active playlist
    const tags = [
        DEFAULT_TAG,
        ...new Set(
            allMoves.flatMap(move => move.playlist_tags[activePlaylist] || [])
        ),
    ];

    const tagDropdownMenu = document.getElementById('tagDropdownMenu');
    tagDropdownMenu.innerHTML = tags.length
        ? tags.map(tag => `<li><a class="dropdown-item" href="#" data-tag="${tag}">${tag}</a></li>`).join('')
        : '<li><a class="dropdown-item" href="#" data-tag="all">All Tags</a></li>';

    console.debug('[Tag Dropdown] Updated with tags:', tags);
}

document.querySelectorAll('.playlist-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active state from all buttons
        document.querySelectorAll('.playlist-button').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
        });

        // Add active state to the clicked button
        button.classList.add('btn-primary');
        button.classList.remove('btn-outline-primary');

        const playlistName = button.dataset.playlist;
        if (playlistName) {
            console.info(`[Playlist] Button clicked for playlist: ${playlistName}`);
            selectPlaylist(playlistName);
        } else {
            console.error('[Playlist] Button missing data-playlist attribute.');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    console.debug('[App Init] DOM content loaded.');

    // Initialize tag filter
    tagFilter.reset();

    // Initialize playlist buttons
    const playlistButtons = document.querySelectorAll('.playlist-button');
    if (playlistButtons.length === 0) {
        console.error('[Playlist] No playlist buttons found.');
        return;
    }

    console.debug('[Playlist] Initializing buttons:', playlistButtons);

    playlistButtons.forEach(button => {
        button.addEventListener('click', () => {
            const playlistName = button.dataset.playlist;
            if (playlistName) {
                console.info(`[Playlist] Button clicked for playlist: ${playlistName}`);
                selectPlaylist(playlistName);
            } else {
                console.error('[Playlist] Button missing data-playlist attribute.');
            }
        });
    });

    // Default to the first playlist if not already set
    const defaultPlaylist = playlistButtons[0]?.dataset.playlist || '';
    selectPlaylist(defaultPlaylist);

    // Ensure moves data is available
    if (!Array.isArray(allMoves) || allMoves.length === 0) {
        console.error('[App Init] Moves data is missing or invalid.');
        return;
    }
    console.debug('Loaded Moves:', allMoves);

    // Initialize the player
    const videoElement = document.getElementById('player');
    if (!videoElement) {
        console.warn('[App Init] No video element found on initial load.');
    } else {
        if (player) player.destroy();
        player = new Plyr(videoElement, {
            controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
        });
    }

    // Add keyboard controls for the player
    document.addEventListener('keydown', (event) => {
        if (!player) return;
        const key = event.key;
        const shiftPressed = event.shiftKey;
        const seekAmount = shiftPressed ? 5 : 1;

        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
            event.preventDefault();
        }

        switch (key) {
            case ' ':
                player.togglePlay();
                break;
            case 'ArrowLeft':
                player.currentTime = Math.max(0, player.currentTime - seekAmount);
                console.debug(`[Seek] Rewound by ${seekAmount} seconds. Current time: ${player.currentTime}`);
                break;
            case 'ArrowRight':
                player.currentTime = Math.min(player.duration, player.currentTime + seekAmount);
                console.debug(`[Seek] Fast-forwarded by ${seekAmount} seconds. Current time: ${player.currentTime}`);
                break;
            case 'ArrowUp':
                player.volume = Math.min(1, player.volume + 0.1);
                console.debug(`[Volume] Increased to: ${player.volume}`);
                break;
            case 'ArrowDown':
                player.volume = Math.max(0, player.volume - 0.1);
                console.debug(`[Volume] Decreased to: ${player.volume}`);
                break;
        }
    });

    // Handle tag selection
    document.getElementById('tagDropdownMenu').addEventListener('click', (event) => {
        const tag = event.target.dataset.tag;
        if (!tag) return;

        tagFilter.setTag(tag);

        // Collapse the dropdown menu after selection
        const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('tagDropdown'));
        if (dropdown) dropdown.hide();
    });

    // Attach event listener to speed slider
    document.getElementById('speed-slider').addEventListener('input', (event) => {
        const sliderValue = parseInt(event.target.value, 10);
        updateSpeed(sliderValue);
        isSpeedOverride = true; // Activate override mode
        console.info('[Speed Override] Activated by slider adjustment.');
    });
       
    // Handle orientation changes for video player
    const videoWrapper = document.getElementById('player-wrapper');
    const leftPanel = document.getElementById('left-panel');
    const movesTable = document.getElementById('moves-table-container');
    const notesSection = document.querySelector('.card');

    function handleOrientationChange() {
        if (!videoWrapper) return;

        if (window.innerHeight > window.innerWidth) {
            if (!movesTable.nextElementSibling?.contains(videoWrapper)) {
                leftPanel.insertBefore(videoWrapper, notesSection);
                console.debug('[Orientation Change] Video player moved to left panel (portrait mode).');
            }
        } else {
            const rightPanel = document.getElementById('right-panel');
            if (rightPanel && !rightPanel.contains(videoWrapper)) {
                rightPanel.appendChild(videoWrapper);
                console.debug('[Orientation Change] Video player moved back to right panel (landscape mode).');
            }
        }
    }

    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);

    if (player) {
        player.off('play');
        player.off('pause');
        player.off('seeked');
        player.off('ended');
        player.off('error');

        console.debug('[Event Listeners] Reapplying Plyr event listeners.');
        player.on('play', () => console.info(`[Event: Play] Playback started.`));
        player.on('pause', () => console.info(`[Event: Pause] Playback paused.`));
        player.on('seeked', () => console.info(`[Event: Seeked] Seek operation completed. Current time: ${player.currentTime}`));
        player.on('ended', () => console.info(`[Event: Ended] Video playback ended.`));
        player.on('error', (error) => console.error(`[Event: Error]`, error));
    }
});
