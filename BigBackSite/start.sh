#!/bin/bash
# Vytryx Fitness Tracker - Startup Script

# Navigate to application directory
cd "$(dirname "$0")"

# Set NODE_ENV to production if not set
export NODE_ENV=${NODE_ENV:-production}

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Ensure data directory exists
mkdir -p data

# Check if database exists, if not run setup
if [ ! -f "data/vytryx.db" ]; then
  echo "Database not found. Running initial setup..."
  node setup.js
  
  # Check if setup was successful
  if [ $? -ne 0 ]; then
    echo "Setup failed. Exiting."
    exit 1
  fi
fi

# Start the application
echo "Starting Vytryx Fitness Tracker..."
echo "Application will be available at http://localhost:${PORT:-3000}"

# Use forever if available, otherwise use node directly
if command -v forever &> /dev/null; then
  forever start app.js
else
  node app.js
fi