"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

type Asset = {
  id: string
  name: string
  description: string
}

type Policy = {
  id: string
  name: string
  constraints: string
}

type ContractDefinition = {
  id?: string
  name: string
  accessPolicyId: string
  contractPolicyId: string
  assetIds: string[]
}

interface ContractFormProps {
  onAddContract: (contract: ContractDefinition) => void
  assets: Asset[]
  policies: Policy[]
}

// Update the contract form with loading state and improved layout
export function ContractFormDialog({ onAddContract, assets, policies }: ContractFormProps) {
  const [open, setOpen] = useState(false)
  const [contractId, setContractId] = useState("")
  const [name, setName] = useState("")
  const [accessPolicyId, setAccessPolicyId] = useState("")
  const [contractPolicyId, setContractPolicyId] = useState("")
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (name.trim() && accessPolicyId && contractPolicyId && selectedAssets.length > 0) {
      setIsSubmitting(true)
      try {
        await onAddContract({
          id: contractId.trim() || undefined,
          name,
          accessPolicyId,
          contractPolicyId,
          assetIds: selectedAssets,
        })
        resetForm()
        setOpen(false)
      } catch (error) {
        console.error("Error submitting contract form:", error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const resetForm = () => {
    setContractId("")
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
        <Button
          variant="outline"
          size="icon"
          className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-lime-200 sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-lime-700">Add New Contract Definition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="contract-id">Contract ID</Label>
            <Input
              id="contract-id"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Enter contract ID (optional)"
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">If left empty, a kebab-case version of the name will be used as ID</p>
          </div>

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
          </div>

          {/* Place Access Policy and Contract Policy on the same row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Access Policy</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {policies.length > 0 ? (
                  policies.map((policy) => (
                    <div key={policy.id} className="flex items-start space-x-2 py-1">
                      <Checkbox
                        id={`access-policy-${policy.id}`}
                        checked={accessPolicyId === policy.id}
                        onCheckedChange={() => setAccessPolicyId(policy.id)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`access-policy-${policy.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {policy.name}
                        </label>
                        <p className="text-xs text-muted-foreground">{policy.constraints}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">No policies available</p>
                )}
              </div>
              {policies.length > 0 && !accessPolicyId && (
                <p className="text-xs text-red-500">Please select an access policy</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Contract Policy</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {policies.length > 0 ? (
                  policies.map((policy) => (
                    <div key={policy.id} className="flex items-start space-x-2 py-1">
                      <Checkbox
                        id={`contract-policy-${policy.id}`}
                        checked={contractPolicyId === policy.id}
                        onCheckedChange={() => setContractPolicyId(policy.id)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`contract-policy-${policy.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {policy.name}
                        </label>
                        <p className="text-xs text-muted-foreground">{policy.constraints}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">No policies available</p>
                )}
              </div>
              {policies.length > 0 && !contractPolicyId && (
                <p className="text-xs text-red-500">Please select a contract policy</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Asset Selector</Label>
            <ScrollArea className="h-[200px] border rounded-md p-3">
              {assets.length > 0 ? (
                assets.map((asset) => (
                  <div key={asset.id} className="flex items-start space-x-2 py-1">
                    <Checkbox
                      id={`asset-${asset.id}`}
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={() => toggleAsset(asset.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`asset-${asset.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {asset.name}
                      </label>
                      <p className="text-xs text-muted-foreground">{asset.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">No assets available</p>
              )}
            </ScrollArea>
            {assets.length > 0 && selectedAssets.length === 0 && (
              <p className="text-xs text-red-500">Please select at least one asset</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-lime-600 hover:bg-lime-700 text-white"
              disabled={isSubmitting || !name || !accessPolicyId || !contractPolicyId || selectedAssets.length === 0}
            >
              {isSubmitting ? "Adding..." : "Add Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
