# Dance Moves - System Architecture

This document provides an overview of the system architecture, data flow, and core technical decisions.

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Google Sheets │────│   Flask Backend  │────│  Frontend (SPA)     │
│   (5 dance types)    │  (Data Processing)    │  (ES6 Modules)      │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                              │                           │
                              ▼                           ▼
                       ┌──────────────────┐    ┌─────────────────────┐
                       │   JSON API       │    │   Video Player      │
                       │   (/api/moves/)  │    │   + Media Controls  │
                       └──────────────────┘    └─────────────────────┘
```

## Data Flow Pipeline

### 1. Data Source → Backend Processing

**Google Sheets Integration:**
- **5 Dance Types**: Salsa, Bachata, Casino, ECS, WCS
- **Export Method**: CSV export URLs for each sheet tab
- **Update Frequency**: Real-time via HTTP requests

**Data Structure:**
```
Fixed Columns (always present):
├── move_name, move_type, level
├── video_source, video_id, video_link, video_filename
├── loop_start, loop_end, loop_speed
├── step_counter, guide_start, notes

Dynamic Columns (become playlists):
├── Any non-fixed column = playlist category
├── Cell values = comma-separated tags
└── Empty cells = move excluded from playlist
```

### 2. Backend Processing (`app.py`)

**Data Validation Pipeline:**
1. **CSV Fetch** - Download sheet data via export URL
2. **Column Detection** - Identify fixed vs. dynamic (playlist) columns
3. **Data Validation** - Apply defaults, bounds checking, type conversion
4. **Time Parsing** - Convert "mm:ss" format to seconds
5. **Playlist Generation** - Create tag-based categorization

**Key Processing Functions:**
- `fetch_sheet_data()` - HTTP request with error handling
- `time_to_seconds()` - Time format conversion
- `get_valid_numeric_value()` - Validation with bounds checking
- `generate_playlist_tags()` - Tag parsing and playlist creation

### 3. API Layer

**Endpoints:**
- `GET /api/moves/<dance_type>` - Returns processed moves and playlist data
- `GET /<dance_type>` - Serves main application page
- `GET /static/*` - Static assets (videos, CSS, JS)

**Response Format:**
```json
{
  "moves": [
    {
      "move_name": "Cross Body Lead",
      "video_filename": "cbl_demo.mp4",
      "loop_start": 5.0,
      "loop_end": 12.5,
      "playlist_tags": {
        "Beginner": ["basic", "fundamental"],
        "Turns": ["rotation", "lead"]
      }
    }
  ],
  "playlists": ["Beginner", "Intermediate", "Turns", "Combos"]
}
```

## Frontend Architecture

### Module Structure (ES6)

```
index.js (Entry Point)
├── Fetches dance data
├── Initializes all components
└── Sets up global variables

Component Modules:
├── playlist.js     - Playlist selection & management
├── movesTable.js   - Move table rendering & interaction
├── tagFilter.js    - Tag-based filtering system
├── player.js       - Video controls & media session
└── common.js       - Shared utilities & event system
```

### State Management

**Global State:**
- `allMoves[]` - Complete move dataset
- `allPlaylists[]` - Available playlist names
- `moveTableIndices[]` - Filtered move indices for navigation

**Component State:**
- `activePlaylist` - Currently selected playlist
- `currentVideoIndex` - Playing move index
- `isSpeedOverride` - Manual speed control flag
- `isLoopEnabled` - Practice loop mode

## Deployment Architecture

### Render.com Configuration

**Web Service:**
- **Build Command**: `pip install -r app/requirements.txt`
- **Start Command**: `python app/app.py`
- **Working Directory**: `/app`

**Static Asset Strategy:**
- **Small Assets**: Served from repository (CSS, JS, icons)
- **Large Media Files**: Stored on Render Persistent Disk
  - Mount point: `app/static/videos/` and `app/static/songs/`
  - ~400 video files + ~80 audio files

**Environment Variables:**
- Python runtime: 3.11 (specified in `runtime.txt`)
- Flask environment: Production
- Google Sheets URLs: Configured in `sheet_urls` dictionary

## Technical Decisions

### Backend Choices

**Flask Framework:**
- **Rationale**: Lightweight, simple API needs
- **Libraries**: pandas (CSV processing), requests (HTTP), mimetypes (static files)
- **Architecture**: Single-file application with clear separation of concerns

**Data Processing:**
- **pandas**: CSV parsing and data manipulation
- **Validation Strategy**: Apply defaults, then bounds checking
- **Error Handling**: Graceful degradation with logging

### Frontend Choices

**ES6 Modules:**
- **Benefits**: Clean separation, dependency management, modern syntax
- **Pattern**: Each module handles one concern (player, table, filtering)
- **Communication**: Custom event system via `common.js`

**Video Player:**
- **Library**: Plyr.js for consistent cross-platform controls
- **Custom Features**: Looping, speed control, media session integration
- **Mobile Support**: Touch-friendly controls, orientation handling

## Performance Considerations

### Media Management
- **Video Storage**: Separate from repository to avoid bloat
- **Compression Pipeline**: Multi-stage processing for optimal quality/size
- **Caching**: Browser caching for static assets

### Data Loading
- **API Strategy**: Single endpoint per dance type
- **Client-side Filtering**: Reduce server requests
- **Progressive Enhancement**: Works without JavaScript for basic functionality

## Security Considerations

- **CORS**: Same-origin policy for API requests
- **Input Validation**: Server-side validation of all sheet data
- **Static Files**: Served directly by Flask (development) or CDN (production)
- **No Authentication**: Public application, no sensitive data

---

**Related Documentation:**
- [FRONTEND.md](./FRONTEND.md) - Detailed frontend module documentation
- [VIDEO-PROCESSING.md](./VIDEO-PROCESSING.md) - Video processing pipeline
- [FEATURES.md](./FEATURES.md) - Advanced features and workflows
- [CLAUDE.md](./CLAUDE.md) - Development guidelines and commands