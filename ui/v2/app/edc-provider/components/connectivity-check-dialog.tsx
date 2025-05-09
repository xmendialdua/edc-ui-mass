"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { checkConnectorReachable } from "@/app/edc-provider/lib/api"
import { getConnectorAddress } from "@/app/edc-provider/lib/config"

interface ConnectivityCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectivityCheckDialog({ open, onOpenChange }: ConnectivityCheckDialogProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{ success: boolean; message: string } | null>(null)

  // Handle check
  const handleCheck = async () => {
    setIsChecking(true)
    setCheckResult(null)

    try {
      // Get the current connector address from the API service
      const connectorAddress = getConnectorAddress()
      console.log("Checking connectivity to:", connectorAddress)

      // Artificial delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Check if the connector is reachable
      const isReachable = await checkConnectorReachable(connectorAddress)

      if (isReachable) {
        setCheckResult({
          success: true,
          message: `Successfully connected to ${connectorAddress}`,
        })
      } else {
        setCheckResult({
          success: false,
          message: `Could not connect to ${connectorAddress}. Please check the address and try again.`,
        })
      }
    } catch (error: any) {
      console.error("Error checking connectivity:", error)
      setCheckResult({
        success: false,
        message: `Error checking connectivity: ${error.message}`,
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Connectivity Check</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Check if the EDC connector API is reachable at the current address.</p>

          {checkResult && (
            <div
              className={`p-4 rounded-md ${
                checkResult.success
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <div className="flex items-center">
                {checkResult.success ? (
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2 text-red-500" />
                )}
                <p className="text-sm">{checkResult.message}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleCheck} disabled={isChecking} className="bg-lime-600 hover:bg-lime-700 text-white">
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "Run Check"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

