# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dance Moves is a Flask web application that manages and displays dance video clips from Google Sheets. It provides video playback controls, playlist management, and practice features for different dance styles (Salsa, Bachata, Casino, ECS, WCS).

## Documentation

For comprehensive understanding of the system:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, data flow, and technical decisions
- **[FRONTEND.md](./FRONTEND.md)** - JavaScript modules, component relationships, and interaction patterns  
- **[VIDEO-PROCESSING.md](./VIDEO-PROCESSING.md)** - Video processing pipeline and optimization scripts
- **[FEATURES.md](./FEATURES.md)** - Advanced features, user workflows, and sophisticated functionality

## Quick Architecture Summary

### Backend
- **Flask application** (`app/app.py`) with Google Sheets integration
- **Data processing pipeline** that validates and transforms CSV data
- **REST API** serving moves data and playlists

### Frontend (ES6 Modules)
- **index.js** - Application entry point and initialization
- **player.js** - Video controls, media session, keyboard shortcuts
- **playlist.js** - Playlist management and selection
- **movesTable.js** - Move table rendering and interaction
- **tagFilter.js** - Tag-based filtering with numeric sorting
- **common.js** - Utilities and event system

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

### Video Processing

Three-stage pipeline in `app/static/videos/new/`. See [VIDEO-PROCESSING.md](./VIDEO-PROCESSING.md) for complete details.

**Quick Commands:**
```bash
cd app/static/videos/new
./video_info.sh        # Analyze source videos
./compress_videos.sh   # Smart compression (portrait/landscape)
./uniform_music_videos.sh  # Batch normalization
```

## Data Configuration

### Google Sheets Integration

Uses Google Sheets CSV export URLs for each dance type. See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed data structure and processing pipeline.

**Sheet URLs**: Configured in `app.py` `sheet_urls` dictionary
**Data Structure**: Fixed columns + dynamic playlist columns + tag-based filtering
**Processing**: Validation, time parsing, playlist generation

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

