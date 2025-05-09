"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransfer: (transferType: string, serverAddress?: string) => Promise<void>
  assetId: string
  contractId: string
  counterPartyId: string
  counterPartyAddress: string
}

export function TransferDialog({
  open,
  onOpenChange,
  onTransfer,
  assetId,
  contractId,
  counterPartyId,
  counterPartyAddress,
}: TransferDialogProps) {
  const [transferType, setTransferType] = useState<"PUSH" | "PULL">("PULL")
  const [serverAddress, setServerAddress] = useState("http://172.19.0.2:30381/listener")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setTransferType("PULL")
      setServerAddress("http://172.19.0.2:30381/listener")
      setError(null)
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async () => {
    try {
      setError(null)
      setIsSubmitting(true)

      if (transferType === "PUSH" && !serverAddress.trim()) {
        setError("Server address is required for PUSH transfers")
        setIsSubmitting(false)
        return
      }

      await onTransfer(
        transferType === "PUSH" ? "HttpData-PUSH" : "HttpData-PULL",
        transferType === "PUSH" ? serverAddress : undefined,
      )
      handleOpenChange(false)
    } catch (err: any) {
      setError(`Transfer failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-lime-200">
        <DialogHeader>
          <DialogTitle className="text-lime-700">Transfer Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-base">Select Transfer Type</Label>
              <RadioGroup
                value={transferType}
                onValueChange={(value) => setTransferType(value as "PUSH" | "PULL")}
                className="mt-2"
              >
                <div className="flex items-start space-x-2 p-2 border rounded-md">
                  <RadioGroupItem value="PUSH" id="push" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="push" className="text-sm font-medium">
                      PUSH: The consumer sends the data to a listening server
                    </Label>
                    <p className="text-xs text-muted-foreground">The data will be sent to a server that you specify</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-2 border rounded-md mt-2">
                  <RadioGroupItem value="PULL" id="pull" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="pull" className="text-sm font-medium">
                      PULL: The consumer retrieves the data directly
                    </Label>
                    <p className="text-xs text-muted-foreground">The data will be retrieved directly in the terminal</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {transferType === "PUSH" && (
              <div className="space-y-2">
                <Label htmlFor="server-address">Server Address</Label>
                <Input
                  id="server-address"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="Enter server address"
                  className="focus-visible:ring-lime-500"
                />
                <p className="text-xs text-gray-500">Example: http://172.19.0.2:30381/listener</p>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded-md">
              <p>Asset ID: {assetId}</p>
              <p>Contract ID: {contractId}</p>
              <p>Counter Party ID: {counterPartyId}</p>
              <p>Counter Party Address: {counterPartyAddress}</p>
              <p>Transfer Type: {transferType === "PUSH" ? "HttpData-PUSH" : "HttpData-PULL"}</p>
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
            {isSubmitting ? "Initiating Transfer..." : "Start Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
