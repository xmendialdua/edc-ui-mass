"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

interface AssetFormDialogProps {
  onAddAsset: (asset: { name: string; description: string; baseUrl?: string }) => void
}

export function AssetFormDialog({ onAddAsset }: AssetFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [baseUrl, setBaseUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddAsset({
      name,
      description,
      baseUrl: baseUrl || undefined,
    })
    resetForm()
    setOpen(false)
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setBaseUrl("")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-lime-600 hover:bg-lime-700 text-white">
          <Plus className="h-4 w-4 mr-1" />
          Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset-name">Asset Name</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter asset name"
              required
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">A kebab-case version of the name will be used as ID</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-description">Description</Label>
            <Textarea
              id="asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter asset description"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-url">Base URL (optional)</Label>
            <Input
              id="asset-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Enter asset base URL"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-lime-600 hover:bg-lime-700 text-white">
              Add Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

