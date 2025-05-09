"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

type Asset = {
  id?: string
  name: string
  description: string
  baseUrl?: string
}

interface AssetFormProps {
  onAddAsset: (asset: Asset) => void
}

export function AssetFormDialog({ onAddAsset }: AssetFormProps) {
  const [open, setOpen] = useState(false)
  const [assetId, setAssetId] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      setIsSubmitting(true)
      try {
        await onAddAsset({
          id: assetId.trim() || undefined,
          name,
          description,
          baseUrl: baseUrl.trim() || undefined,
        })
        resetForm()
        setOpen(false)
      } catch (error) {
        console.error("Error submitting asset form:", error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const resetForm = () => {
    setAssetId("")
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
        <Button
          variant="outline"
          size="icon"
          className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-lime-200 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lime-700">Add New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="asset-id">Asset ID</Label>
            <Input
              id="asset-id"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Enter asset ID (optional)"
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">If left empty, a kebab-case version of the name will be used as ID</p>
          </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-description">Description</Label>
            <Textarea
              id="asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter asset description"
              rows={3}
              className="focus-visible:ring-lime-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-baseurl">DataAddress - Base URL</Label>
            <Input
              id="asset-baseurl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Enter base URL for the data address"
              className="focus-visible:ring-lime-500"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="bg-lime-600 hover:bg-lime-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

