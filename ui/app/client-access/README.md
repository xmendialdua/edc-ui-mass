# Client Access Module

This module provides a secure login interface for clients to access their shared documents from the Catena-X Data Space.

## Overview

The Client Access interface allows registered companies (Ikerlan, Ederlan, Gestamp, Bexen) to log in and view documents that have been shared with them by Mondragon Assembly.

## Key Features

- **Secure Login**: Email and password authentication
- **Company-Specific Access**: Documents are filtered per company using shared storage
- **Real-time Document Updates**: Documents are loaded from the same storage as publish-data
- **Document Download**: Download shared documents
- **User Profile Display**: Shows company logo and name when logged in
- **Responsive Design**: Works on desktop and mobile devices
- **Persistent Data**: Uses localStorage for document management

## Storage Integration

This module reads documents from the shared storage system (`/lib/documents-storage.ts`):
- Documents are filtered by the logged-in company
- **Real-time synchronization** with publish-data module:
  - Automatic detection of changes from other tabs via storage event listener
  - Manual refresh button to reload documents
- Only shows documents where `sharedWith` matches the company
- Automatic updates when documents are shared/unshared

### Synchronization Features

1. **Cross-tab sync**: Changes made in publish-data (in another tab) are automatically detected
2. **Manual refresh**: Click the "Refresh" button to reload documents from storage
3. **Auto-notification**: Success message appears when documents are updated
4. **Real-time filtering**: Only displays documents shared with the logged-in company

See `/lib/documents-storage.README.md` for detailed storage documentation.

## Current Configuration

### Active Credentials

Currently, all four companies can access the system:

**Manual Login:**
- **Email**: `dataspace@ikerlan.es` (pre-filled)
- **Password**: `CX-dataspace@2026` (pre-filled)

**Quick Login Buttons:**
In the header (top-right), when not logged in, there are 4 buttons for instant access:
- **Log In as Ikerlan** - Login instantly as Ikerlan
- **Log In as Ederlan** - Login instantly as Ederlan
- **Log In as Gestamp** - Login instantly as Gestamp
- **Log In as Bexen** - Login instantly as Bexen

These buttons allow rapid testing and access without entering credentials.

## Routes

- **Main Route**: `/client-access`
- Access the interface at: `http://localhost:3000/client-access`

## Components

### Login Form
- Email input field
- Password input field
- Sign In button
- Error and success message display

### Documents View (Post-Login)
- List of shared documents
- Document metadata (shared by, date)
- Download button per document
- Logout option in header

## Styling

- Consistent with the `publish-data` module style
- Black header with lime green accent (border-lime-500)
- Mondragon Assembly logo on the left
- User profile icon on the right when logged in
- Card-based login form with lime green accent

## Document Loading

Documents are loaded dynamically from the shared storage system:
- Only documents with `sharedWith === company` are displayed
- Document list updates when user logs in
- Data persists across sessions via localStorage
- Initially, documento1 and documento3 are shared with Ikerlan

Example document structure:
```typescript
{
  id: "doc-1",
  name: "documento1",
  sharedWith: "Ikerlan",
  dateCreated: "2026-03-15",
  lastModified: "2026-03-15"
}
```

## Future Enhancements

- Integration with actual Catena-X Data Space API
- Real authentication backend
- Document encryption and secure download
- Multi-company support (Ederlan, Gestamp, Bexen)
- Document preview functionality
- Search and filter capabilities
