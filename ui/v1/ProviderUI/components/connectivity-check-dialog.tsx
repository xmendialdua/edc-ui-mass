"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import { checkApiConnectivity } from "@/lib/api"

export function ConnectivityCheckDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [connectivityResults, setConnectivityResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkConnectivity = async () => {
    setIsLoading(true)
    try {
      const results = await checkApiConnectivity()
      setConnectivityResults(results)
    } catch (error) {
      console.error("Error checking connectivity:", error)
      setConnectivityResults({ error: "Failed to check connectivity" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      checkConnectivity()
    } else {
      setConnectivityResults(null) // Reset results when dialog is closed
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Connectivity Check</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="animate-spin h-6 w-6" />
          </div>
        ) : connectivityResults ? (
          <div>
            {connectivityResults.error ? (
              <div className="text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {connectivityResults.error}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p>Connectivity Status:</p>
                </div>
                {Object.entries(connectivityResults).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    {value.status ? (
                      <div className="text-green-500 flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        Connected
                      </div>
                    ) : (
                      <div className="text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Failed
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="text-gray-500">Click "Check API" to run connectivity tests.</div>
        )}
        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

