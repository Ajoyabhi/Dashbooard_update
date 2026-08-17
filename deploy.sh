#!/bin/bash

# Exit on error
set -e

# Generate unique instance identifier
INSTANCE_ID=$(date +%Y%m%d_%H%M%S)
INSTANCE_NAME="payment-gateway-v2-${INSTANCE_ID}"

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
    echo "Building frontend..."
    cd frontend
    
    # Install dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    # Build the frontend
    echo "Building frontend for production..."
    npm run build
    
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

# Function to start the payin reconciliation worker
start_reconciliation_worker() {
    echo "Starting payin reconciliation worker..."
    pm2 start src/workers/payinReconciliation.worker.js --name "payment-gateway-payin-reconciliation" --env production
}

# Function to start the commission report worker
start_commission_report_worker() {
    echo "Starting commission report worker..."
    pm2 start src/workers/commissionReport.worker.js --name "payment-gateway-commission-report" --env production
}

# Function to start the frontend (using built version)
start_frontend() {
    echo "Starting frontend (production build)..."
    pm2 start ecosystem.config.js --only payment-gateway-frontend
}

# Function to start new instance server
start_new_server() {
    echo "Starting new server instance..."
    pm2 start src/app.js --name "${INSTANCE_NAME}-server" --env production --env PORT=3004
}

# Function to start new instance worker
start_new_worker() {
    echo "Starting new worker instance..."
    pm2 start src/workers/callback.worker.js --name "${INSTANCE_NAME}-worker" --env production
}

# Function to start new instance payin reconciliation worker
start_new_reconciliation_worker() {
    echo "Starting new payin reconciliation worker instance..."
    pm2 start src/workers/payinReconciliation.worker.js --name "${INSTANCE_NAME}-payin-reconciliation" --env production
}

# Function to start new instance frontend (using built version)
start_new_frontend() {
    echo "Starting new frontend instance (production build)..."
    
    # Check if frontend is built
    if [ ! -d "frontend/dist" ] || [ ! "$(ls -A frontend/dist)" ]; then
        echo "Frontend not built. Building first..."
        build_frontend
    fi
    
    # Start using PM2 serve for the built frontend
    pm2 start "serve frontend/dist -l 3005" --name "${INSTANCE_NAME}-frontend"
    
    # Wait a moment and check if it started successfully
    sleep 3
    if pm2 show "${INSTANCE_NAME}-frontend" | grep -q "errored"; then
        echo "Frontend failed to start. Check logs with: pm2 logs ${INSTANCE_NAME}-frontend"
        return 1
    fi
}

# Function to restart only frontend
restart_frontend() {
    echo "Restarting frontend only..."
    
    # Clean up any errored instances first
    pm2 delete payment-gateway-v2-*-frontend 2>/dev/null || true
    
    # Build frontend if needed
    build_frontend
    
    # Start new frontend with current timestamp
    INSTANCE_NAME="payment-gateway-v2-$(date +%Y%m%d_%H%M%S)"
    
    if start_new_frontend; then
        echo "Frontend restarted successfully!"
        echo "Check status with: pm2 status"
        echo "Check ports with: netstat -tlnp | grep 3005"
    else
        echo "Frontend failed to start. Check the logs above for errors."
        echo "You can also try: pm2 logs ${INSTANCE_NAME}-frontend"
    fi
}

# Function to stop all processes
stop_all() {
    echo "Stopping all processes..."
    pm2 stop all || true
    pm2 delete all || true
}

# Function to restart only this app's processes
restart_all() {
    echo "Restarting app processes..."
    for proc in payment-gateway-api payment-gateway-callback-worker payment-gateway-payin-reconciliation payment-gateway-commission-report payment-gateway-frontend; do
        if pm2 show "$proc" &>/dev/null; then
            pm2 restart "$proc"
        else
            echo "$proc not running, skipping"
        fi
    done
    # Also restart any active v2 deploy instances
    pm2 jlist 2>/dev/null | grep -o '"name":"payment-gateway-v2[^"]*"' | sed 's/"name":"//;s/"//' | while read -r name; do
        pm2 restart "$name"
    done
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
        start_reconciliation_worker
        start_commission_report_worker
        start_frontend
        save_pm2_list
        show_status
        ;;
    "deploy")
        echo "Starting deployment for instance: ${INSTANCE_NAME}"
        check_env_file
        ensure_logs_directory
        build_frontend
        start_new_server
        start_new_worker
        start_new_reconciliation_worker
        start_new_frontend
        save_pm2_list
        show_status
        echo "Deployment completed successfully for ${INSTANCE_NAME}!"
        echo "Access your app at: https://dashboard.payzutech.in"
        ;;
    "restart-frontend")
        restart_frontend
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
    "cleanup")
        echo "Cleaning up all payment gateway v2 instances..."
        pm2 stop payment-gateway-v2-* 2>/dev/null || true
        pm2 delete payment-gateway-v2-* 2>/dev/null || true
        pm2 save
        echo "Cleanup completed"
        ;;
    *)
        echo "Usage: ./deploy.sh {start|stop|restart|status|deploy|cleanup|restart-frontend}"
        echo ""
        echo "Commands:"
        echo "  start   - Start original services (port 3000, 3002)"
        echo "  deploy  - Deploy new instance (port 3004, 3005)"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  status  - Show PM2 status"
        echo "  cleanup - Clean up all payment gateway v2 instances"
        echo "  restart-frontend - Restart only the frontend (port 3005)"
        exit 1
        ;;
esac

exit 0 