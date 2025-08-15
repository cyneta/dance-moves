# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dance Moves is a Flask web application that manages and displays dance video clips from Google Sheets. It provides video playback controls, playlist management, and practice features for different dance styles (Salsa, Bachata, Casino, ECS, WCS).

## Architecture

### Backend (`app/app.py`)
- **Flask application** serving both API endpoints and static files
- **Google Sheets integration** via CSV export URLs for dynamic video data
- **Data processing pipeline** that validates, sanitizes, and transforms sheet data
- **REST endpoints** for moves data and playlists

### Frontend Structure
- **HTML template**: `app/templates/moves.html` - Main SPA layout with Bootstrap styling
- **JavaScript modules**:
  - `dance_moves.js` - Core application logic, player controls, speed management
  - `player.js` - Video player wrapper and media session controls
  - `playlist.js` - Playlist management and autoplay functionality
  - `movesTable.js` - Move table rendering and selection
  - `tagFilter.js` - Tag-based filtering system
  - `common.js` - Shared utilities and constants

### Data Flow
1. Google Sheets → CSV export URL → Flask backend processing
2. Backend validates/sanitizes data → JSON API endpoints
3. Frontend fetches data → Renders move table and playlists
4. User interactions → Video player controls and playlist navigation

## Development Commands

### Running the Application
```bash
cd app
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The application runs on Flask's development server (typically http://localhost:5000).

### Key Dependencies
- **Flask 3.1.0** - Web framework
- **pandas 2.2.3** - Data processing and CSV handling
- **requests 2.32.3** - HTTP requests for Google Sheets data

## Video Management

- **Videos**: Stored in `app/static/videos/` directory
- **Songs**: Audio files in `app/static/songs/` directory
- **Supported formats**: MP4 for videos, MP3/MP4 for audio

### Video Processing Pipeline

Raw videos are processed through a compression and normalization workflow located in `app/static/videos/new/`:

#### 1. Video Analysis (`video_info.sh`)
```bash
./video_info.sh [source_folder]
```
- Extracts metadata: codec, resolution, frame rate, bitrate, duration, file size
- Outputs `video_info.csv` for analysis before processing

#### 2. Compression (`compress_videos.sh`)
```bash
./compress_videos.sh
```
- **Auto-detection**: Portrait vs landscape orientation
- **Portrait videos**: Crops to 4:5 ratio, scales to 720p height, pads to 1280x720
- **Landscape videos**: Scales to 1280p width maintaining aspect ratio
- **Settings**: H.264 codec, CRF 23-28, AAC audio 128k
- **Workflow**: Processes `*.mp4` → `compressed/` → moves originals to `originals/`

#### 3. Batch Normalization (`uniform_music_videos.sh`)
```bash
./uniform_music_videos.sh
```
- **Standard format**: All videos normalized to 1280x720 with letterboxing
- **Compression**: 500k video bitrate, faster preset for speed
- **Parallel processing**: Configurable job count (default: 4 concurrent)
- **Audio handling**: Copies audio stream without re-encoding

#### Processing Workflow
1. Place raw MP4 files in `app/static/videos/new/`
2. Run `video_info.sh` to analyze source files
3. Run `compress_videos.sh` for automatic portrait/landscape processing
4. Optionally use `uniform_music_videos.sh` for batch standardization
5. Move compressed videos to main `videos/` directory for deployment

## Configuration

### Google Sheets Integration

The application uses a single Google Sheets document with separate tabs for each dance type. Each sheet exports as CSV via Google's export URLs.

#### Sheet URLs (in `app.py`)
```python
sheet_urls = {
    'salsa': "...&gid=886932256",
    'bachata': "...&gid=232533163", 
    'casino': "...&gid=617690693",
    'ecs': "...&gid=350828170",
    'wcs': "...&gid=2088273102"
}
```

#### Data Structure

**Fixed Columns** (defined in `fixed_columns` array):
- `move_name` - Dance move title
- `move_type` - Category/style classification  
- `level` - Difficulty level
- `video_source` - Creator/channel name
- `video_id` - YouTube video ID
- `video_link` - Full YouTube URL
- `video_filename` - Local MP4 filename
- `loop_start` - Start time for practice loop (mm:ss or seconds)
- `loop_end` - End time for practice loop (mm:ss or seconds)
- `loop_speed` - Default playback speed (0.25-2.0)
- `step_counter` - Beat counting data (format: "one_time,measure_time,measure_count,visible_counts")
- `guide_start` - Quick access start time
- `notes` - Move description/instructions

**Dynamic Playlist Columns** (between `guide_start` and `notes`):
- Column names become playlist categories
- Cell values are comma-separated tags for filtering
- Empty cells exclude the move from that playlist
- Example columns: "Beginner", "Intermediate", "Turns", "Combos"

#### Data Processing
1. **CSV fetch** - Downloads sheet data via export URL
2. **Column detection** - Identifies playlist columns (non-fixed, non-dash-prefixed)
3. **Data validation** - Applies defaults and bounds checking
4. **Time parsing** - Converts "mm:ss" format to seconds
5. **Playlist generation** - Creates tag-based categorization

### Video Player Settings
- **Speed control**: Predefined speeds from 0.25x to 2.0x
- **Loop functionality**: Custom start/end points for practice
- **Playlists**: Support for both move collections and continuous song playlists

## Deployment (Render.com)

The application is deployed at https://dance-moves.onrender.com/salsa/

### Deployment Setup
- **Web Service**: Connected to this GitHub repository on Render.com
- **Build Command**: `pip install -r app/requirements.txt`
- **Start Command**: `python app/app.py` (from app directory)
- **Environment**: Python 3.8+

### Static Asset Storage
- **Large video/audio files**: Stored on Render Persistent Disk
- **Mount point**: Likely mounted to `app/static/videos/` and `app/static/songs/`
- **Disk management**: Access via Render dashboard at https://dashboard.render.com/web/srv-cth2e7ggph6c73d7h480

### Deployment Notes
- **Repository sync**: Automatic deployments on git push to main branch
- **Static files**: Small assets (CSS, JS, icons) served from repository
- **Media files**: Large video/audio files served from persistent disk to avoid repository bloat
- **Environment variables**: Configure Google Sheets URLs if needed via Render dashboard

## Project Structure

```
dance-moves/
├── README.md
├── CLAUDE.md
├── app/
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── runtime.txt           # Python version for deployment
│   ├── venv/                 # Python virtual environment
│   ├── templates/
│   │   ├── moves.html        # Main SPA template
│   │   └── moves_head.html   # HTML head section
│   └── static/
│       ├── js/
│       │   ├── dance_moves.js    # Core application logic
│       │   ├── player.js         # Video player controls
│       │   ├── playlist.js       # Playlist management
│       │   ├── movesTable.js     # Move table rendering
│       │   ├── tagFilter.js      # Tag filtering system
│       │   ├── common.js         # Shared utilities
│       │   └── index.js          # Entry point
│       ├── videos/               # Dance move video files
│       │   ├── *.mp4            # Individual video files
│       │   └── new/             # Video processing scripts
│       ├── songs/               # Audio files for practice
│       │   └── *.mp3, *.mp4    # Music files
│       ├── style.css           # Main stylesheet
│       └── [icons/manifests]   # PWA assets
└── copilot_instructions/       # Development notes
```

## Development Preferences

- Always make concise one line commit messages

## File Structure Notes

- **Static assets**: All served from `app/static/` (CSS, JS, videos, audio, icons)
- **Templates**: Jinja2 templates in `app/templates/`
- **Python virtual environment**: Located in `app/venv/`
- **Audio processing tools**: Available in `app/` root (aubio, custom scripts)
- Never reference claude code in a commit message