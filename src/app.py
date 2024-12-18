import os
import re
import logging
import requests
import io
import pandas as pd
from flask import Flask, send_from_directory, render_template, request, redirect, Response
from datetime import datetime, timedelta
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

def time_to_seconds(time_value):
    """
    Converts time value (e.g., "mm:ss", integer seconds) to total seconds.
    Expects valid input; caller must handle missing or invalid values.
    """
    try:
        # Handle "mm:ss" format
        if isinstance(time_value, str) and ':' in time_value:
            # Strip whitespace and split on ":"
            time_value = time_value.strip()
            minutes, seconds = map(int, time_value.split(':'))
            return minutes * 60 + seconds
        # Handle numeric values (e.g., 126 seconds)
        return int(float(time_value))
    except (ValueError, TypeError) as e:
        logging.error(f"Failed to convert time value '{time_value}': {e}")
        return None

def get_valid_numeric_value(value, default, field_name, move_name, lower_bound=None, upper_bound=None):
    """
    Handles missing or invalid numeric values for a given field.
    Applies a default, ensures range, and logs adjustments.
    Converts 'mm:ss' formatted strings to seconds if necessary.
    """
    if pd.isna(value) or value == '':
        logging.info(f"[Default Applied] Move '{move_name}': {field_name} set to {default}")
        return default

    # Convert value using time_to_seconds if applicable
    try:
        numeric_value = time_to_seconds(value) if isinstance(value, str) and ':' in value else float(value)

        # Validate against lower and upper bounds
        if lower_bound is not None and numeric_value < lower_bound:
            logging.warning(f"Move Data Validation: '{move_name}': {field_name} adjusted from {numeric_value} to {lower_bound}")
            return lower_bound
        if upper_bound is not None and numeric_value > upper_bound:
            logging.warning(f"Move Data Validation: '{move_name}': {field_name} adjusted from {numeric_value} to {upper_bound}")
            return upper_bound

        return numeric_value
    except (ValueError, TypeError):
        logging.error(f"Move Data Validation: '{move_name}': Invalid value for {field_name}: {value}. Using default: {default}")
        return default

def process_move(row):
    """
    Process a single row to enforce bounds, validate ranges, and log adjustments.
    """
    move_name = row.get('move_name', 'Unknown Move')

    # Handle loop_start
    loop_start = get_valid_numeric_value(
        value=row.get('loop_start'),
        default=0,
        field_name='loop_start',
        move_name=move_name,
        lower_bound=0
    )

    # Handle loop_end
    loop_end = get_valid_numeric_value(
        value=row.get('loop_end'),
        default=loop_start + 10,
        field_name='loop_end',
        move_name=move_name,
        lower_bound=loop_start + 5
    )

    # Validate loop_speed
    loop_speed = get_valid_numeric_value(
        value=row.get('loop_speed'),
        default=1,
        field_name='loop_speed',
        move_name=move_name,
        lower_bound=0.25,
        upper_bound=2
    )

    # Handle guide_start
    guide_start = get_valid_numeric_value(
        value=row.get('guide_start'),
        default=0,
        field_name='guide_start',
        move_name=move_name,
        lower_bound=0
    )

    # Return processed values
    return loop_start, loop_end, loop_speed, guide_start

@app.route('/')
def home():
    """
    Redirect to the default dance type (Salsa).
    """
    return redirect('/salsa')

@app.route('/static/videos/<path:filename>')
def serve_video(filename):
    # Serve the video file
    response = send_from_directory('static/videos', filename)
    
    # Step 1: Detect the user's timezone offset (fallback if not provided)
    user_timezone_offset = request.args.get('tz', default=0, type=int)  # Client sends offset in minutes

    # Step 2: Calculate the user's local midnight
    now_utc = datetime.utcnow()
    user_offset = timedelta(minutes=user_timezone_offset)
    now_local = now_utc + user_offset
    local_midnight = (now_local + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    expires_utc = local_midnight - user_offset  # Convert back to UTC

    # Step 3: Set caching headers
    response.headers['Cache-Control'] = 'public, must-revalidate'
    response.headers['Expires'] = expires_utc.strftime("%a, %d %b %Y %H:%M:%S GMT")
    response.headers['Accept-Ranges'] = 'bytes'  # Allow partial content requests

    #print(f"Local midnight for user: {local_midnight}, Expires header set to: {expires_utc}")
    return response

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
        'zouk': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=617690693",
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

    # Process and validate each move
    filtered_moves[['loop_start', 'loop_end', 'loop_speed', 'guide_start']] = filtered_moves.apply(
        lambda row: pd.Series(process_move(row)), axis=1
    )

    # Fill missing notes with a default message
    filtered_moves['notes'] = filtered_moves['notes'].fillna("No notes for this move.")

    # Log and drop rows missing required fields
    dropped_moves = filtered_moves[filtered_moves[['move_name', 'video_filename']].isna().any(axis=1)]
    if not dropped_moves.empty:
        logging.warning(f"Dropping moves due to missing fields: {dropped_moves[['move_name', 'video_filename']].to_dict(orient='records')}")
    filtered_moves = filtered_moves.dropna(subset=['move_name', 'video_filename'])

    # Log the final move count
    logging.info(f"Final move count after filtering '{playlist_name}': {len(filtered_moves)}")

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
