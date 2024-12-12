import os
import re
import logging
from flask import Flask, render_template, redirect
import pandas as pd

# Initialize Flask app
app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def time_to_seconds(time_value, default=None):
    """
    Converts time value (e.g., "mm:ss", integer seconds) to total seconds.
    Returns `default` for invalid or missing values.
    """
    logging.debug(f"Converting time value: {time_value}")
    if pd.isna(time_value) or time_value == '':
        return default
    try:
        if isinstance(time_value, str) and ':' in time_value:
            minutes, seconds = map(int, time_value.split(':'))
            return minutes * 60 + seconds
        return int(float(time_value))
    except ValueError as e:
        logging.error(f"Failed to convert time value '{time_value}': {e}")
        return default

@app.route('/')
def home():
    """
    Redirect to the default dance type (Salsa).
    """
    return redirect('/salsa')

@app.route('/<dance_type>/', defaults={'playlist_name': None})
@app.route('/<dance_type>/<playlist_name>')
def playlist(dance_type, playlist_name):
    """
    Display a playlist for a specific dance type.
    """
    file_path = os.path.join(BASE_DIR, f'data/{dance_type}_moves.csv')
    if not os.path.exists(file_path):
        return f"Dance type '{dance_type}' not supported!", 404

    data = pd.read_csv(file_path)

    fixed_columns = [
        'move_name', 'move_type', 'source', 'video_id',
        'loop_start', 'loop_end', 'loop_speed', 'guide_start', 'level', 'notes'
    ]
    playlist_columns = [
        col for col in data.columns if col not in fixed_columns and re.match(r'^\d+', col)
    ]
    playlist_columns.sort(key=lambda col: int(re.match(r'^\d+', col).group()))

    # Handle missing playlist_name by using the first available playlist
    if not playlist_name:
        playlist_name = playlist_columns[0] if playlist_columns else None

    if not playlist_name or playlist_name not in playlist_columns:
        return f"Playlist '{playlist_name}' does not exist!", 404

    filtered_moves = data[data[playlist_name].notna() & (data[playlist_name] != '')]

    # Replace NaN in 'notes' with a default value
    filtered_moves['notes'] = filtered_moves['notes'].fillna("No notes available.")

    # Time conversions with default handling
    filtered_moves['loop_start'] = filtered_moves['loop_start'].apply(lambda x: time_to_seconds(x, 0))  # Default to 0
    filtered_moves['loop_end'] = filtered_moves['loop_end'].apply(lambda x: time_to_seconds(x, 10))  # Default to 10 seconds
    filtered_moves['loop_speed'] = filtered_moves['loop_speed'].fillna(1).astype(float)  # Default to 1
    filtered_moves['guide_start'] = filtered_moves['guide_start'].apply(lambda x: time_to_seconds(x, 0))  # Default to 0

    # Remove rows with critical missing fields
    filtered_moves = filtered_moves.dropna(subset=['move_name', 'video_id'])

    return render_template(
        'moves.html',
        moves=filtered_moves.to_dict('records'),
        playlist_name=playlist_name,
        playlists=[(col, re.sub(r'^\d+', '', col).strip()) for col in playlist_columns],
        dance_type=dance_type.capitalize()
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
