#!/bin/bash
# Start POC Next Backend API

echo "🚀 Starting POC Next Backend API..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✏️  Please edit .env with your configuration"
fi

echo ""
echo "✅ Backend ready!"
echo "🌐 Starting server on http://localhost:5001"
echo ""

# Run the server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 5001
