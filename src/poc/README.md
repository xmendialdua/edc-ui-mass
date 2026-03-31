# POC Dashboard - EDC Management Console

This is a proof-of-concept implementation of the EDC Dashboard using **FastAPI** and modern Python patterns, based on the ESSAD architecture.

## Overview

POC Dashboard is a web-based management console for Eclipse Tractus-X EDC (Eclipse Dataspace Connector) operations. The application is organized into three separate interfaces:

### 🏠 **index.html** - Home & Infrastructure
Main dashboard with navigation to specialized interfaces:
- **Arquitectura del Data Space**: Visual overview of the data space components
- **Phase 1**: Infrastructure verification (connectivity, pods, DID configuration, trust)

### 🔧 **data-management.html** - Provider Operations
Interface for data space managers (MASS connector):
- **Phase 2**: Asset management (create, list, delete assets)
- **Phase 3**: Policy definitions (access and contract policies)
- **Phase 4**: Contract definitions (linking assets and policies)

### 📊 **data-query.html** - Consumer Operations
Interface for data space consumers (partner connectors like IKLN):
- **Phase 6**: Complete consumer workflow
  - Catalog discovery (browsing available datasets)
  - Contract negotiation (requesting access to assets)
  - Data transfer (downloading assets once contracts are finalized)

## Architecture

The application follows a clean, layered architecture inspired by ESSAD:

```
src/poc/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration management
├── api/
│   └── routes/          # API route handlers (phase1-6)
├── clients/
│   └── edc.py           # EDC Management API client
├── services/
│   └── kubectl.py       # Kubernetes operations
└── static/
    ├── index.html               # 🏠 Home page (Architecture + Phase 1)
    ├── data-management.html     # 🔧 Provider interface (Phase 2, 3, 4)
    ├── data-query.html          # 📊 Consumer interface (Phase 6)
    ├── dashboard.js             # Frontend logic (shared)
    ├── config.json              # Partner configuration
    └── logo-mondragon.svg       # Branding assets
```

### Application Flow

1. **Start at Home (`index.html`)**
   - View data space architecture
   - Verify infrastructure prerequisites
   - Navigate to provider or consumer interface
   
2. **Provider Workflow (`data-management.html`)**
   - Publish assets to the data space catalog
   - Define access and usage policies
   - Create contract definitions for partners
   
3. **Consumer Workflow (`data-query.html`)**
   - Discover available assets in provider catalogs
   - Negotiate contracts for asset access
   - Transfer and download authorized data

### Key Differences from Original Dashboard

- **Framework**: FastAPI instead of Flask
- **Architecture**: Layered design with separation of concerns
- **Async I/O**: Fully asynchronous operations
- **Type Safety**: Pydantic models for request/response validation
- **Standards**: Follows ESSAD patterns and best practices

## Installation

### Quick Setup (Recommended)

The `start.sh` script handles everything automatically:

```bash
cd src/poc
./start.sh
```

This will:
- Create a virtual environment if it doesn't exist
- Install all dependencies
- Configure the environment
- Start the server

### Manual Setup

If you prefer to set up manually:

### 1. Create a virtual environment

```bash
cd src/poc
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your connector credentials
```

### 4. Configure partners (optional)

Edit `static/config.json` to add dataspace partners.

## Running the Application

### Quick Start (Recommended)

Use the provided shell scripts for easy startup and shutdown:

```bash
# Start the dashboard
./start.sh

# Stop the dashboard (from another terminal)
./stop.sh
```

The `start.sh` script will:
- Check Python installation and dependencies
- **Create a virtual environment automatically if missing**
- Verify/create `.env` configuration
- Detect KUBECONFIG location
- Install missing dependencies
- Start the server with auto-reload
- Open the dashboard in your browser

The dashboard will be available at: **http://localhost:5000**

### Manual Execution

#### Development mode (with auto-reload)

```bash
python -m poc.main
```

Or using uvicorn directly:

```bash
uvicorn poc.main:app --reload --host 0.0.0.0 --port 5000
```

#### Production mode

```bash
uvicorn poc.main:app --host 0.0.0.0 --port 5000
```

## Usage Guide

### Overview of Interfaces

The POC Dashboard is organized into three specialized interfaces accessible through the web browser:

#### 🏠 Home Page (index.html)
**URL**: http://localhost:5000

- **Purpose**: Entry point and infrastructure overview
- **Users**: Data space administrators and operators
- **Features**:
  - Visual diagram of data space architecture
  - Phase 1: Infrastructure verification (API connectivity, pod status, DID configuration, trust relationships)
  - Navigation to provider and consumer interfaces

#### 🔧 Data Management Interface (data-management.html)
**URL**: http://localhost:5000/data-management.html

- **Purpose**: Provider operations for publishing data
- **Users**: Data providers (MASS connector operators)
- **Workflow**:
  1. **Phase 2 - Asset Publication**: Create and manage assets representing data offerings
  2. **Phase 3 - Policy Configuration**: Define access and usage policies with BPN-based restrictions
  3. **Phase 4 - Contract Definition**: Link assets with policies to make them discoverable

#### 📊 Data Query Interface (data-query.html)
**URL**: http://localhost:5000/data-query.html

- **Purpose**: Consumer operations for accessing provider data
- **Users**: Data consumers (IKLN or other partner connectors)
- **Workflow**:
  1. **Catalog Discovery**: Browse available datasets from providers
  2. **Contract Negotiation**: Request access to specific assets
  3. **Data Transfer**: Download data once contracts are finalized
  4. **Monitoring**: Track negotiation and transfer status

### Typical Workflows

#### Provider Workflow (Publishing Data)
1. Start at **Home** → verify infrastructure (Phase 1)
2. Navigate to **Data Management**
3. Create an asset (Phase 2)
4. Create access and contract policies (Phase 3)
5. Create contract definition linking asset to policies (Phase 4)
6. Asset is now discoverable by authorized partners

#### Consumer Workflow (Accessing Data)
1. Start at **Home** → verify infrastructure (Phase 1)
2. Navigate to **Data Query**
3. Request catalog from provider (discover available assets)
4. Select an asset and initiate contract negotiation
5. Monitor negotiation until it reaches FINALIZED state
6. Initiate data transfer once contract is finalized
7. Download the data from the EDR (Endpoint Data Reference)

## API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **OpenAPI JSON**: http://localhost:5000/openapi.json

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key settings:

- `APP_PORT`: Server port (default: 5000)
- `MASS_MANAGEMENT_URL`: MASS connector Management API URL
- `MASS_API_KEY`: API key for MASS connector
- `IKLN_MANAGEMENT_URL`: IKLN connector Management API URL
- `IKLN_API_KEY`: API key for IKLN connector
- `KUBECONFIG_PATH`: Path to kubeconfig file (optional)

### Dataspace Partners

Configure available BPNs in `static/config.json`:

```json
{
  "dataspace_partners": [
    {
      "bpn": "BPNL00000002IKLN",
      "name": "IKERLAN",
      "description": "IKERLAN Technology Centre"
    }
  ]
}
```

## API Endpoints

### Phase 1 - Infrastructure
- `POST /api/phase1/check-connectivity` - Check EDC connectivity
- `POST /api/phase1/check-pods` - Verify Kubernetes pods
- `POST /api/phase1/check-trust` - Verify trust relationships
- `POST /api/phase1/check-did-configuration` - Check DID config
- `POST /api/phase1/seed-partners` - Seed business partners

### Phase 2 - Assets
- `POST /api/phase2/create-asset` - Create new asset
- `POST /api/phase2/list-assets` - List all assets
- `POST /api/phase2/delete-asset` - Delete an asset

### Phase 3 - Policies
- `POST /api/phase3/create-access-policy` - Create access policy
- `POST /api/phase3/create-contract-policy` - Create contract policy
- `POST /api/phase3/list-policies` - List all policies
- `POST /api/phase3/delete-policy` - Delete a policy

### Phase 4 - Contract Definitions
- `POST /api/phase4/create-contract-definition` - Create contract definition
- `POST /api/phase4/list-contract-definitions` - List all contracts
- `POST /api/phase4/delete-contract-definition` - Delete a contract

### Phase 5 - Catalog
- `POST /api/phase5/catalog-request` - Request remote catalog

### Phase 6 - Negotiations & Transfers
- `POST /api/phase6/catalog-request` - Request catalog
- `POST /api/phase6/negotiate-asset` - Initiate negotiation
- `GET /api/phase6/list-negotiations` - List negotiations
- `POST /api/phase6/initiate-transfer-for-contract` - Start transfer
- `GET /api/phase6/list-transfers` - List transfers
- `POST /api/phase6/download-file` - Download data
- `GET /api/phase6/debug-transfer/{id}` - Debug transfer
- `GET /api/phase6/get-fresh-token/{id}` - Get fresh EDR token

## Development

### Project Structure

```
src/poc/
├── __init__.py
├── main.py                    # FastAPI app
├── config.py                  # Settings
├── requirements.txt
├── .env.example
├── README.md
│
├── api/
│   └── routes/
│       ├── __init__.py
│       ├── phase1.py          # Infrastructure routes
│       ├── phase2.py          # Asset routes
│       ├── phase3.py          # Policy routes
│       ├── phase4.py          # Contract routes
│       ├── phase5.py          # Catalog routes
│       └── phase6.py          # Negotiation & transfer routes
│
├── clients/
│   ├── __init__.py
│   └── edc.py                 # EDC API client
│
├── services/
│   ├── __init__.py
│   └── kubectl.py             # Kubernetes operations
│
└── static/
    ├── index.html             # Frontend
    ├── dashboard.js           # Frontend logic
    ├── config.json            # Partners config
    └── logo-mondragon.svg     # Logo
```

### Adding New Endpoints

1. Create a new route in the appropriate phase file
2. Use FastAPI decorators and Pydantic models
3. Follow the existing pattern for logs and responses
4. Test using the interactive docs at `/docs`

### Testing

```bash
# Run tests (if available)
pytest

# Test individual endpoints
curl -X POST http://localhost:5000/api/phase1/check-connectivity
```

## Troubleshooting

### Connection Errors

- Verify EDC connector URLs are correct
- Check API keys are valid
- Ensure network connectivity to EDC connectors

### Kubernetes Errors

- Verify `kubeconfig` path is set correctly
- Check kubectl is installed and accessible
- Confirm namespace exists

### EDR Not Available

- EDRs are only available for transfers in states: STARTED, COMPLETED, TERMINATED
- Wait 5-30 seconds after initiating transfer
- Use "Refresh Status" button to update transfer state

## License

Apache 2.0

## Credits

Based on the original EDC Dashboard and ESSAD architecture patterns developed by IKERLAN.
