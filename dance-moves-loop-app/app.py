import os
import re
import logging
import requests
import io
import pandas as pd
from flask import Flask, render_template, redirect

# Initialize Flask app
app = Flask(__name__)

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

    # Google Sheets CSV export URLs for each dance type
    # This Googl Sheet is named "Dance Moves App Data"
    sheet_urls = {
        'salsa': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=886932256",
        'bachata': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=232533163",
        'swing': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=350828170",
    }

    # Get the correct sheet URL based on the dance type
    sheet_url = sheet_urls.get(dance_type.lower())
    if not sheet_url:
        return f"Dance type '{dance_type}' not supported!", 404

    # Fetch the data
    data = fetch_sheet_data(sheet_url)

    # Check if data is empty
    if data.empty:
        return f"No data available for dance type '{dance_type}'!", 500

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
    filtered_moves['loop_start'] = filtered_moves['loop_start'].apply(lambda x: time_to_seconds(x, 0))
    filtered_moves['loop_end'] = filtered_moves['loop_end'].apply(lambda x: time_to_seconds(x, 100))
    filtered_moves['loop_speed'] = filtered_moves['loop_speed'].fillna(1).astype(float)
    filtered_moves['guide_start'] = filtered_moves['guide_start'].apply(lambda x: time_to_seconds(x, 0))

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
