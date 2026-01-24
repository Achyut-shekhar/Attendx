import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, inspect
from src.core.config import DATABASE_URL

def check():
    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('attendance_sessions')]
        print(f"Columns in attendance_sessions: {columns}")
        
        has_lat = 'latitude' in columns
        has_lon = 'longitude' in columns
        has_rad = 'radius_meters' in columns
        
        print(f"Has latitude: {has_lat}")
        print(f"Has longitude: {has_lon}")
        print(f"Has radius_meters: {has_rad}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
