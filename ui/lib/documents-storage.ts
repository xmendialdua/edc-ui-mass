// Shared document storage management for publish-data and client-access

export type Company = "Ikerlan" | "Ederlan" | "Gestamp" | "Bexen"

export type Document = {
  id: string
  name: string
  sharedWith: Company | null
  dateCreated: string
  lastModified: string
}

const STORAGE_KEY = "catena-x-documents"

// Datos iniciales por defecto
const initialDocuments: Document[] = [
  {
    id: "doc-1",
    name: "doc1",
    sharedWith: "Ikerlan",
    dateCreated: "2026-03-15",
    lastModified: "2026-03-15",
  },
  {
    id: "doc-2",
    name: "doc2",
    sharedWith: null,
    dateCreated: "2026-03-14",
    lastModified: "2026-03-14",
  },
  {
    id: "doc-3",
    name: "doc3",
    sharedWith: "Ikerlan",
    dateCreated: "2026-03-13",
    lastModified: "2026-03-13",
  },
  {
    id: "doc-4",
    name: "doc4",
    sharedWith: null,
    dateCreated: "2026-03-12",
    lastModified: "2026-03-12",
  },
  {
    id: "doc-5",
    name: "doc5",
    sharedWith: null,
    dateCreated: "2026-03-11",
    lastModified: "2026-03-11",
  },
  {
    id: "doc-6",
    name: "doc6",
    sharedWith: null,
    dateCreated: "2026-03-10",
    lastModified: "2026-03-10",
  },
  {
    id: "doc-7",
    name: "doc7",
    sharedWith: null,
    dateCreated: "2026-03-09",
    lastModified: "2026-03-09",
  },
  {
    id: "doc-8",
    name: "doc8",
    sharedWith: null,
    dateCreated: "2026-03-08",
    lastModified: "2026-03-08",
  },
  {
    id: "doc-9",
    name: "doc9",
    sharedWith: null,
    dateCreated: "2026-03-07",
    lastModified: "2026-03-07",
  },
  {
    id: "doc-10",
    name: "doc10",
    sharedWith: null,
    dateCreated: "2026-03-06",
    lastModified: "2026-03-06",
  },
  {
    id: "doc-11",
    name: "doc11",
    sharedWith: null,
    dateCreated: "2026-03-05",
    lastModified: "2026-03-05",
  },
  {
    id: "doc-12",
    name: "doc12",
    sharedWith: null,
    dateCreated: "2026-03-04",
    lastModified: "2026-03-04",
  },
]

// Obtener todos los documentos
export function getDocuments(): Document[] {
  if (typeof window === "undefined") return initialDocuments

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    // Inicializar con datos por defecto
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDocuments))
    return initialDocuments
  }

  try {
    const documents = JSON.parse(stored)
    
    // Si hay menos de 12 documentos, reinicializar con los datos completos
    if (documents.length < 12) {
      console.log("Upgrading documents storage to 12 documents")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDocuments))
      return initialDocuments
    }
    
    return documents
  } catch (error) {
    console.error("Error parsing documents:", error)
    return initialDocuments
  }
}

// Guardar todos los documentos
export function saveDocuments(documents: Document[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
}

// Añadir un nuevo documento
export function addDocument(name: string): Document {
  const documents = getDocuments()
  const newDoc: Document = {
    id: `doc-${Date.now()}`,
    name,
    sharedWith: null,
    dateCreated: new Date().toISOString().split("T")[0],
    lastModified: new Date().toISOString().split("T")[0],
  }

  documents.push(newDoc)
  saveDocuments(documents)
  return newDoc
}

// Actualizar con quién se comparte un documento
export function updateDocumentSharing(docId: string, company: Company | null): void {
  const documents = getDocuments()
  const doc = documents.find((d) => d.id === docId)

  if (doc) {
    doc.sharedWith = company
    doc.lastModified = new Date().toISOString().split("T")[0]
    saveDocuments(documents)
  }
}

// Obtener documentos compartidos con una empresa específica
export function getDocumentsForCompany(company: Company): Document[] {
  const documents = getDocuments()
  return documents.filter((doc) => doc.sharedWith === company)
}

// Eliminar un documento
export function deleteDocument(docId: string): void {
  const documents = getDocuments()
  const filtered = documents.filter((d) => d.id !== docId)
  saveDocuments(filtered)
}

// Resetear a datos por defecto (útil para testing)
export function resetDocuments(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDocuments))
}
