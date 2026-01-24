#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored status messages
echo_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

# Check Python
if ! command_exists python; then
    echo_warning "Python not found. Please install Python 3.11 or later"
    exit 1
fi

# Check Node.js
if ! command_exists node; then
    echo_warning "Node.js not found. Please install Node.js 16 or later"
    exit 1
fi

# Check PostgreSQL
if ! command_exists psql; then
    echo_warning "PostgreSQL not found. Please install PostgreSQL"
    exit 1
fi

# Create and activate virtual environment
if [ ! -d "venv" ]; then
    echo_status "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment (with cross-platform support)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install backend dependencies
echo_status "Installing backend dependencies..."
cd attendance_backend
pip install -r requirements.txt

# Start backend server in background
echo_status "Starting backend server..."
python -m uvicorn src.main:app --reload &
BACKEND_PID=$!

# Go back to root directory
cd ../frontend

# Install frontend dependencies
echo_status "Installing frontend dependencies..."
npm install

# Start frontend
echo_status "Starting frontend server..."
npm run dev

# Cleanup function
cleanup() {
    echo_status "Cleaning up..."
    kill $BACKEND_PID
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait