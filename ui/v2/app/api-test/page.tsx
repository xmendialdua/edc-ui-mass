"use client"

import { useState, useEffect } from "react"
import { fetchFromApi, checkApiConnectivity } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, AlertCircle, Terminal, Loader2 } from "lucide-react"

export default function ApiTest() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectivityResults, setConnectivityResults] = useState<any>(null)
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)
  const [currentOrigin, setCurrentOrigin] = useState<string>("")
  const [connectorAddress, setConnectorAddress] = useState<string>("http://localhost:8181")

  // Get the current origin when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin)
    }
  }, [])

  const testConnection = async () => {
    try {
      setStatus("loading")
      setError(null)

      // Try to fetch assets as a test
      const data = await fetchFromApi("/v3/assets/request", {
        method: "POST",
        body: JSON.stringify({
          "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
          },
          "@type": "QuerySpec",
          offset: 0,
          limit: 1,
          sortOrder: "DESC",
          filterExpression: [],
        }),
      })

      setResult(data)
      setStatus("success")
    } catch (err) {
      console.error("API connection test failed:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setStatus("error")
    }
  }

  const runConnectivityCheck = async () => {
    setIsCheckingConnectivity(true)
    try {
      console.log("Running comprehensive API connectivity check...")
      const results = await checkApiConnectivity()
      setConnectivityResults(results)
    } catch (error) {
      console.error("Error running connectivity check:", error)
    } finally {
      setIsCheckingConnectivity(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      {/* Display current origin for debugging */}
      <div className="text-xs text-gray-500 mb-3">
        <div>
          Using API at: <code className="bg-gray-100 px-1 py-0.5 rounded">{currentOrigin}/api-proxy</code>
        </div>
        <div>
          Connector: <code className="bg-gray-100 px-1 py-0.5 rounded">{connectorAddress}</code>
        </div>
      </div>
      <Card className="border-t-2 border-t-lime-500 mb-6">
        <CardHeader className="border-b border-lime-100">
          <CardTitle className="text-lime-700">API Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={testConnection}
                disabled={status === "loading"}
                className="bg-lime-600 hover:bg-lime-700 text-white"
              >
                {status === "loading" ? "Testing..." : "Test API Connection"}
              </Button>
              <div>
                API URL:{" "}
                <code className="bg-lime-50 p-1 rounded border border-lime-200">{currentOrigin}/api-proxy</code>
              </div>
            </div>

            {status === "loading" && (
              <div className="animate-pulse p-4 bg-lime-50 rounded border border-lime-200">Testing connection...</div>
            )}

            {status === "success" && (
              <div className="p-4 bg-lime-50 text-lime-800 rounded border border-lime-200">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-lime-600" />
                  <h3 className="font-semibold">Connection Successful!</h3>
                </div>
                <pre className="bg-white p-2 rounded overflow-auto max-h-60 border border-lime-100">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            {status === "error" && (
              <div className="p-4 bg-red-50 text-red-800 rounded border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold">Connection Failed</h3>
                </div>
                <p>{error}</p>
                <div className="mt-2 text-sm">
                  <p>Possible issues:</p>
                  <ul className="list-disc pl-5">
                    <li>API server is not running</li>
                    <li>CORS is not configured on the API</li>
                    <li>Network connectivity issues</li>
                    <li>Incorrect API URL</li>
                    <li>Proxy configuration issue</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Connectivity Check */}
      <Card className="border-t-2 border-t-lime-500 mb-6">
        <CardHeader className="border-b border-lime-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Terminal className="h-5 w-5 mr-2 text-lime-600" />
              <CardTitle className="text-lime-700">Comprehensive API Connectivity Check</CardTitle>
            </div>
            <Button
              onClick={runConnectivityCheck}
              disabled={isCheckingConnectivity}
              variant="outline"
              size="sm"
              className="border-lime-300 text-lime-700 hover:bg-lime-50"
            >
              {isCheckingConnectivity ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </>
              ) : (
                "Run Check"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isCheckingConnectivity ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
              <span className="ml-2 text-gray-600">Running comprehensive connectivity check...</span>
            </div>
          ) : connectivityResults ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-md ${connectivityResults.assets.status ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                >
                  <h3 className="font-medium mb-2 flex items-center">
                    {connectivityResults.assets.status ? (
                      <Check className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    Assets Endpoint
                  </h3>
                  <p className="text-sm">{connectivityResults.assets.message}</p>
                  <p className="text-xs mt-2 text-gray-500">Timestamp: {connectivityResults.assets.timestamp}</p>
                </div>

                <div
                  className={`p-4 rounded-md ${connectivityResults.policies.status ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                >
                  <h3 className="font-medium mb-2 flex items-center">
                    {connectivityResults.policies.status ? (
                      <Check className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    Policies Endpoint
                  </h3>
                  <p className="text-sm">{connectivityResults.policies.message}</p>
                  <p className="text-xs mt-2 text-gray-500">Timestamp: {connectivityResults.policies.timestamp}</p>
                </div>

                <div
                  className={`p-4 rounded-md ${connectivityResults.contracts.status ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                >
                  <h3 className="font-medium mb-2 flex items-center">
                    {connectivityResults.contracts.status ? (
                      <Check className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    Contracts Endpoint
                  </h3>
                  <p className="text-sm">{connectivityResults.contracts.message}</p>
                  <p className="text-xs mt-2 text-gray-500">Timestamp: {connectivityResults.contracts.timestamp}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm">
                  Check the browser console for detailed API responses. The connectivity check tests all three endpoints
                  and logs the full JSON responses.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Click "Run Check" to perform a comprehensive connectivity test across all API endpoints.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debugging Information */}
      <Card className="border-t-2 border-t-gray-300">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-gray-700">Debugging Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="font-medium mb-2">API Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Current Origin:</p>
                  <code className="text-xs bg-white p-1 rounded border border-gray-200 block mt-1">
                    {currentOrigin}
                  </code>
                </div>
                <div>
                  <p className="text-sm font-medium">Proxy Path:</p>
                  <code className="text-xs bg-white p-1 rounded border border-gray-200 block mt-1">
                    {currentOrigin}/api-proxy
                  </code>
                </div>
                <div>
                  <p className="text-sm font-medium">Backend URL:</p>
                  <code className="text-xs bg-white p-1 rounded border border-gray-200 block mt-1">
                    http://172.19.0.2/provider-qna/cp/api/management
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="font-medium mb-2">API Endpoints</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Assets:</p>
                  <code className="text-xs bg-white p-1 rounded border border-gray-200 block mt-1">
                    {currentOrigin}/api-proxy/v3/assets/request
                  </code>
                </div>
                <div>
                  <p className="text-sm font-medium">Policies:</p>
                  <code className="text-xs bg-white p-1 rounded border border-gray-200 block mt-1">
                    {currentOrigin}/api-proxy/v3/policydefinitions/request
                  </code>
                </div>
                <div>
                  <p className="text-sm font-medium">Contracts:</p>
                  <code className="text-xs bg-white p-1 rounded border border-gray-200 block mt-1">
                    {currentOrigin}/api-proxy/v3/contractdefinitions/request
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="font-medium mb-2">Troubleshooting Tips</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Ensure the backend service is running at 172.19.0.2</li>
                <li>Check that the proxy configuration in next.config.mjs is correct</li>
                <li>Verify network connectivity between the frontend container and backend</li>
                <li>Check browser console for detailed error messages</li>
                <li>Ensure the frontend container is connected to the 'kind' network</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

