# Dance Moves 🎶💃🕺

Dance Moves is a web application that uses Google Sheets to manage and display video clips for practicing dance moves. It allows users to loop, adjust playback speed, and access playlists categorized by dance style.

---

## 🚀 Features

### 📊 Google Sheets Integration
- Dynamically loads video data from Google Sheets.
- Supports multiple sheets for different dance styles, such as Salsa, Bachata, Swing, and more.
- Columns between `guide_start` and `notes` define playlists for each dance style.

### 🎥 Video Playback
- **Looping**: Set custom start and end points for focused practice.
- **Speed Adjustment**: Incrementally adjust playback speed for learning at your own pace.
- **Guide Mode**: Jump directly to predefined sections of a video.

### 📂 Playlist Management
- Organizes moves and songs into playlists based on Google Sheet data.
- Autoplay for playlists of type `song`, cycling through all videos in the list and looping back to the start.

### 📱 Device Compatibility
- Works across devices, including desktops, tablets, and mobile phones.
- Automatically adjusts layout for portrait and landscape modes.

### 🛠️ Customization
- Add or update moves by editing the connected Google Sheet.
- Store video clips in the `static/videos` directory.
- Notes for each move are displayed alongside the video.

---

## 🏗️ Installation

### Prerequisites
- Python 3.8 or higher.
- Access to Google Sheets with exported data.

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dance-moves.git
   cd dance-moves
