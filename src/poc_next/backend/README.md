# POC Next - Backend API

FastAPI backend for the POC Next.js Dashboard.

## Overview

This backend provides REST API endpoints for managing Tractus-X EDC operations:
- **Phase 1:** Connectivity checks, pod status, trust verification
- **Phase 2:** Assets (CRUD operations)
- **Phase 3:** Policies (CRUD operations)  
- **Phase 4:** Contract Definitions (CRUD operations)
- **Phase 5:** TBD
- **Phase 6:** Catalog, negotiations, transfers, EDR, file download

## Tech Stack

- **Framework:** FastAPI 0.115.0
- **Server:** Uvicorn (ASGI)
- **HTTP Client:** httpx (async)
- **Validation:** Pydantic v2
- **Python:** 3.11+

## Quick Start

1. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run the server:**
   ```bash
   ./start.sh
   # Or manually:
   python -m uvicorn poc_next.backend.main:app --reload --host 0.0.0.0 --port 5001
   ```

The API will be available at: http://localhost:5001

## API Documentation

Once running, visit:
- **Swagger UI:** http://localhost:5001/docs
- **ReDoc:** http://localhost:5001/redoc

## Frontend Integration

This backend is designed to work with the Next.js frontend in `../frontend/`.

The Next.js app should be configured to call this API at:
```
NEXT_PUBLIC_API_URL=http://localhost:5001
```

## Development

### Project Structure

```
backend/
├── api/
│   └── routes/          # API endpoint definitions
│       ├── phase1.py    # Connectivity & infrastructure
│       ├── phase2.py    # Assets
│       ├── phase3.py    # Policies
│       ├── phase4.py    # Contract Definitions
│       ├── phase5.py    # TBD
│       └── phase6.py    # Data space flow
├── clients/
│   ├── edc.py          # EDC Management API client
│   └── kubectl.py      # Kubernetes client
├── services/
│   └── kubectl.py      # Kubectl service layer
├── main.py             # FastAPI app entry point
├── config.py           # Settings & configuration
└── requirements.txt    # Python dependencies
```

### CORS Configuration

CORS is configured to allow:
- `http://localhost:3001` (Next.js dev server)
- `http://127.0.0.1:3001`

Update `main.py` for production deployments.

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `APP_PORT=5001` - Backend server port
- `MASS_MANAGEMENT_URL` - MASS EDC Management API
- `IKLN_MANAGEMENT_URL` - IKLN EDC Management API
- `KUBECONFIG_PATH` - Path to kubeconfig file

## Testing

```bash
# Run tests (when implemented)
pytest

# Run with coverage
pytest --cov=poc_next.backend
```

## Notes

- This backend is independent from `src/poc` - it uses port 5001 instead of 5000
- No static file serving - all frontend assets are served by Next.js
- Designed to be consumed by the Next.js frontend only
