# POC Next - Frontend

Next.js frontend for the POC EDC Dashboard.

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local if needed
   ```

3. **Run development server:**
   ```bash
   pnpm dev
   ```

The app will be available at: http://localhost:3001

## Prerequisites

- Node.js >= 18.19.1
- pnpm (recommended) or npm
- Backend API running on http://localhost:5001

## Tech Stack

- **Framework:** Next.js 16.2.4 (App Router)
- **React:** 19.2.4
- **TypeScript:** 5.9.3
- **Styling:** Tailwind CSS 4.2.2
- **UI Components:** Radix UI + Custom
- **Icons:** Lucide React
- **HTTP Client:** Fetch API

## Environment Variables

See `.env.example` for all variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:5001)

## Development

```bash
pnpm dev      # Run dev server (port 3001)
pnpm build    # Build for production
pnpm start    # Run production server
pnpm lint     # Lint code
```
