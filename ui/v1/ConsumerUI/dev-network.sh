#!/bin/bash

# Check if the 'kind' network exists
if ! docker network ls | grep -q "kind"; then
  echo "Creating 'kind' network for development..."
  docker network create kind
else
  echo "'kind' network already exists."
fi

# Build and start the development container
docker-compose -f docker-compose.dev.yml up --build

