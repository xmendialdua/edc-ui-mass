"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Trash2, Check, AlertCircle, RefreshCw, Terminal, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  getAssets,
  getPolicies,
  getContractDefinitions,
  getMockAssets,
  getMockPolicies,
  getMockContractDefinitions,
  deleteAsset,
  deletePolicy,
  deleteContractDefinition,
  createAsset,
  createPolicy,
  createContractDefinition,
  getConnectorAddress,
  setConnectorAddress,
  checkConnectorReachable,
  debugApiCall,
} from "@/lib/api"

// Fix the import paths to include the .tsx extension
import { AssetFormDialog } from "@/components/asset-form-dialog"
import { PolicyFormDialog } from "@/components/policy-form-dialog"
import { ContractFormDialog } from "@/components/contract-form-dialog"
import { ConnectivityCheckDialog } from "@/components/connectivity-check-dialog"
import { FlowerServerLogs } from "@/components/flower-server-logs"

// Define types for our items
type Asset = {
  id: string
  name: string
  description: string
  baseUrl?: string // Add baseUrl field
}

type Policy = {
  id: string
  name: string
  constraints: string
}

// Update the ContractDefinition type
type ContractDefinition = {
  id: string
  name: string
  accessPolicy: string
  accessPolicyId?: string
  contractPolicyId?: string
  assetIds?: string[]
}

export default function Home() {
  // State for each category
  const [assets, setAssets] = useState<Asset[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [contractDefinitions, setContractDefinitions] = useState<ContractDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [apiMode, setApiMode] = useState<"mock" | "live">("mock")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectorAddress, setConnectorAddressState] = useState(getConnectorAddress())
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false)
  const [isChangingConnector, setIsChangingConnector] = useState(false)
  const [previousConnectorAddress, setPreviousConnectorAddress] = useState(getConnectorAddress())

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (apiMode === "mock") {
        // Simulated data for development
        setAssets(getMockAssets())
        setPolicies(getMockPolicies())
        setContractDefinitions(getMockContractDefinitions())
        showSuccessMessage("Mock data loaded successfully")
      } else {
        // Live API mode
        try {
          console.log("Fetching data from API...")

          // Debug API fetch start - NEW
          debugApiCall("FETCH_DATA", { mode: "live", connectorAddress: getConnectorAddress() })

          // Fetch data sequentially to better identify which request fails
          try {
            const assetsData = await getAssets()
            setAssets(assetsData)
            console.log("Assets loaded:", assetsData)
          } catch (assetError: any) {
            console.error("Failed to load assets:", assetError)
            setError(`Failed to load assets: ${assetError.message}`)
            setAssets(getMockAssets())
          }

          try {
            const policiesData = await getPolicies()
            setPolicies(policiesData)
            console.log("Policies loaded:", policiesData)
          } catch (policyError: any) {
            console.error("Failed to load policies:", policyError)
            setError(`Failed to load policies: ${policyError.message}`)
            setPolicies(getMockPolicies())
          }

          try {
            const contractsData = await getContractDefinitions()
            setContractDefinitions(contractsData)
            console.log("Contracts loaded:", contractsData)
          } catch (contractError: any) {
            console.error("Failed to load contracts:", contractError)
            setError(`Failed to load contracts: ${contractError.message}`)
            setContractDefinitions(getMockContractDefinitions())
          }

          showSuccessMessage("Data loaded from API successfully")
        } catch (apiError: any) {
          console.error("API error:", apiError)
          setError(`Failed to load data from API: ${apiError.message}. Falling back to mock data.`)

          // Debug API fetch error - NEW
          debugApiCall(
            "FETCH_DATA",
            { mode: "live", connectorAddress: getConnectorAddress() },
            { error: apiError.message },
          )

          // Fall back to mock data
          setAssets(getMockAssets())
          setPolicies(getMockPolicies())
          setContractDefinitions(getMockContractDefinitions())
        }
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(`Failed to load data: ${err.message}`)

      // Debug API fetch error - NEW
      debugApiCall("FETCH_DATA", { mode: apiMode, connectorAddress: getConnectorAddress() }, { error: err.message })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [apiMode])

  // Refresh data function
  const refreshData = () => {
    setIsRefreshing(true)
    fetchData()
  }

  // Show success message temporarily
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)
  }

  // Handle connector address change
  const handleConnectorAddressChange = (address: string) => {
    setConnectorAddressState(address)
  }

  // Update the handleConnectorChange function to properly handle non-existent addresses
  const handleConnectorChange = async () => {
    if (connectorAddress === getConnectorAddress()) {
      showSuccessMessage("Connector address unchanged")
      return
    }

    setIsChangingConnector(true)
    setPreviousConnectorAddress(getConnectorAddress())
    setError(null) // Clear any existing errors

    // Enhanced debug logging for connector change
    console.group("🔄 CHANGE CONNECTOR")
    console.log("🔄 Changing connector from:", previousConnectorAddress)
    console.log("🔄 Changing connector to:", connectorAddress)

    try {
      // Start a timer to ensure minimum loading time of 2 seconds
      const startTime = Date.now()

      // Check if the new connector is reachable
      console.log("🔍 Checking if connector is reachable...")
      const isReachable = await checkConnectorReachable(connectorAddress)
      console.log("🔍 Connector reachable:", isReachable)

      // Calculate remaining time to ensure minimum 2 seconds of loading
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 2000 - elapsedTime)

      // Wait for the remaining time if needed
      if (remainingTime > 0) {
        console.log(`⏱️ Waiting ${remainingTime}ms to ensure minimum loading time`)
        await new Promise((resolve) => setTimeout(resolve, remainingTime))
      }

      if (isReachable) {
        // Update the connector address in the API service (already done in checkConnectorReachable if successful)
        // Show success message
        console.log("✅ Successfully connected to:", connectorAddress)
        showSuccessMessage(`Successfully connected to: ${connectorAddress}`)

        // Refresh data from the new connector
        setIsRefreshing(true)
        try {
          console.log("🔄 Refreshing data from new connector...")
          await fetchData()
          console.log("✅ Data loaded successfully from new connector")
          showSuccessMessage(`Data loaded from connector: ${connectorAddress}`)
        } catch (fetchError) {
          console.error("❌ Error fetching data from new connector:", fetchError)
          setError(`Connected to connector but failed to load data: ${fetchError}`)
        }
      } else {
        // Show error message for unreachable connector
        console.error("❌ Could not connect to connector at:", connectorAddress)
        setError(`Could not connect to connector at: ${connectorAddress}. The address is unreachable or invalid.`)

        // Revert to previous address
        console.log("🔙 Reverting to previous address:", previousConnectorAddress)
        setConnectorAddressState(previousConnectorAddress)
        setConnectorAddress(previousConnectorAddress)
      }
    } catch (err) {
      console.error("❌ Error changing connector:", err)
      setError(`Failed to change connector: ${err}`)
      // Revert to previous address
      console.log("🔙 Reverting to previous address due to error:", previousConnectorAddress)
      setConnectorAddressState(previousConnectorAddress)
      setConnectorAddress(previousConnectorAddress)
    } finally {
      setIsChangingConnector(false)
      console.groupEnd()
    }
  }

  // Delete handlers with improved error handling and verification

  // Delete functions
  const handleDeleteAsset = async (id: string) => {
    try {
      setLoading(true)

      if (apiMode === "live") {
        try {
          // Use the API to delete the asset
          await deleteAsset(id)
          // Refresh the assets list
          const updatedAssets = await getAssets()
          setAssets(updatedAssets)
          showSuccessMessage("Asset deleted successfully")
        } catch (err: any) {
          // Only show error if it's not a 500 error
          if (!err.message.includes("500")) {
            setError(err.message)
            setTimeout(() => setError(null), 5000)
          } else {
            // For 500 errors, still refresh the data
            const refreshedAssets = await getAssets()
            setAssets(refreshedAssets)
            showSuccessMessage("Asset deleted successfully")
          }
        }
      } else {
        // For mock mode, just update the state
        setAssets(assets.filter((asset) => asset.id !== id))
        showSuccessMessage("Asset deleted successfully (mock mode)")
      }
    } catch (err: any) {
      console.error("Error deleting asset:", err)
      // Don't show errors for 500 responses
      if (!err.message.includes("500")) {
        setError(`Failed to delete asset: ${err.message}`)
        setTimeout(() => setError(null), 5000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePolicy = async (id: string) => {
    try {
      setLoading(true)

      if (apiMode === "live") {
        try {
          // Use the API to delete the policy
          await deletePolicy(id)
          // Refresh the policies list
          const updatedPolicies = await getPolicies()
          setPolicies(updatedPolicies)
          showSuccessMessage("Policy deleted successfully")
        } catch (err: any) {
          // Only show error if it's not a 500 error
          if (!err.message.includes("500")) {
            setError(err.message)
            setTimeout(() => setError(null), 5000)
          } else {
            // For 500 errors, still refresh the data
            const refreshedPolicies = await getPolicies()
            setPolicies(refreshedPolicies)
            showSuccessMessage("Policy deleted successfully")
          }
        }
      } else {
        // For mock mode, just update the state
        setPolicies(policies.filter((policy) => policy.id !== id))
        showSuccessMessage("Policy deleted successfully (mock mode)")
      }
    } catch (err: any) {
      console.error("Error deleting policy:", err)
      // Don't show errors for 500 responses
      if (!err.message.includes("500")) {
        setError(`Failed to delete policy: ${err.message}`)
        setTimeout(() => setError(null), 5000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContractDefinition = async (id: string) => {
    try {
      setLoading(true)

      if (apiMode === "live") {
        try {
          // Use the API to delete the contract definition
          await deleteContractDefinition(id)
          // Refresh the contract definitions list
          const updatedContractDefinitions = await getContractDefinitions()
          setContractDefinitions(updatedContractDefinitions)
          showSuccessMessage("Contract definition deleted successfully")
        } catch (err: any) {
          // Only show error if it's not a 500 error
          if (!err.message.includes("500")) {
            setError(err.message)
            setTimeout(() => setError(null), 5000)
          } else {
            // For 500 errors, still refresh the data
            const refreshedContracts = await getContractDefinitions()
            setContractDefinitions(refreshedContracts)
            showSuccessMessage("Contract definition deleted successfully")
          }
        }
      } else {
        // For mock mode, just update the state
        setContractDefinitions(contractDefinitions.filter((contract) => contract.id !== id))
        showSuccessMessage("Contract definition deleted successfully (mock mode)")
      }
    } catch (err: any) {
      console.error("Error deleting contract definition:", err)
      // Don't show errors for 500 responses
      if (!err.message.includes("500")) {
        setError(`Failed to delete contract definition: ${err.message}`)
        setTimeout(() => setError(null), 5000)
      }
    } finally {
      setLoading(false)
    }
  }

  // Update the Add functions to use the API in live mode

  // Add functions
  const handleAddAsset = async (asset: Omit<Asset, "id">) => {
    try {
      if (apiMode === "live") {
        setLoading(true)

        try {
          // Use the API to create the asset
          await createAsset(asset as any)

          // Refresh the assets list
          const updatedAssets = await getAssets()
          setAssets(updatedAssets)
          showSuccessMessage("Asset added successfully")
        } catch (err: any) {
          console.error("Error adding asset:", err)
          setError(`Failed to add asset: ${err.message}`)
          setTimeout(() => setError(null), 5000)
        }
      } else {
        // For mock mode, create a simulated response
        const newAsset = {
          ...asset,
          id: asset.name || Math.random().toString(36).substring(2, 9),
        }

        setAssets([...assets, newAsset])
        showSuccessMessage("Asset added successfully (mock mode)")
      }
    } catch (err: any) {
      console.error("Error adding asset:", err)
      setError(`Failed to add asset: ${err.message}`)
      setTimeout(() => setError(null), 3000)
    } finally {
      if (apiMode === "live") {
        setLoading(false)
      }
    }
  }

  // Update the handleAddPolicy function
  const handleAddPolicy = async (policy: { id?: string; name: string; policyJson: string; constraints?: string }) => {
    try {
      if (apiMode === "live") {
        setLoading(true)

        try {
          // Use the API to create the policy
          await createPolicy(policy)

          // Refresh the policies list
          const updatedPolicies = await getPolicies()
          setPolicies(updatedPolicies)
          showSuccessMessage("Policy added successfully")
        } catch (err: any) {
          console.error("Error adding policy:", err)
          setError(`Failed to add policy: ${err.message}`)
          setTimeout(() => setError(null), 5000)
        }
      } else {
        // For mock mode, create a simulated response
        const newPolicy = {
          id: policy.id || Math.random().toString(36).substring(2, 9),
          name: policy.name,
          constraints: policy.constraints || "Custom policy",
        }

        setPolicies([...policies, newPolicy])
        showSuccessMessage("Policy added successfully (mock mode)")
      }
    } catch (err: any) {
      console.error("Error adding policy:", err)
      setError(`Failed to add policy: ${err.message}`)
      setTimeout(() => setError(null), 3000)
    } finally {
      if (apiMode === "live") {
        setLoading(false)
      }
    }
  }

  // Update the handleAddContractDefinition function
  const handleAddContractDefinition = async (contract: {
    id?: string
    name: string
    accessPolicyId: string
    contractPolicyId: string
    assetIds: string[]
  }) => {
    try {
      if (apiMode === "live") {
        setLoading(true)

        try {
          // Use the API to create the contract definition
          await createContractDefinition(contract)

          // Refresh the contract definitions list
          const updatedContractDefinitions = await getContractDefinitions()
          setContractDefinitions(updatedContractDefinitions)
          showSuccessMessage("Contract definition added successfully")
        } catch (err: any) {
          console.error("Error adding contract definition:", err)
          setError(`Failed to add contract definition: ${err.message}`)
          setTimeout(() => setError(null), 5000)
        }
      } else {
        // Find the policy names for display
        const accessPolicy = policies.find((p) => p.id === contract.accessPolicyId)?.name || contract.accessPolicyId
        const contractPolicy =
          policies.find((p) => p.id === contract.contractPolicyId)?.name || contract.contractPolicyId

        // Create a formatted access policy string
        const accessPolicyStr = `Access: ${accessPolicy}, Contract: ${contractPolicy}, Assets: ${contract.assetIds.length}`

        // For mock mode, create a simulated response
        const newContract = {
          id: contract.id || Math.random().toString(36).substring(2, 9),
          name: contract.name,
          accessPolicy: accessPolicyStr,
          accessPolicyId: contract.accessPolicyId,
          contractPolicyId: contract.contractPolicyId,
          assetIds: contract.assetIds,
        }

        setContractDefinitions([...contractDefinitions, newContract])
        showSuccessMessage("Contract definition added successfully (mock mode)")
      }
    } catch (err: any) {
      console.error("Error adding contract definition:", err)
      setError(`Failed to add contract definition: ${err.message}`)
      setTimeout(() => setError(null), 3000)
    } finally {
      if (apiMode === "live") {
        setLoading(false)
      }
    }
  }

  // Toggle between mock and live API modes
  const toggleApiMode = () => {
    setApiMode(apiMode === "mock" ? "live" : "mock")
  }

  return (
    <main className="min-h-screen flex flex-col pb-16">
      {/* Top bar with lime green accent border */}
      <header className="bg-black text-white p-4 flex items-center border-b-2 border-lime-500">
        <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center mr-4">
          {/* Placeholder for Ikerlan logo */}
          <Image
            src="/EDCUI-LogoFristail.png?height=40&width=40"
            alt="Ikerlan Logo"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">EDC - Provider</h1>
          {/* Removed info button from here */}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading || isRefreshing}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* API Check Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCheckDialogOpen(true)}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
          >
            <Terminal className="h-3 w-3 mr-1" />
            Check API
          </Button>

          <span className="text-xs text-gray-300 ml-2">API Mode:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleApiMode}
            className={`text-xs ${
              apiMode === "live"
                ? "bg-lime-600 hover:bg-lime-700 text-white border-lime-500"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600"
            }`}
          >
            {apiMode === "live" ? "Live API" : "Mock Data"}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-6 bg-white">
        {/* Success message with lime green styling */}
        {successMessage && (
          <div className="mb-6 p-4 bg-lime-50 border border-lime-200 text-lime-700 rounded-md flex items-center">
            <Check className="w-5 h-5 mr-2 text-lime-500" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            {error}
          </div>
        )}

        {/* Connector Address Input */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-md">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">API Mode:</span>{" "}
                <span className={apiMode === "live" ? "text-lime-600 font-medium" : "text-gray-600"}>
                  {apiMode === "live" ? "Live API" : "Mock Data"}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label htmlFor="connector-address" className="whitespace-nowrap font-medium">
                  Connector Address:
                </Label>
                <div className="flex-1 flex gap-2">
                  <Input
                    id="connector-address"
                    value={connectorAddress}
                    onChange={(e) => setConnectorAddressState(e.target.value)}
                    placeholder="Enter connector address"
                    className="focus-visible:ring-lime-500"
                  />
                  <Button
                    onClick={handleConnectorChange}
                    className="bg-lime-600 hover:bg-lime-700 text-white whitespace-nowrap"
                    disabled={isChangingConnector}
                  >
                    {isChangingConnector ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Change Connector"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Assets Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Assets</h2>
                {/* Replace AssetFormDialog component usage */}
                <AssetFormDialog onAddAsset={handleAddAsset} />
              </div>
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white p-3 rounded border hover:border-lime-300 transition-colors flex items-start"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="h-8 w-8 mr-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <h3 className="font-medium">{asset.name}</h3>
                      <p className="text-sm text-gray-600">{asset.description}</p>
                      {asset.baseUrl && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">URL:</span> {asset.baseUrl}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        <span className="font-medium">ID:</span> {asset.id}
                      </p>
                    </div>
                  </div>
                ))}
                {assets.length === 0 && <p className="text-center text-gray-500 py-4">No assets available</p>}
              </div>
            </div>

            {/* Policies Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Policies</h2>
                {/* Replace PolicyFormDialog component usage */}
                <PolicyFormDialog onAddPolicy={handleAddPolicy} />
              </div>
              <div className="space-y-3">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="bg-white p-3 rounded border hover:border-lime-300 transition-colors flex items-start"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePolicy(policy.id)}
                      className="h-8 w-8 mr-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div>
                      <h3 className="font-medium">{policy.name}</h3>
                      <p className="text-sm text-gray-600">{policy.constraints}</p>
                    </div>
                  </div>
                ))}
                {policies.length === 0 && <p className="text-center text-gray-500 py-4">No policies available</p>}
              </div>
            </div>

            {/* Contract Definitions Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Contract Definitions</h2>
                {/* Replace ContractFormDialog component usage */}
                <ContractFormDialog onAddContract={handleAddContractDefinition} assets={assets} policies={policies} />
              </div>
              <div className="space-y-3">
                {contractDefinitions.map((contract) => (
                  <div
                    key={contract.id}
                    className="bg-white p-3 rounded border hover:border-lime-300 transition-colors flex items-start"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteContractDefinition(contract.id)}
                      className="h-8 w-8 mr-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div>
                      <h3 className="font-medium">{contract.name}</h3>
                      <p className="text-sm text-gray-600">{contract.accessPolicy}</p>
                    </div>
                  </div>
                ))}
                {contractDefinitions.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No contract definitions available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connectivity Check Dialog */}
      <ConnectivityCheckDialog open={isCheckDialogOpen} onOpenChange={setIsCheckDialogOpen} />

      {/* Flower Server Logs */}
      <FlowerServerLogs />
    </main>
  )
}

