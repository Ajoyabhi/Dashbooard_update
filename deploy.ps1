# Function to ensure logs directory exists
function Ensure-LogsDirectory {
    if (-not (Test-Path "src/logs")) {
        Write-Host "Creating logs directory..."
        New-Item -ItemType Directory -Path "src/logs" -Force
    }
}

# Function to check if .env file exists and is valid
function Check-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Host "Error: .env file not found"
        exit 1
    }

    # Check if file has content
    if ((Get-Item ".env").Length -eq 0) {
        Write-Host "Error: .env file is empty"
        exit 1
    }
}

# Function to build frontend
function Build-Frontend {
    Write-Host "Building frontend..."
    Set-Location frontend
    
    # Install dependencies
    npm install
    
    # Build
    npm run build
    
    Set-Location ..
}

# Function to start the server
function Start-Server {
    Write-Host "Starting server..."
    pm2 start src/app.js --name "payment-gateway-api" --env production
}

# Function to start the callback worker
function Start-CallbackWorker {
    Write-Host "Starting callback worker..."
    pm2 start src/workers/callback.worker.js --name "payment-gateway-callback-worker" --env production
}

# Function to start the frontend
function Start-Frontend {
    Write-Host "Starting frontend..."
    pm2 start ecosystem.config.js --only payment-gateway-frontend
}

# Function to stop all processes
function Stop-All {
    Write-Host "Stopping all processes..."
    pm2 stop all
    pm2 delete all
}

# Function to restart all processes
function Restart-All {
    Write-Host "Restarting all processes..."
    pm2 restart all
}

# Function to show status
function Show-Status {
    Write-Host "Showing status..."
    pm2 status
}

# Function to save PM2 process list
function Save-Pm2List {
    Write-Host "Saving PM2 process list..."
    pm2 save
}

# Main script
$Command = $args[0]

switch ($Command) {
    "start" {
        Check-EnvFile
        Ensure-LogsDirectory
        Stop-All
        Build-Frontend
        Start-Server
        Start-CallbackWorker
        Start-Frontend
        Save-Pm2List
        Show-Status
    }
    "stop" {
        Stop-All
        Write-Host "All processes stopped successfully"
    }
    "restart" {
        Restart-All
        Show-Status
    }
    "status" {
        Show-Status
    }
    default {
        Write-Host "Usage: .\deploy.ps1 {start|stop|restart|status}"
        exit 1
    }
} 