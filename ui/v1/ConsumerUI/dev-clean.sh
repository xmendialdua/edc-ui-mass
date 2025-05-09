#!/bin/bash

# Stop containers and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove node_modules
rm -rf node_modules

# Rebuild and start the development container
docker-compose -f docker-compose.dev.yml up --build

