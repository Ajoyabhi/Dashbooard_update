#!/bin/bash

# Exit on error
set -e

# Function to ensure logs directory exists
ensure_logs_directory() {
    if [ ! -d "src/logs" ]; then
        echo "Creating logs directory..."
        mkdir -p src/logs
    fi
}

# Function to check if .env file exists and is valid
check_env_file() {
    if [ ! -f ".env" ]; then
        echo "Error: .env file not found"
        exit 1
    fi

    # Check if file has content
    if [ ! -s ".env" ]; then
        echo "Error: .env file is empty"
        exit 1
    fi
}

# Function to build frontend
build_frontend() {
    echo "Checking frontend build..."
    cd frontend
    
    # Check if dist directory exists and has content
    if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
        echo "Frontend build already exists, skipping build..."
    else
        echo "Building frontend..."
        # Install dependencies
        npm install
        
        # Build
        npm run build
    fi
    
    cd ..
}

# Function to start the server
start_server() {
    echo "Starting server..."
    pm2 start src/app.js --name "payment-gateway-api" --env production
}

# Function to start the callback worker
start_callback_worker() {
    echo "Starting callback worker..."
    pm2 start src/workers/callback.worker.js --name "payment-gateway-callback-worker" --env production
}

# Function to start the frontend
start_frontend() {
    echo "Starting frontend..."
    pm2 start ecosystem.config.js --only payment-gateway-frontend
}

# Function to stop all processes
stop_all() {
    echo "Stopping all processes..."
    pm2 stop all || true
    pm2 delete all || true
}

# Function to restart all processes
restart_all() {
    echo "Restarting all processes..."
    pm2 restart all
}

# Function to show status
show_status() {
    echo "Showing status..."
    pm2 status
}

# Function to save PM2 process list
save_pm2_list() {
    echo "Saving PM2 process list..."
    pm2 save
}

# Main script
COMMAND=$1

case $COMMAND in
    "start")
        check_env_file
        ensure_logs_directory
        stop_all
        build_frontend
        start_server
        start_callback_worker
        start_frontend
        save_pm2_list
        show_status
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        show_status
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: ./deploy.sh {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0 