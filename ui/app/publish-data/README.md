# Publish Data Module

This module contains the Publish Data interface for managing data publications through the EDC-MASS (Eclipse Dataspace Connector - MASS) connector.

## Overview

The Publish Data interface allows users to manage assets, policies, and contract definitions that are published to the EDC-MASS connector. It provides a user-friendly interface for creating, viewing, and deleting these resources. Unlike the Provider interface, this module uses a fixed connector address and always operates in live mode.

## Key Features

- Asset management (create, view, delete)
- Policy management (create, view, delete)
- Contract definition management (create, view, delete)
- API connectivity checking
- Language switching (English/Spanish)
- Fixed EDC-MASS connector (no manual connector address changes)
- View mode switching (Publicaciones/Contratos)

## Folder Structure

- `/assets`: Components for asset management
- `/policies`: Components for policy management
- `/contracts`: Components for contract management
- `/common`: Shared components (connectivity check dialog)
- `/dataapps`: Components for data applications (Flower, MLflow)
- `/lib`: API and utility functions

## Components

- `publish-data-header.tsx`: Custom header with view mode selector
- `assets/asset-form-dialog.tsx`: Dialog for creating new assets
- `policies/policy-form-dialog.tsx`: Dialog for creating new policies
- `contracts/contract-form-dialog.tsx`: Dialog for creating new contract definitions
- `common/connectivity-check-dialog.tsx`: Dialog for checking API connectivity
- `dataapps/flower-server-logs.tsx`: Component for displaying Flower Server logs
- `dataapps/mlflow-dialog.tsx`: Dialog for MLflow integration
- `dataapps/flower-server-logs-dialog.tsx`: Dialog for Flower server logs

## API Functions

The `lib/api.ts` file contains functions for interacting with the EDC-MASS API, including:

- Asset CRUD operations
- Policy CRUD operations
- Contract definition CRUD operations
- Connectivity checking

## Differences from EDC Provider

- **Fixed Connector**: Uses a hardcoded EDC-MASS connector URL
- **Always Live Mode**: No mock/live API mode switching
- **View Modes**: Supports switching between "Publicaciones" (Assets) and "Contratos" (Contracts) views
- **Custom Header**: Uses `PublishDataHeader` with specialized navigation
