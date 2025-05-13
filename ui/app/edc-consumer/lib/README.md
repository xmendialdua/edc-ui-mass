# Consumer Library

This folder will contain utility functions and API clients for the EDC Consumer interface.

## Planned Files

### api.ts

This file will contain functions for interacting with the EDC Consumer API:

#### Asset Discovery
- `discoverAssets()`: Discover available assets from providers
- `getAssetDetails(id)`: Get detailed information about an asset

#### Contract Negotiation
- `initiateContractNegotiation(assetId, offer)`: Initiate a contract negotiation
- `getContractNegotiations()`: Get all contract negotiations
- `getContractNegotiation(id)`: Get a specific contract negotiation
- `acceptContractOffer(id)`: Accept a contract offer

#### Data Transfer
- `initiateDataTransfer(contractId, assetId)`: Initiate a data transfer
- `getDataTransfers()`: Get all data transfers
- `getDataTransfer(id)`: Get a specific data transfer

## Current Status

This folder is currently empty as the Consumer interface is under development.
