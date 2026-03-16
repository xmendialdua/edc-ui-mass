# Publish Data Module

This module contains the Publish Data interface for managing data publications through the EDC-MASS (Eclipse Dataspace Connector - MASS) connector.

## Overview

The Publish Data interface allows users to manage documents and control which companies have access to them. It provides a user-friendly interface for creating, viewing, sharing, and unsharing documents with specific clients. Unlike the Provider interface, this module uses a fixed connector address and always operates in live mode.

## Key Features

- **Document Management**: Add, view, and manage documents
- **Dynamic Sharing**: Share documents with specific companies (Ikerlan, Ederlan, Gestamp, Bexen)
- **Company Dropdown**: Select which company to share each document with
- **Filter by Client**: Filter documents by company to see what's shared with each client
- **Publish New Document**: Add new documents with custom names
- **Persistent Storage**: Documents and sharing status stored in browser localStorage
- **Real-time Updates**: Changes immediately reflected across the application
- **Language switching**: English/Spanish support
- **Fixed EDC-MASS connector**: No manual connector address changes

## Folder Structure

- `/components`: UI components for document management
  - `add-document-dialog.tsx`: Dialog for adding new documents
- `/assets`: Components for asset management (hidden in current view)
- `/policies`: Components for policy management (hidden in current view)
- `/contracts`: Components for contract management (hidden in current view)
- `/common`: Shared components (connectivity check dialog)
- `/dataapps`: Components for data applications (Flower, MLflow)
- `/lib`: API and utility functions

## Components

- `publish-data-header.tsx`: Custom header with "Document Sharing" title
- `components/add-document-dialog.tsx`: Dialog for publishing new documents
- `assets/asset-form-dialog.tsx`: Dialog for creating new assets (hidden)
- `policies/policy-form-dialog.tsx`: Dialog for creating new policies (hidden)
- `contracts/contract-form-dialog.tsx`: Dialog for creating new contract definitions (hidden)
- `common/connectivity-check-dialog.tsx`: Dialog for checking API connectivity
- `dataapps/flower-server-logs.tsx`: Component for displaying Flower Server logs
- `dataapps/mlflow-dialog.tsx`: Dialog for MLflow integration
- `dataapps/flower-server-logs-dialog.tsx`: Dialog for Flower server logs

## Document Management

### Adding New Documents

Click the "Publish New Document" button to open a dialog where you can enter:
- Document name (required)

The document will be created with:
- Unique ID (auto-generated)
- Creation date (current date)
- Initially unshared status

### Sharing Documents

For each document, you can:
1. **Share**: Click the gray "Share" button → Select a company from dropdown (Ikerlan, Ederlan, Gestamp, Bexen)
2. **Unshare**: Click the green company name button to remove sharing

### Filtering Documents

Use the dropdown filter "Filter by Client" to view:
- All Clients (default)
- Documents shared with Ikerlan
- Documents shared with Ederlan
- Documents shared with Gestamp
- Documents shared with Bexen

## Storage System

Documents are managed through a shared storage system (`/lib/documents-storage.ts`) that:
- Stores documents in browser localStorage as JSON
- Persists data across browser sessions
- Synchronizes between publish-data and client-access modules
- Tracks document name, sharing status, and dates

See `/lib/documents-storage.README.md` for detailed storage documentation.

## API Functions

The `lib/api.ts` file contains functions for interacting with the EDC-MASS API, including:

- Asset CRUD operations (currently hidden)
- Policy CRUD operations (currently hidden)
- Contract definition CRUD operations (currently hidden)
- Connectivity checking

## Differences from EDC Provider

- **Fixed Connector**: Uses a hardcoded EDC-MASS connector URL
- **Always Live Mode**: No mock/live API mode switching
- **Document Focus**: Primary focus on document sharing rather than EDC resources
- **Custom Header**: Uses `PublishDataHeader` with "Document Sharing" title
- **Simplified UI**: Assets/Policies/Contracts sections are hidden
- **Shared Storage**: Documents stored in localStorage and shared with client-access module
