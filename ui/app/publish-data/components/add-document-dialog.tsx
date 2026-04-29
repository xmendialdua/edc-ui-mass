"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PUBLIC_PDF_URL } from "@/lib/publish-flow"

type AddDocumentDialogProps = {
  onAddDocument: (name: string, url: string) => void
}

export function AddDocumentDialog({ onAddDocument }: AddDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [documentName, setDocumentName] = useState("")
  const [documentUrl, setDocumentUrl] = useState(PUBLIC_PDF_URL)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (documentName.trim() && documentUrl.trim()) {
      onAddDocument(documentName.trim(), documentUrl.trim())
      setDocumentName("")
      setDocumentUrl(PUBLIC_PDF_URL)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-lime-600 hover:bg-lime-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Publish New Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Publish New Document</DialogTitle>
          <DialogDescription>
            Enter the name and URL of the document you want to publish. The document will be published as an asset in
            the Mondragon Assembly connector. You can later choose which companies to share it with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="document-name">Document Name</Label>
              <Input
                id="document-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., documento8"
                className="focus-visible:ring-lime-500"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-url">Document URL</Label>
              <Input
                id="document-url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://example.com/document.pdf"
                className="focus-visible:ring-lime-500"
              />
              <p className="text-xs text-muted-foreground">
                Default: Public demo PDF (W3C test file)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDocumentName("")
                setDocumentUrl(PUBLIC_PDF_URL)
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-lime-600 hover:bg-lime-700"
              disabled={!documentName.trim() || !documentUrl.trim()}
            >
              Add Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
