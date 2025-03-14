import os
import logging
import requests
import io
import pandas as pd
import mimetypes
import json
import re
from flask import Flask, jsonify, send_from_directory, render_template, request, redirect, Response
from datetime import datetime, timedelta
from urllib.parse import unquote

# Ensure correct MIME type for JavaScript modules
mimetypes.add_type('application/javascript', '.js')

# Initialize Flask app
app = Flask(
    __name__,
    static_folder="static",  # Serve all static files from the default static folder
    static_url_path="/static"  # Maintain the default URL path
)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Fixed columns to exclude from playlist processing
fixed_columns = [
    'move_name', 'move_type', 'level', 'video_source', 'video_id', 'video_link', 
    'video_filename', 'loop_start', 'loop_end', 'loop_speed', 'step_counter', 'guide_start', 'notes'
]

def generate_playlist_tags(move_row, playlist_columns):
    """
    Generate a dictionary of playlists and their associated tags for a given move row.
    """
    playlist_tags = {}
    for col in playlist_columns:
        if not pd.isna(move_row[col]):
            # Capture tags by splitting on commas and trimming whitespace
            tags = [tag.strip() for tag in str(move_row[col]).split(',')]
            playlist_tags[col] = tags
    return playlist_tags

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
    Converts time value (e.g., "mm:ss", integer seconds, or floats) to total seconds.
    Expects valid input; caller must handle missing or invalid values.
    """
    try:
        if isinstance(time_value, str):
            time_value = time_value.strip()  # Remove leading/trailing spaces
            # Handle "mm:ss" format
            if ':' in time_value:
                minutes, seconds = map(float, time_value.split(':'))  # Allow decimals
                total_seconds = minutes * 60 + seconds
                return total_seconds
            else:
                # Handle cases where the spreadsheet may store as a stringified float
                time_value = float(time_value)

        # If it's already a number, ensure it's a float
        result = float(time_value)
        return result

    except (ValueError, TypeError) as e:
        return None

def get_valid_numeric_value(value, default, field_name, move_name, lower_bound=None, upper_bound=None):
    """
    Handles missing or invalid numeric values for a given field.
    Applies a default, ensures range, and logs adjustments.
    """
    if pd.isna(value) or value == '':
        logging.info(f"[Default Applied] Move '{move_name}': {field_name} set to {default}")
        return default

    try:
        numeric_value = float(value)

        # Enforce lower bound
        if lower_bound is not None and numeric_value < lower_bound:
            logging.warning(f"[Bounds Adjusted] Move '{move_name}': {field_name} adjusted to lower bound {lower_bound}")
            return lower_bound

        # Enforce upper bound
        if upper_bound is not None and numeric_value > upper_bound:
            logging.warning(f"[Bounds Adjusted] Move '{move_name}': {field_name} adjusted to upper bound {upper_bound}")
            return upper_bound

        return numeric_value
    except (ValueError, TypeError):
        logging.error(f"[Invalid Value] Move '{move_name}': {field_name} invalid value '{value}', defaulting to {default}")
        return default

def process_row(row):
    """
    Processes a single row, applying defaults, sanitization, and bounds checking for all columns.
    """
    defaults = {
        "move_name": "Unnamed Move",
        "move_type": "",
        "level": "",
        "video_source": "",
        "video_id": "",
        "video_link": "",
        "video_filename": "",
        "loop_start": 0,
        "loop_end": None,
        "loop_speed": 1,
        "step_counter": None,
        "guide_start": 0,
        "notes": "No notes for this move.",
    }

    processed = {}

    # Apply defaults and sanitize
    for key, value in row.items():
        processed[key] = defaults.get(key, "") if pd.isna(value) else value

    move_name = processed["move_name"]

    # Parse time fields using time_to_seconds
    processed["loop_start"] = time_to_seconds(processed["loop_start"])
    processed["loop_end"] = time_to_seconds(processed["loop_end"])
    processed["guide_start"] = time_to_seconds(processed["guide_start"])

    # Validate numeric fields
    processed["loop_start"] = get_valid_numeric_value(
        value=processed["loop_start"],
        default=0,
        field_name="loop_start",
        move_name=move_name,
        lower_bound=0
    )

    processed["loop_end"] = get_valid_numeric_value(
        value=processed["loop_end"],
        default=processed["loop_start"] + 20,
        field_name="loop_end",
        move_name=move_name,
        lower_bound=processed["loop_start"] + 3
    )

    processed["loop_speed"] = get_valid_numeric_value(
        value=processed["loop_speed"],
        default=1,
        field_name="loop_speed",
        move_name=move_name,
        lower_bound=0.25,
        upper_bound=2
    )

    processed["guide_start"] = get_valid_numeric_value(
        value=processed["guide_start"],
        default=0,
        field_name="guide_start",
        move_name=move_name,
        lower_bound=0
    )

    # Parse and validate step_counter
    step_counter = processed.get("step_counter", None)
    if step_counter and isinstance(step_counter, str):
        try:
            logging.debug(f"[Step Counter] Raw step_counter BEFORE SPLIT: {step_counter}")

            # Use regex to split into four components
            match = re.match(r'^([^,]+),([^,]+),([^,]+),(.+)$', step_counter)
            if not match:
                raise ValueError(f"Invalid step_counter format: {step_counter}")

            one_time = float(match.group(1).strip())
            measure_time = float(match.group(2).strip()) / 2
            measure_count = float(match.group(3).strip())
            visible_counts_raw = match.group(4).strip()

            logging.debug(f"[Step Counter] Parsed components - one_time: {one_time}, measure_time: {measure_time}, "
                        f"measure_count: {measure_count}, visibleCounts: {visible_counts_raw}")

            # Parse the visibleCounts array
            if visible_counts_raw.startswith('[') and visible_counts_raw.endswith(']'):
                visible_counts = [int(num.strip()) for num in visible_counts_raw[1:-1].split(',')]
            else:
                raise ValueError(f"Invalid visibleCounts format: {visible_counts_raw}")

            # Assign parsed step_counter
            processed["step_counter"] = {
                "one_time": one_time,
                "measure_time": measure_time,
                "measure_count": measure_count,
                "visibleCounts": visible_counts,
            }
        except (ValueError, TypeError) as e:
            logging.error(f"[Step Counter] Invalid format for move '{move_name}': {step_counter}. Error: {e}")
            processed["step_counter"] = None

    else:
        logging.warning(f"[Step Counter] No step_counter defined for move '{move_name}'.")

    return processed

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

    return response

@app.route('/<dance_type>/')
def playlist(dance_type):
    """
    Render the HTML page for the given dance type.
    """
    valid_dance_types = ['salsa', 'bachata', 'casino', 'ecs', 'wcs']
    
    # Validate dance type
    if dance_type.lower() not in valid_dance_types:
        logging.error(f"Unsupported dance type: {dance_type}")
        return f"Dance type '{dance_type}' not supported!", 404

    # Render the page; data will be fetched via the API
    return render_template('moves.html', dance_type=dance_type.lower())

@app.route('/api/moves/<dance_type>')
def get_moves(dance_type):
    """
    API endpoint to provide moves and playlists for the given dance type in JSON format.
    """
    logging.debug(f"Fetching moves for dance type: {dance_type}")

    # Google Sheets CSV export URLs for each dance type
    sheet_urls = {
        'salsa': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=886932256",
        'bachata': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=232533163",
        'casino': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=617690693",
        'ecs': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=350828170",
        'wcs': "https://docs.google.com/spreadsheets/d/1yy3e6ImtEXoaVS-4tDP0_LQefCOXeDqWTAaV_BO__hY/export?format=csv&gid=2088273102",
    }

    # Validate dance type
    sheet_url = sheet_urls.get(dance_type.lower())
    if not sheet_url:
        logging.error(f"Unsupported dance type: {dance_type}")
        return jsonify({"error": "Unsupported dance type. Available types are: salsa, bachata, casino, ecs, wcs"}), 404

    # Fetch the data
    data = fetch_sheet_data(sheet_url)
    if data.empty:
        logging.error(f"No data available for dance type: {dance_type}")
        return jsonify({"error": f"No data available for dance type '{dance_type}'!"}), 500

    # Detect playlist columns
    playlist_columns = [
        col for col in data.columns if col not in fixed_columns and not col.startswith('-')
    ]
    logging.debug(f"Detected playlist columns: {playlist_columns}")

    # Generate playlist tags
    data['playlist_tags'] = data.apply(
        lambda move_row: generate_playlist_tags(move_row, playlist_columns), axis=1
    )

    # Process each row using `process_row`
    data = pd.DataFrame(data.apply(process_row, axis=1).tolist())

    # Replace NaN values with empty strings for JSON compatibility
    sanitized_data = data.fillna("")  # Use empty strings for missing values

    response = {
        "moves": sanitized_data.to_dict('records'),
        "playlists": [col for col in playlist_columns],
    }
    return jsonify(response)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
