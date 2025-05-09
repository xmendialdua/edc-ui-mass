"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Check, AlertCircle, RefreshCw, Terminal, Search, ArrowRight, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import {
  getConnectorAddress,
  setConnectorAddress,
  queryCatalog,
  getContractNegotiations,
  getTransferProcesses,
  initiateNegotiation,
  initiateTransfer,
} from "@/lib/api"

import { CatalogSearchDialog } from "@/components/catalog-search-dialog"
import { ConnectivityCheckDialog } from "@/components/connectivity-check-dialog"
import { FlowerClientLogs } from "@/components/flower-client-logs"
import { NegotiationDialog } from "@/components/negotiation-dialog"
import { TransferDialog } from "@/components/transfer-dialog"

// Define types for our items
type CatalogItem = {
  id: string
  name: string
  description: string
  expanded?: boolean
  policy?: any
}

// Update the ContractNegotiation type to include errorDetail
type ContractNegotiation = {
  id: string
  state: string
  contractAgreementId?: string
  assetId?: string
  assetName?: string
  createdAt: number
  errorDetail?: string | null
}

type TransferProcess = {
  id: string
  state: string
  contractId: string
  assetId: string
  assetName?: string
  transferType?: string
  endpointUrl?: string
  createdAt: number
  isCompleted?: boolean
}

export default function Home() {
  // State for each category
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [contractNegotiations, setContractNegotiations] = useState<ContractNegotiation[]>([])
  const [transferProcesses, setTransferProcesses] = useState<TransferProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [negotiationsLoading, setNegotiationsLoading] = useState(false)
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [apiMode, setApiMode] = useState<"mock" | "live">("live") // Default to live mode
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectorAddress, setConnectorAddressState] = useState(getConnectorAddress())
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false)
  const [isCatalogSearchOpen, setIsCatalogSearchOpen] = useState(false)
  const [lastCounterPartyId, setLastCounterPartyId] = useState<string>("did:web:provider-identityhub%3A7083:provider")
  const [lastCounterPartyAddress, setLastCounterPartyAddress] = useState<string>(
    "http://provider-qna-controlplane:8082/api/dsp",
  )

  // State for negotiation dialog
  const [isNegotiationDialogOpen, setIsNegotiationDialogOpen] = useState(false)
  const [selectedAssetForNegotiation, setSelectedAssetForNegotiation] = useState<CatalogItem | null>(null)

  // State for transfer dialog
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [selectedContractForTransfer, setSelectedContractForTransfer] = useState<ContractNegotiation | null>(null)

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (apiMode === "mock") {
        // Simulated data for development
        setCatalogItems(getMockCatalogItems())
        setContractNegotiations(getMockContractNegotiations())
        setTransferProcesses(getMockTransferProcesses())
        showSuccessMessage("Mock data loaded successfully")
      } else {
        // Live API mode
        try {
          console.log("Fetching data from API...")

          // Fetch contract negotiations
          try {
            setNegotiationsLoading(true)
            const negotiationsData = await getContractNegotiations()
            setContractNegotiations(negotiationsData)
            console.log("Contract negotiations loaded:", negotiationsData)
          } catch (negotiationError: any) {
            console.error("Failed to load contract negotiations:", negotiationError)
            setError(`Failed to load contract negotiations: ${negotiationError.message}`)
            setContractNegotiations(getMockContractNegotiations())
          } finally {
            setNegotiationsLoading(false)
          }

          // Fetch transfer processes
          try {
            setTransfersLoading(true)
            const transfersData = await getTransferProcesses()
            setTransferProcesses(transfersData)
            console.log("Transfer processes loaded:", transfersData)
          } catch (transferError: any) {
            console.error("Failed to load transfer processes:", transferError)
            setError(`Failed to load transfer processes: ${transferError.message}`)
            setTransferProcesses(getMockTransferProcesses())
          } finally {
            setTransfersLoading(false)
          }

          showSuccessMessage("Data loaded from API successfully")
        } catch (apiError: any) {
          console.error("API error:", apiError)
          setError(`Failed to load data from API: ${apiError.message}. Falling back to mock data.`)

          // Fall back to mock data
          setCatalogItems(getMockCatalogItems())
          setContractNegotiations(getMockContractNegotiations())
          setTransferProcesses(getMockTransferProcesses())
        }
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(`Failed to load data: ${err.message}`)
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

  // Handle connector change
  const handleConnectorChange = () => {
    // Update the connector address in the API service
    setConnectorAddress(connectorAddress)
    // Show success message
    showSuccessMessage(`Connector changed to: ${connectorAddress}`)
    // Refresh data from the new connector
    refreshData()
  }

  // Handle catalog search
  const handleCatalogSearch = async (counterPartyId: string, counterPartyAddress: string) => {
    try {
      setCatalogLoading(true)
      setError(null)
      setLastCounterPartyId(counterPartyId)
      setLastCounterPartyAddress(counterPartyAddress)

      if (apiMode === "live") {
        const catalogData = await queryCatalog(counterPartyId, counterPartyAddress)
        setCatalogItems(catalogData)
        showSuccessMessage("Catalog retrieved successfully")
      } else {
        // For mock mode, just simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCatalogItems(getMockCatalogItems())
        showSuccessMessage("Mock catalog retrieved successfully")
      }
    } catch (err: any) {
      console.error("Error querying catalog:", err)
      setError(`Failed to query catalog: ${err.message}`)
      setCatalogItems([])
    } finally {
      setCatalogLoading(false)
    }
  }

  // Toggle item expansion
  const toggleItemExpansion = (id: string) => {
    setCatalogItems((items) => items.map((item) => (item.id === id ? { ...item, expanded: !item.expanded } : item)))
  }

  // Open negotiation dialog
  const openNegotiationDialog = (asset: CatalogItem) => {
    setSelectedAssetForNegotiation(asset)
    setIsNegotiationDialogOpen(true)
  }

  // Handle negotiation
  const handleNegotiate = async (policy: any) => {
    if (!selectedAssetForNegotiation) return

    try {
      setNegotiationsLoading(true)
      setError(null)

      if (apiMode === "live") {
        await initiateNegotiation(selectedAssetForNegotiation.id, lastCounterPartyId, lastCounterPartyAddress, policy)
        const updatedNegotiations = await getContractNegotiations()
        setContractNegotiations(updatedNegotiations)
        showSuccessMessage(`Negotiation initiated for asset ${selectedAssetForNegotiation.id}`)
      } else {
        // For mock mode, simulate adding a new negotiation
        const mockNegotiation = {
          id: `neg-${Math.random().toString(36).substring(2, 9)}`,
          state: "REQUESTED",
          contractAgreementId: undefined,
          assetId: selectedAssetForNegotiation.id,
          assetName: selectedAssetForNegotiation.name || "Mock Asset",
          createdAt: Date.now(),
        }
        setContractNegotiations([mockNegotiation, ...contractNegotiations])
        showSuccessMessage(`Mock negotiation initiated for asset ${selectedAssetForNegotiation.id}`)
      }
    } catch (err: any) {
      console.error("Error initiating negotiation:", err)
      setError(`Failed to initiate negotiation: ${err.message}`)
    } finally {
      setNegotiationsLoading(false)
    }
  }

  // Open transfer dialog
  const openTransferDialog = (contract: ContractNegotiation) => {
    setSelectedContractForTransfer(contract)
    setIsTransferDialogOpen(true)
  }

  // Handle transfer
  const handleTransfer = async (transferType: string, serverAddress?: string) => {
    if (!selectedContractForTransfer || !selectedContractForTransfer.contractAgreementId) return

    try {
      setTransfersLoading(true)
      setError(null)

      if (apiMode === "live") {
        await initiateTransfer(
          selectedContractForTransfer.contractAgreementId,
          selectedContractForTransfer.assetId || "unknown",
          lastCounterPartyId,
          lastCounterPartyAddress,
          transferType,
          serverAddress,
        )
        const updatedTransfers = await getTransferProcesses()
        setTransferProcesses(updatedTransfers)
        showSuccessMessage(`Transfer initiated for contract ${selectedContractForTransfer.contractAgreementId}`)
      } else {
        // For mock mode, simulate adding a new transfer
        const mockTransfer = {
          id: `transfer-${Math.random().toString(36).substring(2, 9)}`,
          state: "STARTED",
          contractId: selectedContractForTransfer.contractAgreementId,
          assetId: selectedContractForTransfer.assetId || "unknown",
          isCompleted: false,
          createdAt: Date.now(),
        }
        setTransferProcesses([mockTransfer, ...transferProcesses])
        showSuccessMessage(`Mock transfer initiated for contract ${selectedContractForTransfer.contractAgreementId}`)
      }
    } catch (err: any) {
      console.error("Error initiating transfer:", err)
      setError(`Failed to initiate transfer: ${err.message}`)
    } finally {
      setTransfersLoading(false)
    }
  }

  // Toggle between mock and live API modes
  const toggleApiMode = () => {
    setApiMode(apiMode === "mock" ? "live" : "mock")
  }

  // Mock data functions
  const getMockCatalogItems = (): CatalogItem[] => {
    return [
      {
        id: "asset-1",
        name: "Manufacturing Dataset",
        description: "This asset requires Membership to view and negotiate.",
        policy: {
          "@type": "Offer",
          "@id":
            "bWVtYmVyLWFuZC1kYXRhcHJvY2Vzc29yLWRlZg==:YXNzZXQtMQ==:Yzc2YmYwNjUtZGNiMi00OTlhLWE0YWUtOWEwMTdhMDNlZjEx",
          assigner: "did:web:provider-identityhub%3A7083:provider",
          permission: [],
          prohibition: [],
          obligation: {
            action: "use",
            constraint: {
              leftOperand: "DataAccess.level",
              operator: "eq",
              rightOperand: "processing",
            },
          },
          target: "asset-1",
        },
      },
      {
        id: "asset-2",
        name: "Sensor Data",
        description: "Manufacturing sensor data with access control.",
        policy: {
          "@type": "Offer",
          "@id": "sensor-data-policy",
          assigner: "did:web:provider-identityhub%3A7083:provider",
          permission: [],
          prohibition: [],
          obligation: {
            action: "use",
            constraint: {
              leftOperand: "DataAccess.level",
              operator: "eq",
              rightOperand: "processing",
            },
          },
          target: "asset-2",
        },
      },
      {
        id: "asset-3",
        name: "API Access",
        description: "API access with usage limitations.",
        policy: {
          "@type": "Offer",
          "@id": "api-access-policy",
          assigner: "did:web:provider-identityhub%3A7083:provider",
          permission: [],
          prohibition: [],
          obligation: {
            action: "use",
            constraint: {
              leftOperand: "UsageFrequency",
              operator: "lteq",
              rightOperand: "1000",
            },
          },
          target: "asset-3",
        },
      },
    ]
  }

  // Update the mock data function to include errorDetail
  const getMockContractNegotiations = (): ContractNegotiation[] => {
    const now = Date.now()
    return [
      {
        id: "18bf27b3-2bd0-49dd-991e-4d8f347ec8ae",
        state: "FINALIZED",
        contractAgreementId: "13e79baa-d0cb-4a0f-8e23-c4d374158ef9",
        assetId: "asset-1",
        assetName: "Manufacturing Dataset",
        createdAt: now - 1000 * 60 * 5, // 5 minutes ago
        errorDetail: null,
      },
      {
        id: "29cf38c4-3ce0-58ee-882f-5e9f458ec9bf",
        state: "REQUESTED",
        assetId: "asset-2",
        assetName: "Sensor Data",
        createdAt: now - 1000 * 60 * 30, // 30 minutes ago
        errorDetail: null,
      },
      {
        id: "37df49d5-4df1-69ff-993g-6f0g569fd0cg",
        state: "DECLINED",
        assetId: "asset-3",
        assetName: "API Access",
        createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
        errorDetail: "Policy validation failed: constraints not satisfied",
      },
    ]
  }

  const getMockTransferProcesses = (): TransferProcess[] => {
    const now = Date.now()
    return [
      {
        id: "75bc27cc-793c-4956-a751-25333a3e6607",
        state: "STARTED",
        contractId: "13e79baa-d0cb-4a0f-8e23-c4d374158ef9",
        assetId: "asset-1",
        transferType: "HttpData-PUSH",
        endpointUrl: "http://172.19.0.2:30381/listener",
        createdAt: now - 1000 * 60 * 2, // 2 minutes ago
        isCompleted: false,
      },
      {
        id: "86cd38dd-804d-5067-b862-36444b4f7718",
        state: "COMPLETED",
        contractId: "24f80cbb-e1dc-5b1f-9f34-d5e385d5e5f0",
        assetId: "asset-2",
        transferType: "HttpData-PULL",
        createdAt: now - 1000 * 60 * 15, // 15 minutes ago
        isCompleted: true,
      },
      {
        id: "97de49ee-915e-6178-c973-47555c5g8829",
        state: "FAILED",
        contractId: "35g91dcc-f2ed-6c2g-0g45-e6f496e6f6g1",
        assetId: "asset-3",
        transferType: "HttpData-PUSH",
        endpointUrl: "http://172.19.0.2:30381/listener",
        createdAt: now - 1000 * 60 * 45, // 45 minutes ago
        isCompleted: false,
      },
    ]
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    } else {
      return "Just now"
    }
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
        <h1 className="text-xl font-semibold">EDC - Consumer</h1>
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
                  >
                    Change Connector
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
            {/* Provider Catalog Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Provider Catalog</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCatalogSearchOpen(true)}
                  className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Search in Catalog
                </Button>
              </div>

              {catalogLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {catalogItems.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded border hover:border-lime-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium">{item.name || item.id}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                          <p className="text-xs text-gray-400 mt-1">ID: {item.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleItemExpansion(item.id)}
                            className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          >
                            {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openNegotiationDialog(item)}
                            className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300"
                          >
                            Negotiate
                          </Button>
                        </div>
                      </div>

                      {item.expanded && item.policy && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <h4 className="text-sm font-medium mb-2">Policy Details:</h4>
                          <div className="bg-gray-50 p-2 rounded text-xs font-mono overflow-x-auto">
                            <pre>{JSON.stringify(item.policy, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {catalogItems.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No catalog items available</p>
                      <p className="text-sm mt-1">Click "Search in Catalog" to query the provider catalog</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Negotiated Contracts Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Negotiated Contracts</h2>
                {negotiationsLoading && <RefreshCw className="h-4 w-4 animate-spin text-lime-500" />}
              </div>
              <div className="space-y-3">
                {contractNegotiations.map((negotiation) => (
                  <div
                    key={negotiation.id}
                    className="bg-white p-3 rounded border hover:border-lime-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">
                            {negotiation.assetName || negotiation.assetId || "Unknown Asset"}
                          </h3>
                          <Badge
                            className={
                              negotiation.state === "FINALIZED"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : negotiation.state === "DECLINED" || negotiation.state === "ERROR"
                                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            }
                          >
                            {negotiation.state}
                          </Badge>
                          <span className="text-xs text-gray-500" title={formatDate(negotiation.createdAt)}>
                            {formatTimeAgo(negotiation.createdAt)}
                          </span>
                        </div>

                        {/* Display error details for failed negotiations */}
                        {negotiation.errorDetail && (
                          <p className="text-xs text-red-600 mt-1 italic">Error: {negotiation.errorDetail}</p>
                        )}

                        {negotiation.contractAgreementId && (
                          <p className="text-xs text-gray-500 mt-1">Agreement ID: {negotiation.contractAgreementId}</p>
                        )}
                        {negotiation.assetId && (
                          <p className="text-xs text-gray-400 mt-1">Asset ID: {negotiation.assetId}</p>
                        )}
                      </div>
                      {negotiation.state === "FINALIZED" && negotiation.contractAgreementId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTransferDialog(negotiation)}
                          className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Transfer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {contractNegotiations.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No contract negotiations available</p>
                )}
              </div>
            </div>

            {/* Initiated Transfers Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Initiated Transfers</h2>
                {transfersLoading && <RefreshCw className="h-4 w-4 animate-spin text-lime-500" />}
              </div>
              <div className="space-y-3">
                {transferProcesses.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-white p-3 rounded border hover:border-lime-300 transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {transfer.assetId}{" "}
                            <span className="text-gray-500">
                              ({transfer.transferType?.includes("PUSH") ? "PUSH" : "PULL"})
                            </span>
                          </h3>
                          <Badge
                            className={
                              transfer.state === "STARTED" || transfer.state === "COMPLETED" || transfer.isCompleted
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {transfer.state}
                          </Badge>
                          <span className="text-xs text-gray-500" title={formatDate(transfer.createdAt)}>
                            {formatTimeAgo(transfer.createdAt)}
                          </span>
                        </div>

                        {/* Show endpoint for PUSH transfers */}
                        {transfer.transferType?.includes("PUSH") && transfer.endpointUrl && (
                          <p className="text-sm text-gray-600 mt-1">Endpoint: {transfer.endpointUrl}</p>
                        )}

                        {/* Secondary attributes with lower visual priority */}
                        <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                          <p>Transfer ID: {transfer.id}</p>
                          <p>Contract ID: {transfer.contractId}</p>
                        </div>

                        {transfer.isCompleted && (
                          <p className="text-xs text-green-600 font-medium mt-2">✓ Transfer completed</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {transferProcesses.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No transfer processes available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Catalog Search Dialog */}
      <CatalogSearchDialog
        open={isCatalogSearchOpen}
        onOpenChange={setIsCatalogSearchOpen}
        onSearch={handleCatalogSearch}
        defaultCounterPartyId={lastCounterPartyId}
        defaultCounterPartyAddress={lastCounterPartyAddress}
      />

      {/* Negotiation Dialog */}
      {selectedAssetForNegotiation && (
        <NegotiationDialog
          open={isNegotiationDialogOpen}
          onOpenChange={setIsNegotiationDialogOpen}
          onNegotiate={handleNegotiate}
          assetId={selectedAssetForNegotiation.id}
          assetName={selectedAssetForNegotiation.name || selectedAssetForNegotiation.id}
          policy={selectedAssetForNegotiation.policy || {}}
          counterPartyId={lastCounterPartyId}
          counterPartyAddress={lastCounterPartyAddress}
        />
      )}

      {/* Transfer Dialog */}
      {selectedContractForTransfer && (
        <TransferDialog
          open={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
          onTransfer={handleTransfer}
          assetId={selectedContractForTransfer.assetId || "unknown"}
          contractId={selectedContractForTransfer.contractAgreementId || ""}
          counterPartyId={lastCounterPartyId}
          counterPartyAddress={lastCounterPartyAddress}
        />
      )}

      {/* Connectivity Check Dialog */}
      <ConnectivityCheckDialog open={isCheckDialogOpen} onOpenChange={setIsCheckDialogOpen} />

      {/* Flower Client Logs */}
      <FlowerClientLogs />
    </main>
  )
}

