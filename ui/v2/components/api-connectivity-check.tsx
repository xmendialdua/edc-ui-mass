"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { checkApiConnectivity, getConnectorAddress } from "@/lib/api"
import { Terminal, CheckCircle, XCircle, Loader2 } from "lucide-react"

export function ApiConnectivityCheck() {
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [currentOrigin, setCurrentOrigin] = useState<string>("")
  const [connectorAddress, setConnectorAddress] = useState<string>("")

  // Get the current origin when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin)
      setLastChecked("Not checked yet")
      setConnectorAddress(getConnectorAddress())
    }
  }, [])

  const runConnectivityCheck = async () => {
    setIsChecking(true)
    // Update the connector address display
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
    <div className="border rounded-md p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Terminal className="h-5 w-5 mr-2 text-lime-600" />
          <h3 className="font-medium text-gray-700">API Connectivity Check</h3>
        </div>
        <Button
          onClick={runConnectivityCheck}
          disabled={isChecking}
          variant="outline"
          className="text-xs border-lime-300 text-lime-700 hover:bg-lime-50"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Checking...
            </>
          ) : (
            "Run Check"
          )}
        </Button>
      </div>

      {/* Display current origin for debugging */}
      <div className="text-xs text-gray-500 mb-3">
        <div>
          Using API at: <code className="bg-gray-100 px-1 py-0.5 rounded">{currentOrigin}/api-proxy</code>
        </div>
        <div>
          Connector: <code className="bg-gray-100 px-1 py-0.5 rounded">{connectorAddress}</code>
        </div>
      </div>

      {results && (
        <div className="text-xs space-y-2 mt-2 font-mono">
          <div className="flex items-center">
            {results.assets.status ? (
              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
            )}
            <span className="font-medium">Assets:</span>
            <span className="ml-1 text-gray-600">{results.assets.message}</span>
          </div>

          <div className="flex items-center">
            {results.policies.status ? (
              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
            )}
            <span className="font-medium">Policies:</span>
            <span className="ml-1 text-gray-600">{results.policies.message}</span>
          </div>

          <div className="flex items-center">
            {results.contracts.status ? (
              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
            )}
            <span className="font-medium">Contracts:</span>
            <span className="ml-1 text-gray-600">{results.contracts.message}</span>
          </div>

          <div className="text-gray-500 mt-1 pt-1 border-t border-gray-200">
            Last checked: {lastChecked} • Check console for detailed results
          </div>
        </div>
      )}

      {!results && !isChecking && (
        <p className="text-xs text-gray-500">
          Click "Run Check" to verify API connectivity. Results will be displayed here and detailed logs in the console.
          {lastChecked && <span className="block mt-1">Last checked: {lastChecked}</span>}
        </p>
      )}
    </div>
  )
}

