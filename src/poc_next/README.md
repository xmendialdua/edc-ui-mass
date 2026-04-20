# POC Next

Modern EDC Dashboard built with Next.js + FastAPI.

## Overview

This is a complete rewrite of `src/poc` using modern web technologies:
- **Backend:** FastAPI (Python) - Port 5001
- **Frontend:** Next.js 16 + TypeScript - Port 3001

## Quick Start

### 1. Start Backend

```bash
cd backend
./start.sh
```

Backend will be available at: http://localhost:5001

### 2. Start Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend will be available at: http://localhost:3001

## Project Structure

```
poc_next/
├── backend/              # FastAPI backend
│   ├── api/             # API routes (6 phases)
│   ├── clients/         # EDC, kubectl clients
│   ├── services/        # Business logic
│   ├── main.py          # FastAPI app
│   ├── config.py        # Settings
│   └── requirements.txt # Python dependencies
│
├── frontend/            # Next.js frontend
│   ├── app/            # Next.js pages
│   ├── components/     # React components
│   ├── lib/            # API client, types, utils
│   └── package.json    # Node dependencies
│
└── README.md           # This file
```

## Development Status

### ✅ Phase 1: Setup Complete

- [x] Backend FastAPI structure
- [x] Frontend Next.js structure
- [x] API client configuration
- [x] Basic UI components (Button, Card)
- [x] TypeScript types
- [x] Connection test page

### 📋 Phase 2: Dashboard (Next)

- [ ] Accordion component
- [ ] Phase 1-6 panels
- [ ] Logs panel
- [ ] Header with status

### 📋 Future Phases

- [ ] Phase 3: Data Management page
- [ ] Phase 4: Data Publication page
- [ ] Phase 5: Data Query page
- [ ] Phase 6: Partner Data page
- [ ] Phase 7: Polish & optimization

## Tech Stack

**Backend:**
- FastAPI 0.115.0
- Python 3.11+
- httpx, Pydantic

**Frontend:**
- Next.js 16.2.4
- React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.2.2
- Radix UI
- Lucide React

## Testing

### Test Backend

```bash
curl http://localhost:5001/health
```

Expected response:
```json
{"status": "healthy"}
```

### Test Frontend

Open http://localhost:3001 in your browser.
Click "Test Connection" button - should show "Connected" status.

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## Notes

- This project is independent from `src/poc` (original POC)
- Uses different ports to avoid conflicts (5001 backend, 3001 frontend)
- All dependencies are self-contained
