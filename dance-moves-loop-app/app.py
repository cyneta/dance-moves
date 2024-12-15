import os
import re
import logging
import requests
import io
import pandas as pd
from flask import Flask, send_from_directory, render_template, request
from urllib.parse import unquote

# Adjust pandas display options for debugging
pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.max_colwidth', None)
pd.set_option('display.width', 1000)

# Initialize Flask app
app = Flask(
    __name__,
    static_folder="static",  # Serve all static files from the default static folder
    static_url_path="/static"  # Maintain the default URL path
)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

def fetch_sheet_data(sheet_url):
    """
    Fetch data from a public Google Sheet in CSV format and return it as a DataFrame.
    """
    try:
        response = requests.get(sheet_url)
        response.raise_for_status()
        return pd.read_csv(io.StringIO(response.text))
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching the Google Sheet: {e}")
        return pd.DataFrame()  # Return an empty DataFrame on error

def time_to_seconds(time_value, default=None):
    """
    Converts time value (e.g., "mm:ss", integer seconds) to total seconds.
    Returns `default` for invalid or missing values.
    """
#    logging.debug(f"Converting time value: {time_value}")
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

@app.route('/static/videos/<path:filename>')
def serve_video(filename):
    decoded_filename = unquote(filename)  # Decode URL-encoded characters
    print(f"Attempting to serve file: {decoded_filename}")
    try:
        return send_from_directory("static/videos", decoded_filename)
    except FileNotFoundError:
        print(f"File not found: {decoded_filename}")
        return "File not found", 404

@app.route('/<dance_type>/', defaults={'playlist_name': None})
@app.route('/<dance_type>/<playlist_name>')
def playlist(dance_type, playlist_name):
    """
    Display a playlist for a specific dance type.
    """

    # Google Sheets CSV export URLs for each dance type
    # This Googl Sheet is named "Dance Moves App Data"
    sheet_urls = {
        'salsa': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=886932256",
        'bachata': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=232533163",
        'swing': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=350828170",
    }

    # Fetch the correct sheet URL
    sheet_url = sheet_urls.get(dance_type.lower())
    if not sheet_url:
        logging.error(f"Unsupported dance type: {dance_type}")
        return f"Dance type '{dance_type}' not supported!", 404

    # Fetch data from Google Sheets
    data = fetch_sheet_data(sheet_url)

    # Check if data is empty
    if data.empty:
        logging.error(f"No data available for dance type: {dance_type}")
        return f"No data available for dance type '{dance_type}'!", 500

    # Detect playlist columns
    fixed_columns = [
        'move_name', 'move_type', 'level', 'video_filename', 
        'loop_start', 'loop_end', 'loop_speed', 'guide_start', 'notes'
    ]

    # Detect dynamic playlist columns
    playlist_columns = [
        col for col in data.columns if col not in fixed_columns and re.match(r'^\d+', col)
    ]
    playlist_columns.sort(key=lambda col: int(re.match(r'^\d+', col).group()))
    logging.debug(f"Playlist Columns: {playlist_columns}")

    if not playlist_columns:
        logging.warning("No playlist columns found in the data.")
        return "No playlists available!", 500

    # Default to the first playlist if none is specified
    if not playlist_name:
        playlist_name = playlist_columns[0]

    if playlist_name not in playlist_columns:
        logging.warning(f"Invalid playlist name: {playlist_name}")
        return f"Playlist '{playlist_name}' does not exist!", 404

    # Filter moves based on the selected playlist
    filtered_moves = data[data[playlist_name].notna() & (data[playlist_name] != '')]
    # logging.debug(f"Filtered Moves Before Drop: {filtered_moves.head()}")

    # Fill missing notes with a default message
    filtered_moves['notes'] = filtered_moves['notes'].fillna("No notes available.")

    # Process loop timing and speed
    filtered_moves['loop_start'] = filtered_moves['loop_start'].apply(lambda x: time_to_seconds(x, 0))
    filtered_moves['loop_end'] = filtered_moves['loop_end'].apply(lambda x: time_to_seconds(x, 100))
    filtered_moves['loop_speed'] = filtered_moves['loop_speed'].fillna(1).astype(float)
    filtered_moves['guide_start'] = filtered_moves['guide_start'].apply(lambda x: time_to_seconds(x, 0))

    # Drop moves without required fields
    missing_videos = filtered_moves[filtered_moves['video_filename'].isna()]
#    if not missing_videos.empty:
#        logging.warning(f"Moves Missing Videos: {missing_videos}")

    filtered_moves = filtered_moves.dropna(subset=['move_name', 'video_filename'])

    # Pass the first move explicitly
    first_move = filtered_moves.iloc[0].to_dict() if not filtered_moves.empty else None

    return render_template(
        'moves.html',
        first_move=first_move,
        moves=filtered_moves.to_dict('records'),
        playlist_name=playlist_name,
        playlists=[(col, re.sub(r'^\d+', '', col).strip()) for col in playlist_columns],
        dance_type=dance_type.capitalize()
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
