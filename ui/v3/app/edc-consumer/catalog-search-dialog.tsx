"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CatalogSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearch: (counterPartyId: string, counterPartyAddress: string) => void
  defaultCounterPartyId?: string
  defaultCounterPartyAddress?: string
}

export function CatalogSearchDialog({
  open,
  onOpenChange,
  onSearch,
  defaultCounterPartyId = "did:web:provider-identityhub%3A7083:provider",
  defaultCounterPartyAddress = "http://provider-qna-controlplane:8082/api/dsp",
}: CatalogSearchDialogProps) {
  const [counterPartyId, setCounterPartyId] = useState(defaultCounterPartyId)
  const [counterPartyAddress, setCounterPartyAddress] = useState(defaultCounterPartyAddress)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!counterPartyId.trim() || !counterPartyAddress.trim()) {
      setError("Both Counter Party ID and Address are required")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      console.log(
        `Submitting catalog search with counterPartyId: ${counterPartyId}, counterPartyAddress: ${counterPartyAddress}`,
      )
      await onSearch(counterPartyId, counterPartyAddress)
      onOpenChange(false)
    } catch (err: any) {
      console.error("Catalog search failed:", err)
      setError(`Search failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-lime-200">
        <DialogHeader>
          <DialogTitle className="text-lime-700 flex items-center">
            <Search className="h-5 w-5 mr-2 text-lime-600" />
            Search Provider Catalog
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="counterPartyId">Counter Party ID</Label>
            <Input
              id="counterPartyId"
              value={counterPartyId}
              onChange={(e) => setCounterPartyId(e.target.value)}
              placeholder="Enter counter party ID"
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">Example: did:web:provider-identityhub%3A7083:provider</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="counterPartyAddress">Counter Party Address</Label>
            <Input
              id="counterPartyAddress"
              value={counterPartyAddress}
              onChange={(e) => setCounterPartyAddress(e.target.value)}
              placeholder="Enter counter party address"
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">Example: http://provider-qna-controlplane:8082/api/dsp</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-lime-600 hover:bg-lime-700 text-white"
          >
            {isSubmitting ? "Searching..." : "Search Catalog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
