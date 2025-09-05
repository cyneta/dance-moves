# Dance Moves - Frontend Architecture

This document details the frontend JavaScript modules, component relationships, and interaction patterns.

## Module Overview

The frontend uses ES6 modules with a clean separation of concerns. Each module handles a specific aspect of the application.

```
┌─────────────┐
│  index.js   │ ← Entry point, initialization
└─────────────┘
      │
      ├─── playlist.js      (Playlist management)
      ├─── movesTable.js    (Move table & selection)
      ├─── tagFilter.js     (Tag-based filtering)
      ├─── player.js        (Video controls & media)
      └─── common.js        (Utilities & events)
```

## Core Modules

### `index.js` - Application Entry Point

**Purpose**: Initialize the application and coordinate all modules.

**Key Functions:**
- `fetchDanceData(danceType)` - Loads moves and playlists from API
- `initializeApp(danceType)` - Sets up all components in correct order

**Initialization Sequence:**
1. Fetch data from `/api/moves/<dance_type>`
2. Set global variables (`allMoves`, `allPlaylists`)
3. Initialize components:
   - `setupPlaylistButtons()` - Create playlist UI
   - `initializePlaylists()` - Activate first playlist
   - `setupMovesTable()` - Render move table
   - `initializePlayerUI()` - Set up video player
   - `initializeSpeedSlider()` - Speed control
   - `setupAutoplayToggle()` - Autoplay feature
   - `setupKeyboardControls()` - Keyboard shortcuts
   - `initializeOrientationHandling()` - Mobile support

### `playlist.js` - Playlist Management

**Purpose**: Handle playlist selection and filtering.

**Key Functions:**
- `setupPlaylistButtons()` - Create playlist buttons from API data
- `initializePlaylists()` - Set default active playlist
- `selectPlaylist(playlistName)` - Switch active playlist

**Event Flow:**
```
User clicks playlist button
    ↓
Update active playlist state
    ↓
Trigger 'playlistChanged' event
    ↓
movesTable.js updates table
    ↓
tagFilter.js updates available tags
```

**State Management:**
- `activePlaylist` - Currently selected playlist name
- Playlist buttons get `.btn-primary` class when active

### `movesTable.js` - Move Table & Selection

**Purpose**: Render and manage the moves table with filtering.

**Key Functions:**
- `setupMovesTable()` - Initialize table event handlers
- `updateMovesTable(moves, playlists, activePlaylist, activeTag)` - Render table
- `displayNotes(moveName, notes)` - Show move notes

**Table Structure:**
```html
<tbody>
  <tr data-move-index="0">
    <td>Move Name</td>
    <td><button class="loop-btn">Loop</button></td>
    <td><button class="guide-btn">Guide</button></td>
  </tr>
</tbody>
```

**Event Handling:**
- Click handlers for Loop/Guide buttons
- Triggers `moveAction` events with move index
- Maintains `moveTableIndices[]` for filtered moves

**Visual Feedback:**
- Active buttons get `.btn-primary` class
- Currently playing move gets `.current-move` class
- Auto-scroll to active move

### `tagFilter.js` - Tag-Based Filtering

**Purpose**: Implement secondary filtering within playlists.

**Key Features:**
- **Numeric Sorting**: Handles tags like "12#advanced_turn" with proper numeric ordering
- **Tag Normalization**: Preserves leading hash characters (#) in display
- **Dynamic Updates**: Rebuilds tag list when playlist changes

**Key Functions:**
- `updateTagFilter(moves, playlists, activePlaylist)` - Rebuild tag dropdown
- `normalizeTag(tag)` - Handle numeric prefixes and special characters
- Event handler for tag selection

**Tag Processing Logic:**
```javascript
// Extract numeric prefix for sorting
const match = tag.match(/^(\d+)(.*)$/);
if (match) {
  return {
    numericPrefix: parseInt(match[1]),
    remainder: match[2]
  };
}
```

### `player.js` - Video Controls & Media Session

**Purpose**: Comprehensive video player management with advanced features.

#### Core Player Functions

**Video Playback:**
- `playVideo(params)` - Main video loading function
- `startPlayback()` - Handle seeking and initialization
- `seekToStart(start)` - Precise video seeking

**Speed Management:**
- `setPlaybackSpeed(speed)` - Update player speed and UI
- `determinePlaybackSpeed(loopSpeed)` - Handle speed override logic
- Speed array: 24 predefined speeds from 0.25x to 2.0x

**Looping System:**
- `applyLooping(start, end, stepCounterParams)` - Custom loop implementation
- Uses `timeupdate` event listener for precise control
- Supports autoplay progression with repeat counts

#### Advanced Features

**Media Session Integration:**
```javascript
navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());
navigator.mediaSession.setActionHandler("nexttrack", () => nextVideo());
navigator.mediaSession.setActionHandler("previoustrack", () => previousVideo());
```

**Keyboard Controls:**
- Spacebar/Enter: Play/pause
- Arrow keys: Seek forward/back (0.5s fast, 0.034s slow)
- S/s: Speed adjustment
- N/n: Next/previous move (in loop mode)
- M: Mute, F: Fullscreen

**Advanced Player Features:**
- **Autoplay Mode**: Automatic progression through filtered moves
- **Alternate Soundtrack**: Replace video audio with dance music
- **Stop-Motion Mode**: Freeze-frame effect synchronized with beats
- **Step Counter**: Visual beat counting with speed-adjusted timing
- **Move Highlighting**: Bold currently playing move in table

#### Mobile & Touch Support

**Orientation Handling:**
- **Portrait Mode**: Move player above moves table in left panel
- **Landscape Mode**: Player in right panel
- Dynamic DOM manipulation on window resize

**Focus Management (Recent Fix):**
- `ensureVideoFocus()` - Programmatically focus video for keyboard controls
- Automatic focus on play, load, and keyboard events
- Fixes iPad spacebar control issue

### `common.js` - Utilities & Event System

**Purpose**: Shared utilities and custom event system.

**Event System:**
```javascript
// Custom event system for module communication
export function trigger(eventName, data) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
}

export function on(eventName, callback) {
  window.addEventListener(eventName, (event) => callback(event.detail));
}
```

**Usage Pattern:**
```javascript
// In movesTable.js - trigger event
trigger('moveAction', { moveIndex: 5 });

// In player.js - listen for event
on('moveAction', ({ moveIndex }) => {
  // Handle move selection
});
```

## Component Communication

### Event-Driven Architecture

**Primary Events:**
- `moveAction` - Move selection (table → player)
- `playlistChanged` - Playlist change (playlist → table/filter)
- Custom DOM events for UI updates

**State Sharing:**
- Global variables exported from `index.js`
- Module-level state encapsulation
- UI state synchronized via DOM classes

### Data Flow Patterns

**User Interaction → State Change → UI Update:**

```
1. Playlist Selection:
   Button Click → selectPlaylist() → Update activePlaylist → 
   Update table → Update tag filter → Update URL

2. Move Selection:
   Loop/Guide Click → Trigger moveAction → playVideo() → 
   Update player → Update highlighting → Update notes

3. Tag Filtering:
   Dropdown Selection → Filter moves → Update table → 
   Maintain scroll position
```

## Responsive Design

### Layout Management

**CSS Grid/Flexbox:**
- Two-panel layout (left: controls, right: player)
- Responsive breakpoints for mobile devices
- Dynamic content reordering for orientation changes

**JavaScript-Driven Responsive Features:**
- Player position changes based on `window.innerHeight vs innerWidth`
- Touch-friendly button sizing
- Scroll management for filtered tables

### Mobile Optimizations

**Touch Events:**
- Large tap targets for buttons
- Swipe-friendly table scrolling
- Prevent accidental zoom on form controls

**Performance:**
- Efficient DOM updates
- Minimal reflows/repaints during orientation changes
- Lazy initialization of expensive features

## Performance Considerations

### Efficient Rendering

**Table Updates:**
- Only re-render when data actually changes
- Preserve scroll position during filtering
- Batch DOM updates

**Player Management:**
- Single Plyr instance, update source only when needed
- Remove event listeners when changing videos
- Proper cleanup of timeout/interval handlers

### Memory Management

**Event Listener Cleanup:**
- Remove custom loop handlers when changing videos
- Proper teardown of media session handlers
- Avoid memory leaks in long-running sessions

---

**Related Documentation:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [VIDEO-PROCESSING.md](./VIDEO-PROCESSING.md) - Video processing pipeline
- [FEATURES.md](./FEATURES.md) - Advanced features and workflows