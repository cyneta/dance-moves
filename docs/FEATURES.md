# Dance Moves - Advanced Features & Workflows

This document details the advanced features, user workflows, and sophisticated functionality that makes this dance instruction application unique.

## Core Practice Features

### Dual-Mode Video Playback

**Loop Mode** - Targeted Practice:
- **Purpose**: Focused practice of specific move sections
- **Controls**: Custom start/end points with seamless looping
- **Speed**: Variable speed (0.25x to 2.0x) for learning progression
- **Use Case**: Master difficult sections through repetition

**Guide Mode** - Full Demonstration:
- **Purpose**: See complete move execution with context
- **Controls**: Plays from `guide_start` time at normal speed
- **Speed**: Typically 1.0x for natural demonstration
- **Use Case**: Understand move flow and timing

### Advanced Speed Control System

**Speed Array**: 24 precisely calibrated speeds:
```javascript
[0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 
 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0]
```

**Speed Override Logic**:
- **Default Behavior**: Uses move's recommended `loop_speed`
- **Manual Override**: User slider setting overrides all moves
- **Persistent Override**: Remains active until playlist change
- **Visual Feedback**: Speed display updates in real-time

**Learning Progression Workflow**:
1. **0.25x - 0.5x**: Learn footwork and positioning
2. **0.6x - 0.8x**: Practice timing and coordination  
3. **0.9x - 1.1x**: Approach natural speed
4. **1.2x - 2.0x**: Challenge timing for advanced dancers

## Autoplay System

### Intelligent Progression

**Autoplay Logic**:
```
Select Move → Play with Repeats → Auto-advance → Next Move
     ↑                                               ↓
     └───────────── Continue until playlist end ←────┘
```

**Repeat System**:
- **Default**: 2 repetitions per move
- **Configurable**: Adjustable repeat count
- **Visual Feedback**: "Repeating move (2/2)" display
- **Reset Logic**: Counter resets for each new move

**Navigation Features**:
- **Forward Progression**: Automatically advances through filtered moves
- **Wrap-around**: Returns to first move after last move
- **Manual Control**: N/n keys for next/previous during autoplay
- **Pause Anywhere**: Spacebar maintains position in sequence

### Move Announcement System

**Text-to-Speech Integration**:
```javascript
// Announce move name before playing
announceMove("Cross Body Lead").then(() => {
    playVideo({ /* video parameters */ });
});
```

**Announcement Features**:
- **Move Name Sanitization**: Expands abbreviations (CBL → Cross Body Lead)
- **Visual Overlay**: Large text display during announcement
- **Audio Pause**: Video audio muted during announcement
- **Smooth Transitions**: Fade in/out effects

## Advanced Audio Features

### Alternate Soundtrack System

**Purpose**: Replace video audio with dance-appropriate music for practice.

**Soundtrack Library**:
```javascript
const altSoundtracksByType = {
    "salsa": "salsa_loop.mp3",
    "bachata": "Bachata Mix 2020 OSOCITY.mp3", 
    "casino": "Rueda De Casino - En Mi Puertorro.m4a",
    "ecs": "Aretha Franklin - Good times.mp3",
    "wcs": "West Coast Swing Classic.mp3"
};
```

**Synchronization Features**:
- **Speed Matching**: Audio playback rate matches video speed
- **Loop Continuity**: Audio continues seamlessly across video loops
- **Automatic Muting**: Video audio muted when alternate soundtrack active
- **Smart Resume**: Audio resumes when video plays, pauses when video pauses

### Audio Management Logic

**State Synchronization**:
```javascript
// Video play event
player.on('play', () => {
    if (isAlternateSoundtrackEnabled && audioPlayer.paused) {
        audioPlayer.play();
    }
});

// Video pause event  
player.on('pause', () => {
    if (isAlternateSoundtrackEnabled && !audioPlayer.paused) {
        audioPlayer.pause();
    }
});
```

## Step Counter & Beat Synchronization

### Beat Counter System

**Data Format**: `"one_time,measure_time,measure_count,visible_counts"`
- **one_time**: Reference timestamp for beat 1
- **measure_time**: Duration of one complete measure
- **measure_count**: Total beats in the measure
- **visible_counts**: Array of beats to display (e.g., [1,2,3,4])

**Synchronization Algorithm**:
```javascript
// Calculate current beat with speed adjustment
const syncOffset = 0.090 * playbackSpeed; // Dynamic offset
const elapsedTime = (currentTime - (one_time - syncOffset) + measure_time) % measure_time;
const step = Math.floor((elapsedTime / measure_time) * measure_count) + 1;
```

**Visual Display**:
- **Beat Numbers**: Large overlay showing current count
- **Selective Display**: Only shows specified beats (hide off-beats)
- **Speed Adaptation**: Timing adjusts automatically with speed changes
- **Frame Timer**: Shows absolute and relative timestamps

### Stop-Motion Effect

**Freeze Frame Feature**:
- **Beat Synchronization**: Pauses video on specified beat counts
- **Duration Scaling**: Pause length adjusts with playback speed
- **Control Hiding**: UI controls hidden during freeze to reduce flicker
- **Audio Muting**: Both video and alternate audio muted during freeze

**Implementation**:
```javascript
if (isStopMotionEnabled && !player.paused) {
    const basePauseTime = 300; // ms at 1.0x speed
    const adjustedPauseTime = basePauseTime / playbackSpeed;
    
    player.elements.controls.hidden = true;
    player.pause();
    
    setTimeout(() => {
        player.play();
        player.elements.controls.hidden = false;
    }, adjustedPauseTime);
}
```

## Filtering & Organization

### Multi-Level Filtering System

**Two-Tier Organization**:
1. **Playlist Level**: Primary categorization (Beginner, Intermediate, Advanced)
2. **Tag Level**: Secondary filtering within playlists (turns, combos, patterns)

**Smart Tag Sorting**:
```javascript
// Handles numeric prefixes for ordered display
const extractNumericPrefix = (tag) => {
    const match = tag.match(/^(\d+)(.*)$/);
    return match ? {
        numericPrefix: parseInt(match[1]), 
        remainder: match[2]
    } : { numericPrefix: Infinity, remainder: tag };
};
```

**Tag Examples**:
- `"12#advanced_turn"` → Displays as "12#advanced_turn", sorts by 12
- `"basic"` → Displays as "basic", sorts alphabetically
- `"#variation"` → Preserves leading hash, sorts alphabetically

### Dynamic Content Updates

**Filter Chain Reaction**:
```
Playlist Change → Update Active Moves → Rebuild Tag Filter → Update Table
     ↓                    ↓                    ↓              ↓
Update UI Button    Filter by Playlist    New Tag Options    Visual Update
```

**Responsive Table Management**:
- **Scroll Preservation**: Maintains scroll position during filtering
- **Index Management**: Tracks filtered move indices for navigation
- **Visual Feedback**: Active moves highlighted, current move bolded

## Mobile & Touch Optimizations

### Responsive Layout System

**Orientation-Based Layout**:
- **Portrait Mode**: Video player moves to left panel above move table
- **Landscape Mode**: Traditional two-panel layout with player on right
- **Dynamic Switching**: Automatic layout changes on device rotation

**Touch-Friendly Design**:
- **Large Tap Targets**: Buttons sized for finger navigation
- **Gesture Support**: Swipe-friendly table scrolling
- **Zoom Prevention**: Prevents accidental zoom on form controls

### Media Session Integration

**iOS/Android Control Center Integration**:
```javascript
navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());
navigator.mediaSession.setActionHandler("nexttrack", () => nextVideo());
navigator.mediaSession.setActionHandler("previoustrack", () => previousVideo());
```

**Lock Screen Controls**:
- **Play/Pause**: Spacebar functionality via lock screen
- **Track Navigation**: Previous/next move controls
- **Metadata Display**: Shows current move name and dance style
- **Artwork**: Dance app icon in media controls

## Keyboard & Remote Control

### Comprehensive Keyboard Shortcuts

**Media Controls**:
- **Space/Enter**: Play/pause toggle
- **←/→ arrows**: Fast seek (0.5 seconds)
- **↑/↓ arrows**: Slow seek (0.034 seconds - single frame)
- **Home/End**: Jump to start/end of video

**Advanced Controls**:
- **S/s**: Speed adjustment (up/down)
- **N/n**: Next/previous move (in loop mode)
- **M**: Mute/unmute toggle
- **F**: Fullscreen toggle

**Focus Management (Recent Enhancement)**:
```javascript
// Ensure keyboard controls work on touch devices
function ensureVideoFocus() {
    if (player?.media) {
        player.media.focus({ preventScroll: true });
    }
}
```

### Remote Control Support

**Apple TV Remote & Similar Devices**:
- **Touch Surface**: Seek controls via swipe gestures  
- **Play/Pause Button**: Direct video control
- **Menu Button**: Return to move selection
- **Siri Integration**: Voice control for basic functions

## User Experience Enhancements

### Visual Feedback Systems

**Active State Management**:
- **Playlist Buttons**: `.btn-primary` class for active playlist
- **Move Buttons**: `.btn-primary` class for active Loop/Guide button
- **Current Move**: `.current-move` class bolds playing move in table
- **Auto-scroll**: Table automatically scrolls to active move

**Loading & Error States**:
- **Video Loading**: Smooth transition from placeholder to player
- **Error Handling**: Graceful fallback with user-friendly messages
- **Progress Indicators**: Speed slider and time displays update in real-time

### Accessibility Features

**Screen Reader Support**:
- **Semantic HTML**: Proper heading hierarchy and button labels
- **ARIA Labels**: Descriptive labels for complex controls
- **Focus Management**: Logical tab order and focus indicators

**Motor Accessibility**:
- **Large Click Targets**: Minimum 44px touch targets
- **Keyboard Navigation**: Full functionality without mouse
- **Sticky Controls**: Player controls remain accessible during scrolling

## Performance Optimizations

### Efficient Resource Management

**Video Player Optimization**:
- **Single Instance**: One Plyr player reused for all videos
- **Source Updates**: Only changes video source, preserves player state
- **Memory Management**: Proper cleanup of event listeners and timeouts

**DOM Update Efficiency**:
- **Minimal Reflows**: Batch DOM updates to prevent layout thrashing
- **Selective Updates**: Only update changed table rows
- **Debounced Events**: Throttle high-frequency events (scroll, resize)

### Caching Strategies

**Client-Side Caching**:
- **Move Data**: API responses cached until page refresh
- **Video Metadata**: Player settings cached per session
- **User Preferences**: Playlist/tag selections preserved

**Browser Caching**:
- **Static Assets**: Long-term caching for CSS/JS files
- **Video Files**: Appropriate cache headers for media content
- **API Responses**: Short-term caching for move data

---

**Related Documentation:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [FRONTEND.md](./FRONTEND.md) - Frontend module documentation
- [VIDEO-PROCESSING.md](./VIDEO-PROCESSING.md) - Video processing pipeline