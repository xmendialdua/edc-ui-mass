"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, RefreshCw } from "lucide-react"
import { checkApiConnectivity } from "@/lib/api"

interface ConnectivityCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectivityCheckDialog({ open, onOpenChange }: ConnectivityCheckDialogProps) {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkConnectivity = async () => {
    setLoading(true)
    setError(null)
    try {
      const connectivityResults = await checkApiConnectivity()
      setResults(connectivityResults)
    } catch (err: any) {
      console.error("Connectivity check failed:", err)
      setError(`Failed to check connectivity: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      checkConnectivity()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-lime-200">
        <DialogHeader>
          <DialogTitle className="text-lime-700">API Connectivity Check</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-lime-500" />
            </div>
          ) : results ? (
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b font-medium">Catalog Endpoint</div>
                <div className="p-4">
                  <div className="flex items-center">
                    {results.catalog.status ? (
                      <Check className="h-5 w-5 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                    )}
                    <span className={results.catalog.status ? "text-green-700" : "text-red-700"}>
                      {results.catalog.message}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Checked at: {new Date(results.catalog.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b font-medium">Negotiations Endpoint</div>
                <div className="p-4">
                  <div className="flex items-center">
                    {results.negotiations.status ? (
                      <Check className="h-5 w-5 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                    )}
                    <span className={results.negotiations.status ? "text-green-700" : "text-red-700"}>
                      {results.negotiations.message}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Checked at: {new Date(results.negotiations.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b font-medium">Transfers Endpoint</div>
                <div className="p-4">
                  <div className="flex items-center">
                    {results.transfers.status ? (
                      <Check className="h-5 w-5 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                    )}
                    <span className={results.transfers.status ? "text-green-700" : "text-red-700"}>
                      {results.transfers.message}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Checked at: {new Date(results.transfers.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={checkConnectivity} disabled={loading} className="bg-lime-600 hover:bg-lime-700 text-white">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Refresh Check"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
