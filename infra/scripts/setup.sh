#!/bin/bash

set -e

echo "Setting up CleanAI MVP..."

# Install pnpm if not installed
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build packages
echo "Building shared packages..."
pnpm --filter "@cleanai/schemas" build
pnpm --filter "@cleanai/shared" build

echo "Setup complete!"
echo "Run 'docker-compose -f infra/docker-compose/docker-compose.yml up' to start services"