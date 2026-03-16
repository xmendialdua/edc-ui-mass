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

type AddDocumentDialogProps = {
  onAddDocument: (name: string) => void
}

export function AddDocumentDialog({ onAddDocument }: AddDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [documentName, setDocumentName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (documentName.trim()) {
      onAddDocument(documentName.trim())
      setDocumentName("")
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Publish New Document</DialogTitle>
          <DialogDescription>
            Enter the name of the document you want to publish. You can later choose which companies to share it with.
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDocumentName("")
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-lime-600 hover:bg-lime-700" disabled={!documentName.trim()}>
              Add Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
