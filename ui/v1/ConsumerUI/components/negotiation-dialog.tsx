"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

interface NegotiationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNegotiate: (policy: any) => Promise<void>
  assetId: string
  assetName: string
  policy: any
  counterPartyId: string
  counterPartyAddress: string
}

export function NegotiationDialog({
  open,
  onOpenChange,
  onNegotiate,
  assetId,
  assetName,
  policy,
  counterPartyId,
  counterPartyAddress,
}: NegotiationDialogProps) {
  const [policyJson, setPolicyJson] = useState(JSON.stringify(policy, null, 2))
  const [allowModify, setAllowModify] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setPolicyJson(JSON.stringify(policy, null, 2))
      setAllowModify(false)
      setError(null)
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async () => {
    try {
      setError(null)
      setIsSubmitting(true)

      // Parse the policy JSON
      let policyObject
      try {
        policyObject = JSON.parse(policyJson)
      } catch (err) {
        setError("Invalid JSON format in policy")
        setIsSubmitting(false)
        return
      }

      // Add target if not present
      if (!policyObject.target) {
        policyObject.target = assetId
      }

      // Add assigner if not present
      if (!policyObject.assigner) {
        policyObject.assigner = counterPartyId
      }

      await onNegotiate(policyObject)
      handleOpenChange(false)
    } catch (err: any) {
      setError(`Negotiation failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] border-lime-200">
        <DialogHeader>
          <DialogTitle className="text-lime-700">Negotiate Asset: {assetName || assetId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">This is the policy assigned to the asset you want to negotiate.</p>

            <div className="flex items-center space-x-2 my-4">
              <Checkbox
                id="allow-modify"
                checked={allowModify}
                onCheckedChange={(checked) => setAllowModify(checked === true)}
              />
              <Label htmlFor="allow-modify" className="text-sm font-medium">
                I would like to modify the policy terms
              </Label>
            </div>

            <Textarea
              value={policyJson}
              onChange={(e) => setPolicyJson(e.target.value)}
              disabled={!allowModify}
              className="font-mono text-sm h-80 focus-visible:ring-lime-500"
            />

            <div className="text-xs text-gray-500 mt-2">
              <p>Asset ID: {assetId}</p>
              <p>Counter Party ID: {counterPartyId}</p>
              <p>Counter Party Address: {counterPartyAddress}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-lime-600 hover:bg-lime-700 text-white"
          >
            {isSubmitting ? "Negotiating..." : "I agree with the policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

