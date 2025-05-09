# EDC Provider Module

This module contains the Provider interface for the Eclipse Dataspace Connector (EDC) management application.

## Overview

The Provider interface allows users to manage assets, policies, and contract definitions that can be shared with consumers. It provides a user-friendly interface for creating, viewing, and deleting these resources.

## Key Features

- Asset management (create, view, delete)
- Policy management (create, view, delete)
- Contract definition management (create, view, delete)
- API connectivity checking
- Language switching (English/Spanish)
- Mock/Live API mode switching

## Folder Structure

- `/components`: UI components specific to the Provider interface
- `/lib`: API and utility functions for the Provider interface

## Components

- `asset-form-dialog.tsx`: Dialog for creating new assets
- `policy-form-dialog.tsx`: Dialog for creating new policies
- `contract-form-dialog.tsx`: Dialog for creating new contract definitions
- `connectivity-check-dialog.tsx`: Dialog for checking API connectivity
- `flower-server-logs.tsx`: Component for displaying Flower Server logs

## API Functions

The `lib/api.ts` file contains functions for interacting with the EDC Provider API, including:

- Asset CRUD operations
- Policy CRUD operations
- Contract definition CRUD operations
- Connector address management
- Connectivity checking

