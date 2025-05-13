"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { checkApiConnectivity, getConnectorAddress } from "@/lib/api"
import { Terminal, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface ConnectivityCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectivityCheckDialog({ open, onOpenChange }: ConnectivityCheckDialogProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [currentOrigin, setCurrentOrigin] = useState<string>("")
  const [connectorAddress, setConnectorAddress] = useState<string>("")

  // Get the current origin when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin)
      setConnectorAddress(getConnectorAddress())
    }
  }, [])

  // Run the check when the dialog opens
  useEffect(() => {
    if (open) {
      runConnectivityCheck()
    } else {
      // Reset state when dialog closes
      setResults(null)
      setIsChecking(false)
    }
  }, [open])

  const runConnectivityCheck = async () => {
    setIsChecking(true)
    setConnectorAddress(getConnectorAddress())

    try {
      console.log("Running API connectivity check...")
      const checkResults = await checkApiConnectivity()
      setResults(checkResults)
      setLastChecked(new Date().toLocaleTimeString())
    } catch (error) {
      console.error("Error running connectivity check:", error)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Terminal className="h-5 w-5 mr-2 text-lime-600" />
            API Connectivity Check
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Display current origin for debugging */}
          <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-md">
            <div>
              Using API at: <code className="bg-gray-100 px-1 py-0.5 rounded">{currentOrigin}/api-proxy</code>
            </div>
            <div>
              Connector: <code className="bg-gray-100 px-1 py-0.5 rounded">{connectorAddress}</code>
            </div>
          </div>

          {isChecking ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-lime-600 mb-4" />
              <p className="text-gray-600">Checking API connectivity...</p>
            </div>
          ) : results ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-md ${
                    results.catalog?.status ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <h3 className="font-medium mb-2 flex items-center">
                    {results.catalog?.status ? (
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    Catalog Endpoint
                  </h3>
                  <p className="text-sm">{results.catalog?.message || "Status unknown"}</p>
                </div>

                <div
                  className={`p-4 rounded-md ${
                    results.negotiations?.status
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <h3 className="font-medium mb-2 flex items-center">
                    {results.negotiations?.status ? (
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    Negotiations Endpoint
                  </h3>
                  <p className="text-sm">{results.negotiations?.message || "Status unknown"}</p>
                </div>

                <div
                  className={`p-4 rounded-md ${
                    results.transfers?.status
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <h3 className="font-medium mb-2 flex items-center">
                    {results.transfers?.status ? (
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    Transfers Endpoint
                  </h3>
                  <p className="text-sm">{results.transfers?.message || "Status unknown"}</p>
                </div>
              </div>

              <div className="text-gray-500 mt-1 pt-1 border-t border-gray-200 text-sm">
                Last checked: {lastChecked} • Check console for detailed results
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Checking API connectivity...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
