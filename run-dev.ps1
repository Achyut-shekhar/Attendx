# Script to start both frontend and backend development servers
# Author: Achyut-shekhar
# Usage: ./run-dev.ps1

$ErrorActionPreference = "Stop"
$Green = @{ForegroundColor = "Green"}
$Yellow = @{ForegroundColor = "Yellow"}

# Function to write status messages
function Write-Status {
    param($Message)
    Write-Host "✓ $Message" @Green
}

function Write-Warning {
    param($Message)
    Write-Host "! $Message" @Yellow
}

# Function to check if a command exists
function Test-Command {
    param($Command)
    return [bool](Get-Command -Name $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..."

# Check Python
if (-not (Test-Command python)) {
    Write-Warning "Python not found. Please install Python 3.11 or later"
    exit 1
}

# Check Node.js
if (-not (Test-Command node)) {
    Write-Warning "Node.js not found. Please install Node.js 16 or later"
    exit 1
}

# Check if ports are available
$backendPort = 8000
$frontendPort = 5173

# Function to check if a port is in use
function Test-PortInUse {
    param($Port)
    $listener = $null
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $false
    }
    catch {
        return $true
    }
    finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

# Kill processes using our ports if necessary
foreach ($port in @($backendPort, $frontendPort)) {
    if (Test-PortInUse $port) {
        Write-Warning "Port $port is in use. Attempting to free it..."
        $processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

# Create and activate virtual environment
if (-not (Test-Path "venv")) {
    Write-Status "Creating Python virtual environment..."
    python -m venv venv
}

# Activate virtual environment
Write-Status "Activating virtual environment..."
.\venv\Scripts\Activate.ps1

# Install backend dependencies
Write-Status "Installing backend dependencies..."
Set-Location attendance_backend
pip install -r requirements.txt

# Start backend server in a new window
Write-Status "Starting backend server..."
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$pwd'; .\venv\Scripts\Activate.ps1; python -m uvicorn main:app --reload" -PassThru

# Return to root directory and install frontend dependencies
Set-Location ..
Write-Status "Installing frontend dependencies..."
npm install

# Start frontend
Write-Status "Starting frontend server..."
npm run dev

# Clean up when the script is terminated
$cleanupScript = {
    if ($backendProcess) {
        Stop-Process -Id $backendProcess.Id -Force
    }
}

# Register the cleanup script
Register-EngineEvent PowerShell.Exiting -Action $cleanupScript | Out-Null