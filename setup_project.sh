#!/bin/bash

# Project root directory
PROJECT_ROOT="dance-app"

# Create the folder structure
echo "Creating project folders..."
mkdir -p $PROJECT_ROOT/{data,templates,static}

# Create and populate data files
echo "Creating sample data files..."
cat > $PROJECT_ROOT/data/salsa_moves.csv <<EOL
move_code,move_name,move_type,video_id,start_time,end_time,difficulty
ENCB,Enchufa w CBL,PATTERN,wgx1zS7dqTg,,5,3
RCBT,Reverse Cross Body Turn,MOVE,Z0-iEKkzMKg,,10,4
BSCW,Basics workout,MOVE,Ns5TaVGv6uY,,2,1
CPCP,Change of Place w CBL,MOVE,vvMfFNZSn_s,,8,3
EOL

cat > $PROJECT_ROOT/data/bachata_moves.csv <<EOL
move_code,move_name,move_type,video_id,start_time,end_time,difficulty
BSS,Basic Step,MOVE,abcdefgh12,,3,1
TTN,Turn to the Left,MOVE,hijklmnop34,,4,2
CBL,Modified Cross Body Lead,PATTERN,qrstuvwxyz56,,6,4
EOL

# Create and populate Python files
echo "Creating Python files..."
cat > $PROJECT_ROOT/app.py <<EOL
from flask import Flask, render_template
import pandas as pd

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/moves/<dance>')
def moves(dance):
    file_path = f"data/{dance}_moves.csv"
    try:
        data = pd.read_csv(file_path)
        moves = data[data['move_type'] == 'MOVE']
        patterns = data[data['move_type'] == 'PATTERN']
        return render_template('moves.html', moves=moves.to_dict('records'), patterns=patterns.to_dict('records'))
    except FileNotFoundError:
        return f"No data found for {dance.capitalize()}!"

if __name__ == "__main__":
    app.run(debug=True)
EOL

cat > $PROJECT_ROOT/data_loader.py <<EOL
import pandas as pd

# Load CSV data
def load_moves(file_path):
    try:
        return pd.read_csv(file_path)
    except Exception as e:
        print(f"Error loading file {file_path}: {e}")
        return None

# Filter data
def filter_data(data, move_type=None, difficulty=None):
    if move_type:
        data = data[data['move_type'] == move_type]
    if difficulty:
        data = data[data['difficulty'] == difficulty]
    return data

# Example usage
if __name__ == "__main__":
    file_path = "data/salsa_moves.csv"
    data = load_moves(file_path)
    if data is not None:
        print("All Moves:")
        print(data)
EOL

# Create HTML templates
echo "Creating HTML templates..."
cat > $PROJECT_ROOT/templates/home.html <<EOL
<!DOCTYPE html>
<html>
<head>
    <title>Dance App</title>
</head>
<body>
    <h1>Welcome to the Dance App</h1>
    <p>Select a dance type to explore moves and patterns:</p>
    <ul>
        <li><a href="/moves/salsa">Salsa</a></li>
        <li><a href="/moves/bachata">Bachata</a></li>
    </ul>
</body>
</html>
EOL

cat > $PROJECT_ROOT/templates/moves.html <<EOL
<!DOCTYPE html>
<html>
<head>
    <title>Moves and Patterns</title>
</head>
<body>
    <h1>Moves and Patterns</h1>
    <h2>Moves</h2>
    <ul>
        {% for move in moves %}
        <li>{{ move.move_name }} (Difficulty: {{ move.difficulty }})</li>
        {% endfor %}
    </ul>
    <h2>Patterns</h2>
    <ul>
        {% for pattern in patterns %}
        <li>{{ pattern.move_name }} (Difficulty: {{ pattern.difficulty }})</li>
        {% endfor %}
    </ul>
</body>
</html>
EOL

# Create static CSS file
echo "Creating static CSS..."
cat > $PROJECT_ROOT/static/style.css <<EOL
body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
}
h1, h2 {
    color: #333;
}
ul {
    list-style-type: none;
    padding: 0;
}
ul li {
    margin: 5px 0;
}
EOL

# Finish
echo "Setup complete! Your project structure is ready in the '$PROJECT_ROOT' folder."
