# Shared Documents Storage System

This module manages the shared document storage system used by both `publish-data` and `client-access` modules.

## Architecture

The system uses **localStorage** as a JSON-based persistent storage to manage documents and their sharing status across both publishing and client access views.

## Storage Structure

Documents are stored with the following structure:

```typescript
{
  id: string              // Unique identifier (e.g., "doc-1", "doc-1234567890")
  name: string            // Document name (e.g., "documento1")
  sharedWith: Company | null  // Company the document is shared with, or null if not shared
  dateCreated: string     // ISO date when document was created (YYYY-MM-DD)
  lastModified: string    // ISO date of last modification (YYYY-MM-DD)
}
```

## Available Companies

- Ikerlan
- Ederlan
- Gestamp
- Bexen

## Functions

### `getDocuments(): Document[]`
Returns all documents from storage. If storage is empty, initializes with default documents.

### `saveDocuments(documents: Document[]): void`
Saves all documents to localStorage.

### `addDocument(name: string): Document`
Creates a new document with the given name. Initially not shared with any company.

### `updateDocumentSharing(docId: string, company: Company | null): void`
Updates which company a document is shared with. Pass `null` to unshare.

### `getDocumentsForCompany(company: Company): Document[]`
Returns only documents shared with the specified company.

### `deleteDocument(docId: string): void`
Removes a document from storage.

### `resetDocuments(): void`
Resets storage to default initial documents (useful for testing).

## Initial Default Documents

The system initializes with 12 documents:
- documento1 → shared with Ikerlan
- documento2 → not shared
- documento3 → shared with Ikerlan
- documento4-12 → not shared

## Integration

### In `publish-data`
- Displays all documents with sharing status
- Allows adding new documents
- Allows sharing/unsharing with companies
- Provides filter by company
- Changes are immediately persisted to localStorage

### In `client-access`
- Displays only documents shared with the logged-in company
- Real-time updates when documents are shared from publish-data
- Download functionality per document

## Data Persistence

- Data is stored in browser's localStorage
- Key: `"catena-x-documents"`
- Format: JSON string
- Persists across browser sessions
- Shared between all tabs/windows of the same origin

## Example Usage

```typescript
import { 
  getDocuments, 
  addDocument, 
  updateDocumentSharing,
  getDocumentsForCompany 
} from '@/lib/documents-storage'

// Get all documents
const allDocs = getDocuments()

// Add a new document
const newDoc = addDocument("documento8")

// Share with a company
updateDocumentSharing(newDoc.id, "Ikerlan")

// Get documents for Ikerlan
const ikerlanDocs = getDocumentsForCompany("Ikerlan")

// Unshare a document
updateDocumentSharing(newDoc.id, null)
```

## Synchronization

Changes made in `publish-data` are immediately available in `client-access`:
- **Same tab/window**: Changes are immediately reflected when components re-render
- **Cross-tab synchronization**: The `storage` event automatically detects changes made in other tabs
- **Manual refresh**: Client-access provides a refresh button to manually reload documents

### Testing Synchronization

To test the synchronization between modules:

1. **Open two browser tabs:**
   - Tab 1: `http://localhost:3000/publish-data`
   - Tab 2: `http://localhost:3000/client-access`

2. **In Tab 2 (client-access):**
   - Login with: `dataspace@ikerlan.es` / `CX-dataspace@2026`
   - Note which documents appear

3. **In Tab 1 (publish-data):**
   - Share a new document with "Ikerlan" (click grey "Share" button → select "Ikerlan")
   - The change is saved to localStorage

4. **In Tab 2 (client-access):**
   - The document list should automatically update (storage event)
   - Alternatively, click the "Refresh" button to manually reload
   - The new document should now appear

5. **Verify unsharing:**
   - In Tab 1, click the green button on a document to unshare it
   - In Tab 2, the document should disappear from the list (automatically or after refresh)
