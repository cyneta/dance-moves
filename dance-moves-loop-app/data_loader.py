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
