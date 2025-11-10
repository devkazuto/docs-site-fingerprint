#!/bin/bash

# Fingerprint Service Documentation Deployment Script
# This script builds and deploys the documentation to a remote server

set -e  # Exit on error

# Configuration
REMOTE_USER="${DEPLOY_USER:-user}"
REMOTE_HOST="${DEPLOY_HOST:-your-server.com}"
REMOTE_PATH="${DEPLOY_PATH:-/var/www/fingerprint-docs}"
BACKUP_PATH="${REMOTE_PATH}.backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required commands exist
check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        log_error "ssh is not installed"
        exit 1
    fi
    
    if ! command -v rsync &> /dev/null; then
        log_error "rsync is not installed"
        exit 1
    fi
    
    log_info "All requirements met"
}

# Build documentation
build_docs() {
    log_info "Building documentation..."
    
    npm run build
    
    if [ ! -d "build" ]; then
        log_error "Build directory not found"
        exit 1
    fi
    
    log_info "Build completed successfully"
}

# Create backup on remote server
create_backup() {
    log_info "Creating backup on remote server..."
    
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "
        if [ -d ${REMOTE_PATH} ]; then
            cp -r ${REMOTE_PATH} ${BACKUP_PATH}
            echo 'Backup created'
        else
            echo 'No existing deployment to backup'
        fi
    "
}

# Deploy to remote server
deploy() {
    log_info "Deploying to ${REMOTE_HOST}..."
    
    # Create remote directory if it doesn't exist
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_PATH}"
    
    # Sync files
    rsync -avz --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.DS_Store' \
        build/ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
    
    log_info "Files synced successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    if ssh "${REMOTE_USER}@${REMOTE_HOST}" "test -f ${REMOTE_PATH}/index.html"; then
        log_info "Deployment verified successfully"
        return 0
    else
        log_error "Deployment verification failed"
        return 1
    fi
}

# Rollback deployment
rollback() {
    log_warn "Rolling back deployment..."
    
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "
        if [ -d ${BACKUP_PATH} ]; then
            rm -rf ${REMOTE_PATH}
            mv ${BACKUP_PATH} ${REMOTE_PATH}
            echo 'Rollback completed'
        else
            echo 'No backup found for rollback'
        fi
    "
}

# Cleanup backup
cleanup_backup() {
    log_info "Cleaning up backup..."
    
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "
        if [ -d ${BACKUP_PATH} ]; then
            rm -rf ${BACKUP_PATH}
            echo 'Backup removed'
        fi
    "
}

# Main deployment process
main() {
    log_info "Starting deployment process..."
    
    # Check requirements
    check_requirements
    
    # Build documentation
    build_docs
    
    # Create backup
    create_backup
    
    # Deploy
    deploy
    
    # Verify
    if verify_deployment; then
        log_info "Deployment successful!"
        cleanup_backup
    else
        log_error "Deployment failed!"
        rollback
        exit 1
    fi
    
    log_info "Deployment process completed"
}

# Run main function
main
