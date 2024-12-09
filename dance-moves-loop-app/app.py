import os
import re
from flask import Flask, render_template
import pandas as pd

# Initialize Flask app
app = Flask(__name__)

# Define the base directory for relative paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Helper function to extract numeric prefixes for sorting playlists
def extract_number_prefix(column_name):
    match = re.match(r'^(\d+)', column_name)
    return int(match.group(1)) if match else None

# Home route - Display all playlists
@app.route('/')
def home():
    file_path = os.path.join(BASE_DIR, 'data', 'salsa_moves.csv')
    data = pd.read_csv(file_path)

    # Dynamically detect playlist columns with leading numbers
    fixed_columns = [
        'move_name', 'move_type', 'source', 'video_id',
        'start_time', 'end_time', 'level', 'notes'
    ]
    playlist_columns = [
        col for col in data.columns if col not in fixed_columns and re.match(r'^\d+', col)
    ]

    # Sort playlists by their numeric prefixes
    playlist_columns.sort(key=lambda col: int(re.match(r'^\d+', col).group()))

    # Generate display names by stripping numbers
    playlists = [(col, re.sub(r'^\d+', '', col).strip()) for col in playlist_columns]

    # Pass the first playlist for default rendering
    first_playlist = playlist_columns[0] if playlist_columns else None

    return render_template('home.html', playlists=playlists, first_playlist=first_playlist)

# Playlist route - Display moves in a specific playlist
@app.route('/playlist/<playlist_name>')
def playlist(playlist_name):
    file_path = os.path.join(BASE_DIR, 'data', 'salsa_moves.csv')
    data = pd.read_csv(file_path)

    # Dynamically detect playlist columns with leading numbers
    fixed_columns = [
        'move_name', 'move_type', 'source', 'video_id',
        'start_time', 'end_time', 'level', 'notes'
    ]
    playlist_columns = [
        col for col in data.columns if col not in fixed_columns and re.match(r'^\d+', col)
    ]

    # Sort playlists by their numeric prefixes
    playlist_columns.sort(key=lambda col: int(re.match(r'^\d+', col).group()))

    # Check if the requested playlist exists
    if playlist_name not in playlist_columns:
        return f"Playlist '{playlist_name}' does not exist!", 404

    # Filter moves for the playlist (non-blank values)
    filtered_moves = data[data[playlist_name].notna() & (data[playlist_name] != '')]

    # Convert start_time and end_time to ensure proper defaults
    filtered_moves['start_time'] = filtered_moves['start_time'].fillna(0).astype(int)
    filtered_moves['end_time'] = filtered_moves['end_time'].fillna('').astype(str)

    # Sort moves by level (ascending order)
    filtered_moves = filtered_moves.sort_values(by='level')

    return render_template(
        'moves.html',
        moves=filtered_moves.to_dict('records'),
        playlist_name=playlist_name,
        playlists=[(col, re.sub(r'^\d+', '', col).strip()) for col in playlist_columns],
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Use PORT from environment, default to 5000
    app.run(host="0.0.0.0", port=port, debug=True)
