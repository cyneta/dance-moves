# Dance Moves 🎶💃🕺

A sophisticated web application for dance instruction that integrates Google Sheets data management with advanced video playback features. Practice dance moves with precise looping, variable speed control, beat synchronization, and autoplay progression.

**🌐 Live Demo**: [https://dance-moves.onrender.com/salsa/](https://dance-moves.onrender.com/salsa/)

---

## ✨ Key Features

### 🎥 Advanced Video Player
- **Precision Looping**: Custom start/end points with seamless playback
- **Variable Speed**: 24 speed settings (0.25x - 2.0x) for learning progression  
- **Dual Modes**: Loop for practice, Guide for full demonstrations
- **Beat Counter**: Visual step counting synchronized with music tempo

### 🎵 Practice Enhancements  
- **Autoplay Mode**: Automatic progression through moves with configurable repeats
- **Alternate Soundtracks**: Replace video audio with dance-appropriate music
- **Stop-Motion Effect**: Freeze-frame synchronized with beat counts
- **Media Session**: iOS/Android lock screen and control center integration

### 📊 Smart Organization
- **Google Sheets Integration**: Dynamic content management via CSV export
- **Multi-Level Filtering**: Playlists + tag-based secondary filtering
- **Numeric Sorting**: Handles ordered tags like "12#advanced_turn"
- **5 Dance Styles**: Salsa, Bachata, Casino, East Coast Swing, West Coast Swing

### 📱 Mobile Optimized
- **Responsive Design**: Automatic layout adjustment for portrait/landscape
- **Touch Controls**: Large tap targets, swipe-friendly navigation
- **Keyboard Support**: Spacebar, arrows, speed controls work reliably on tablets
- **Focus Management**: Professional keyboard control without clicking video first

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Git

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/dance-moves.git
cd dance-moves

# Set up Python environment
cd app
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run application
python app.py
```

Visit `http://localhost:5000/salsa/` to start practicing!

---

## 🎯 Usage

### For Dance Students
1. **Select Dance Style**: Choose from Salsa, Bachata, Casino, ECS, or WCS
2. **Pick Playlist**: Filter by skill level (Beginner, Intermediate, Advanced) 
3. **Choose Move**: Browse table and click Loop or Guide buttons
4. **Practice**: Use speed control and looping for focused learning
5. **Progress**: Enable autoplay to cycle through moves automatically

### Keyboard Controls
- **Spacebar**: Play/pause (works on tablets without clicking video!)
- **←/→**: Seek backward/forward (0.5s)  
- **↑/↓**: Fine seek (1 frame)
- **S/s**: Speed up/down
- **N/n**: Next/previous move (in loop mode)

---

## 🛠️ Content Management

### Adding New Moves
1. Edit the Google Sheets document (configured in `app.py`)
2. Add move details in fixed columns (name, video file, loop points, etc.)
3. Set playlist tags in dynamic columns
4. Application updates automatically on next load

### Video Processing
Process raw videos using the automated pipeline in `app/static/videos/new/`:

```bash
cd app/static/videos/new
./video_info.sh        # Analyze source videos
./compress_videos.sh   # Smart compression with portrait/landscape detection
./uniform_music_videos.sh  # Batch normalization to 1280x720
```

---

## 🏗️ Technical Architecture

This application uses a modern, modular architecture:

- **Backend**: Flask with Google Sheets CSV integration
- **Frontend**: ES6 modules with Plyr.js video player
- **Processing**: FFmpeg-based video optimization pipeline
- **Deployment**: Render.com with persistent disk storage

### Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and data flow
- **[FRONTEND.md](./FRONTEND.md)** - JavaScript modules and component relationships  
- **[VIDEO-PROCESSING.md](./VIDEO-PROCESSING.md)** - Video optimization pipeline
- **[FEATURES.md](./FEATURES.md)** - Advanced features and workflows
- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the patterns established in the codebase
4. Test thoroughly across devices and browsers
5. Update documentation as needed
6. Submit a pull request

### Development Guidelines
- ES6 modules with clean separation of concerns
- Mobile-first responsive design
- Comprehensive error handling and logging
- Performance-optimized video processing

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Plyr.js** - Excellent cross-platform video player
- **Bootstrap** - Responsive UI framework
- **FFmpeg** - Video processing capabilities
- Dance instructors and students who inspired this project

---

**Happy Dancing! 💃🕺**