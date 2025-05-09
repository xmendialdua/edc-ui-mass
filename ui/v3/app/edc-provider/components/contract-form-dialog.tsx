"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface ContractFormDialogProps {
  onAddContract: (contract: {
    name: string
    accessPolicyId: string
    contractPolicyId: string
    assetIds: string[]
  }) => void
  assets: { id: string; name: string }[]
  policies: { id: string; name: string }[]
}

export function ContractFormDialog({ onAddContract, assets, policies }: ContractFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [accessPolicyId, setAccessPolicyId] = useState("")
  const [contractPolicyId, setContractPolicyId] = useState("")
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddContract({
      name,
      accessPolicyId,
      contractPolicyId,
      assetIds: selectedAssets,
    })
    resetForm()
    setOpen(false)
  }

  const resetForm = () => {
    setName("")
    setAccessPolicyId("")
    setContractPolicyId("")
    setSelectedAssets([])
  }

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) => (prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]))
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
          Add Contract
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contract Definition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contract-name">Contract Name</Label>
            <Input
              id="contract-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter contract name"
              required
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">A kebab-case version of the name will be used as ID</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="access-policy">Access Policy</Label>
            <Select value={accessPolicyId} onValueChange={setAccessPolicyId} required>
              <SelectTrigger id="access-policy">
                <SelectValue placeholder="Select access policy" />
              </SelectTrigger>
              <SelectContent>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract-policy">Contract Policy</Label>
            <Select value={contractPolicyId} onValueChange={setContractPolicyId} required>
              <SelectTrigger id="contract-policy">
                <SelectValue placeholder="Select contract policy" />
              </SelectTrigger>
              <SelectContent>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assets</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
              {assets.length > 0 ? (
                assets.map((asset) => (
                  <div key={asset.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`asset-${asset.id}`}
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={() => toggleAsset(asset.id)}
                    />
                    <Label htmlFor={`asset-${asset.id}`} className="cursor-pointer">
                      {asset.name}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No assets available</p>
              )}
            </div>
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
            <Button
              type="submit"
              className="bg-lime-600 hover:bg-lime-700 text-white"
              disabled={!name || !accessPolicyId || !contractPolicyId || selectedAssets.length === 0}
            >
              Add Contract
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
