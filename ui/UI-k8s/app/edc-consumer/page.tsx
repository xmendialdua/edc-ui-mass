"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Check,
  AlertCircle,
  RefreshCw,
  Terminal,
  Loader2,
  ChevronDown,
  Menu,
  Search,
  FileText,
  Database,
  Network,
  BarChart2,
  Download,
  Copy,
  ChevronUp,
  Clock,
  HelpCircle,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"

import { useLanguage } from "@/contexts/language-context"
import {
  checkConnectorReachable,
  getConnectorAddress,
  setConnectorAddress,
  queryCatalog,
  getContractNegotiations,
  getTransferProcesses,
  initiateNegotiation,
  initiateTransfer,
  pullData,
  terminateNegotiation,
  terminateTransfer,
} from "@/lib/api"

// Actualizar las importaciones para reflejar la nueva estructura de carpetas
import { CatalogSearchDialog } from "./catalog/catalog-search-dialog"
import { ConnectivityCheckDialog } from "./common/connectivity-check-dialog"
import { NegotiationDialog } from "./contracts/negotiation-dialog"
import { TransferDialog } from "./transfers/transfer-dialog"
import { TransferManagementInfo } from "./dataapps/transfer-management-info"
import { FlowerClientLogsDialog } from "./dataapps/flower-client-logs-dialog"
import { MLflowDialog } from "./dataapps/mlflow-dialog"

// Importar la configuración centralizada
import { connectorDefaults } from "@/edc-config"

// Importar la función para obtener el ID del conector
import { connectorCatalog } from "@/edc-config"

// Define a default value for lastCounterPartyId
const defaultCounterPartyId = "did:web:provider-identityhub%3A7083:provider"

// Función para obtener el ID del conector basado en la dirección
const getConnectorIdByAddress = (address: string): string => {
  // Buscar en el catálogo de conectores
  const connector = connectorCatalog.find(
    (c) => c.address === address || address.includes(c.address) || c.address.includes(address),
  )

  if (connector && connector.id) {
    console.log(`Found connector ID for address ${address}: ${connector.id}`)
    return connector.id
  }

  // Si no se encuentra, devolver el counterPartyId por defecto
  console.log(`No connector ID found for address ${address}, using default: ${defaultCounterPartyId}`)
  return defaultCounterPartyId
}

// Define types for our items
type CatalogItem = {
  id: string
  name: string
  description: string
  policy?: any
  expanded?: boolean
}

type ContractNegotiation = {
  id: string
  state: string
  contractAgreementId?: string
  assetId?: string
  assetName?: string
  createdAt: number
  errorDetail?: string | null
  agreementDetails?: any
  isTerminating?: boolean
  counterPartyAddress?: string
  counterPartyId?: string
}

type TransferProcess = {
  id: string
  state: string
  contractId: string
  assetId: string
  transferType?: string
  assetType?: "PULL" | "PUSH" | "FL-Service" | "Model" // Added asset type
  endpointUrl?: string
  createdAt: number
  isCompleted?: boolean
  isTerminating?: boolean
}

type EndpointDataReferenceEntry = {
  "@id": string
  "@type": string
  providerId: string
  assetId: string
  agreementId: string
  transferProcessId: string
  createdAt: number
  contractNegotiationId: string
}

type DataAddress = {
  "@type": string
  type: string
  endpoint: string
  authType: string
  endpointType: string
  authorization: string
}

// Mock data functions
const getMockCatalogItems = () => {
  return [
    {
      id: "asset-1",
      name: "Asset 1",
      description: "Description for Asset 1",
      policy: { "@id": "policy-1" },
    },
    {
      id: "asset-2",
      name: "Asset 2",
      description: "Description for Asset 2",
      policy: { "@id": "policy-2" },
    },
  ]
}

// Actualizar la función para usar datos mockeados más completos
const getMockContractNegotiations = () => {
  const now = Date.now()
  return [
    {
      id: "18bf27b3-2bd0-49dd-991e-4d8f347ec8ae",
      state: "FINALIZED",
      contractAgreementId: "13e79baa-d0cb-4a0f-8e23-c4d374158ef9",
      assetId: "model-animal-detector-v1-asset-3",
      assetName: "Animal Detection Model v1",
      createdAt: now - 1000 * 60 * 5, // 5 minutes ago
      errorDetail: null,
      counterPartyId: "BPNL000000000065",
      counterPartyAddress: "https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp",
      agreementDetails: {
        "@type": "ContractAgreement",
        "@id": "13e79baa-d0cb-4a0f-8e23-c4d374158ef9",
        assetId: "model-animal-detector-v1-asset-3",
        policy: {
          "@type": "Offer",
          "@id": "model-policy-1",
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
          target: "model-animal-detector-v1-asset-3",
        },
        contractSigningDate: now - 1000 * 60 * 6,
      },
    },
    {
      id: "29cf38c4-3ce0-58ee-882f-5e9f458ec9bf",
      state: "REQUESTED",
      assetId: "sensor-data-asset-2",
      assetName: "Manufacturing Sensor Data",
      createdAt: now - 1000 * 60 * 30, // 30 minutes ago
      errorDetail: null,
      counterPartyId: "BPNL000000000066",
      counterPartyAddress: "https://control-plane-connector2.dataspace-ikerlan.es/api/v1/dsp",
    },
    {
      id: "37df49d5-4df1-69ff-993g-6f0g569fd0cg",
      state: "DECLINED",
      assetId: "api-access-asset-3",
      assetName: "API Access Package",
      createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
      errorDetail: "Policy validation failed: constraints not satisfied",
      counterPartyId: "BPNL000000000067",
      counterPartyAddress: "https://control-plane-connector3.dataspace-ikerlan.es/api/v1/dsp",
    },
    {
      id: "48eg50e6-5ef2-70gg-094h-7g1h670ge1dh",
      state: "FINALIZED",
      contractAgreementId: "24f80cbb-e1dc-5b1f-9f34-d5e385d5e5f0",
      assetId: "fl-training-dataset-4",
      assetName: "Federated Learning Training Dataset",
      createdAt: now - 1000 * 60 * 60 * 24, // 1 day ago
      errorDetail: null,
      counterPartyId: "BPNL000000000068",
      counterPartyAddress: "https://control-plane-connector4.dataspace-ikerlan.es/api/v1/dsp",
      agreementDetails: {
        "@type": "ContractAgreement",
        "@id": "24f80cbb-e1dc-5b1f-9f34-d5e385d5e5f0",
        assetId: "fl-training-dataset-4",
        policy: {
          "@type": "Offer",
          "@id": "fl-policy-4",
          assigner: "did:web:provider-identityhub%3A7083:provider",
          permission: [],
          prohibition: [],
          obligation: {
            action: "use",
            constraint: {
              leftOperand: "DataAccess.level",
              operator: "eq",
              rightOperand: "training",
            },
          },
          target: "fl-training-dataset-4",
        },
        contractSigningDate: now - 1000 * 60 * 60 * 25,
      },
    },
    {
      id: "59fh61f7-6fg3-81hh-105i-8h2i781hf2ei",
      state: "ERROR",
      assetId: "image-dataset-5",
      assetName: "Image Classification Dataset",
      createdAt: now - 1000 * 60 * 60 * 48, // 2 days ago
      errorDetail: "Connection timeout during negotiation",
      counterPartyId: "BPNL000000000069",
      counterPartyAddress: "https://control-plane-connector5.dataspace-ikerlan.es/api/v1/dsp",
    },
    {
      id: "06e58f6b-4986-47ac-8219-7505cb8982f0",
      state: "FINALIZED",
      contractAgreementId: "06e58f6b-4986-47ac-8219-7505cb8982f0",
      assetId: "model-animal-detector-v1-asset-3",
      assetName: "Animal Detection Model v1",
      createdAt: now - 1000 * 60 * 60 * 72, // 3 days ago
      errorDetail: null,
      counterPartyId: "BPNL000000000065",
      counterPartyAddress: "https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp",
      agreementDetails: {
        "@type": "ContractAgreement",
        "@id": "06e58f6b-4986-47ac-8219-7505cb8982f0",
        assetId: "model-animal-detector-v1-asset-3",
        policy: {
          "@type": "Offer",
          "@id": "model-policy-1",
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
          target: "model-animal-detector-v1-asset-3",
        },
        contractSigningDate: now - 1000 * 60 * 60 * 73,
      },
    },
  ]
}

const getMockTransferProcesses = () => {
  return [
    {
      id: "transfer-1",
      state: "COMPLETED",
      contractId: "agreement-1",
      assetId: "asset-1",
      transferType: "PULL",
      createdAt: Date.now(),
    },
    {
      id: "transfer-2",
      state: "COMPLETED",
      contractId: "agreement-2",
      assetId: "asset-2",
      transferType: "PUSH",
      endpointUrl: "http://example.com",
      createdAt: Date.now(),
    },
  ]
}

// Consumer page component
export default function ConsumerPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [contractNegotiations, setContractNegotiations] = useState<ContractNegotiation[]>([])
  const [transferProcesses, setTransferProcesses] = useState<TransferProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [negotiationsLoading, setNegotiationsLoading] = useState(false)
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [apiMode, setApiMode] = useState<"mock" | "live">("live")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectorAddress, setConnectorAddressState] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("connectorAddress") || connectorDefaults.consumer
      : connectorDefaults.consumer,
  )
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false)
  const [isCatalogSearchOpen, setIsCatalogSearchOpen] = useState(false)
  const [isChangingConnector, setIsChangingConnector] = useState(false)
  const [previousConnectorAddress, setPreviousConnectorAddress] = useState(getConnectorAddress())
  const [connectorStatus, setConnectorStatus] = useState<"connected" | "disconnected" | "unknown">("unknown")
  const [failedConnectorAddress, setFailedConnectorAddress] = useState<string | null>(null)
  const [lastCounterPartyId, setLastCounterPartyId] = useState<string>(defaultCounterPartyId)
  const [lastCounterPartyAddress, setLastCounterPartyAddress] = useState<string>(
    "https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp",
  )
  const [isFlDataAppEnabled, setIsFlDataAppEnabled] = useState(true)

  // State for dialogs
  const [isNegotiationDialogOpen, setIsNegotiationDialogOpen] = useState(false)
  const [selectedAssetForNegotiation, setSelectedAssetForNegotiation] = useState<CatalogItem | null>(null)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [selectedContractForTransfer, setSelectedContractForTransfer] = useState<ContractNegotiation | null>(null)
  const [isFlowerLogsDialogOpen, setIsFlowerLogsDialogOpen] = useState(false)
  const [isMLflowDialogOpen, setIsMLflowDialogOpen] = useState(false)
  const [selectedAssetForLogs, setSelectedAssetForLogs] = useState<string>("")

  // Añadir estado para el panel de token PULL
  const [isPullPanelOpen, setIsPullPanelOpen] = useState(false)
  const [selectedPullTransfer, setSelectedPullTransfer] = useState<TransferProcess | null>(null)
  const [pullToken, setPullToken] = useState("")
  const [pullEndpoint, setPullEndpoint] = useState("")
  const [isGettingToken, setIsGettingToken] = useState(false)
  const [isPullingData, setIsPullingData] = useState(false)
  const [pullResponse, setPullResponse] = useState<any>(null)
  const [showResponseData, setShowResponseData] = useState(false)
  const [responseType, setResponseType] = useState<"text" | "binary" | "none" | "json">("none")

  useEffect(() => {
    setConnectorAddressState(getConnectorAddress())
    checkCurrentConnectorStatus()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("connectorAddress")) {
        localStorage.setItem("connectorAddress", connectorDefaults.consumer)
        setConnectorAddressState(connectorDefaults.consumer)
        setConnectorAddress(connectorDefaults.consumer)
      } else {
        setConnectorAddressState(getConnectorAddress())
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  const checkCurrentConnectorStatus = async () => {
    try {
      const currentAddress = getConnectorAddress()
      const isReachable = await checkConnectorReachable(currentAddress)

      if (isReachable) {
        setConnectorStatus("connected")
        setFailedConnectorAddress(null)
      } else {
        setConnectorStatus("disconnected")
        setFailedConnectorAddress(currentAddress)
      }
    } catch (error) {
      setConnectorStatus("disconnected")
      setFailedConnectorAddress(getConnectorAddress())
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (apiMode === "mock") {
        setCatalogItems(getMockCatalogItems())
        setContractNegotiations(getMockContractNegotiations())
        setTransferProcesses(getMockTransferProcesses())
        showSuccessMessage("Mock data loaded successfully")
      } else {
        try {
          console.log("Fetching data from API...")
          console.log("Current connector address:", getConnectorAddress())

          try {
            setNegotiationsLoading(true)
            const negotiationsData = await getContractNegotiations()
            console.log("Contract negotiations loaded:", negotiationsData)
            setContractNegotiations(negotiationsData)
          } catch (error) {
            console.error("Failed to load contract negotiations:", error)
            setError(`Failed to load contract negotiations: ${error instanceof Error ? error.message : String(error)}`)
            setContractNegotiations([])
          } finally {
            setNegotiationsLoading(false)
          }

          try {
            setTransfersLoading(true)
            const transfersData = await getTransferProcesses()
            console.log("Transfer processes loaded:", transfersData)
            setTransferProcesses(transfersData)
          } catch (error) {
            console.error("Failed to load transfer processes:", error)
            setError(`Failed to load transfer processes: ${error instanceof Error ? error.message : String(error)}`)
            setTransferProcesses([])
          } finally {
            setTransfersLoading(false)
          }

          showSuccessMessage("Data loaded from API successfully")
        } catch (error) {
          console.error("API error:", error)
          setError(`Failed to load data from API: ${error instanceof Error ? error.message : String(error)}`)

          setCatalogItems([])
          setContractNegotiations([])
          setTransferProcesses([])
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`)

      setCatalogItems([])
      setContractNegotiations([])
      setTransferProcesses([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleCatalogSearch = async (counterPartyId: string, counterPartyAddress: string) => {
    try {
      setCatalogLoading(true)
      setError(null)
      setLastCounterPartyId(counterPartyId)
      setLastCounterPartyAddress(counterPartyAddress)

      console.log(
        `Searching catalog with counterPartyId: ${counterPartyId}, counterPartyAddress: ${counterPartyAddress}`,
      )

      if (apiMode === "live") {
        try {
          const catalogData = await queryCatalog(counterPartyId, counterPartyAddress)
          console.log("Catalog data received:", catalogData)

          if (Array.isArray(catalogData) && catalogData.length > 0) {
            setCatalogItems(catalogData)
            showSuccessMessage("Catalog retrieved successfully")
          } else {
            console.warn("Empty catalog data received")
            setCatalogItems([])
            showSuccessMessage("No items found in catalog")
          }
        } catch (error) {
          console.error("Error querying catalog:", error)
          setError(`Failed to query catalog: ${error instanceof Error ? error.message : String(error)}`)
          setCatalogItems([])
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCatalogItems(getMockCatalogItems())
        showSuccessMessage("Mock catalog retrieved successfully")
      }
    } catch (error) {
      console.error("Error querying catalog:", error)
      setError(`Failed to query catalog: ${error instanceof Error ? error.message : String(error)}`)
      setCatalogItems([])
    } finally {
      setCatalogLoading(false)
    }
  }

  const toggleItemExpansion = (id: string) => {
    setCatalogItems((items) => items.map((item) => (item.id === id ? { ...item, expanded: !item.expanded } : item)))
  }

  const openNegotiationDialog = (asset: CatalogItem) => {
    console.log("Opening negotiation dialog for asset:", asset)
    console.log("Asset policy:", asset.policy)

    setSelectedAssetForNegotiation(asset)
    setIsNegotiationDialogOpen(true)
  }

  const handleNegotiate = async (policy: any) => {
    if (!selectedAssetForNegotiation) {
      console.error("No asset selected for negotiation")
      setError("No asset selected for negotiation")
      return
    }

    try {
      setNegotiationsLoading(true)
      setError(null)

      const currentAsset = selectedAssetForNegotiation

      console.log(`Initiating negotiation for asset: ${currentAsset.id}`)
      console.log(`Counter party ID: ${lastCounterPartyId}`)
      console.log(`Counter party address: ${lastCounterPartyAddress}`)
      console.log("Using policy from negotiation form:", policy)

      if (apiMode === "live") {
        try {
          await initiateNegotiation(currentAsset.id, lastCounterPartyId, lastCounterPartyAddress, policy)

          const updatedNegotiations = await getContractNegotiations()
          setContractNegotiations(updatedNegotiations)
          showSuccessMessage(`Negotiation initiated for asset ${currentAsset.id}`)

          setTimeout(async () => {
            console.log("Auto-refreshing negotiations after 3 seconds")
            try {
              const refreshedNegotiations = await getContractNegotiations()
              setContractNegotiations(refreshedNegotiations)
            } catch (error) {
              console.error("Error auto-refreshing negotiations:", error)
            }
          }, 3000)
        } catch (error) {
          console.error("Error initiating negotiation:", error)
          setError(`Failed to initiate negotiation: ${error instanceof Error ? error.message : String(error)}`)
        }
      } else {
        const mockNegotiation = {
          id: `neg-${Math.random().toString(36).substring(2, 9)}`,
          state: "REQUESTED",
          contractAgreementId: undefined,
          assetId: currentAsset.id,
          assetName: currentAsset.name || "Mock Asset",
          createdAt: Date.now(),
        }
        setContractNegotiations([mockNegotiation, ...contractNegotiations])
        showSuccessMessage(`Mock negotiation initiated for asset ${currentAsset.id}`)

        setTimeout(() => {
          console.log("Auto-refreshing mock negotiations after 3 seconds")
          const updatedMockNegotiation = {
            ...mockNegotiation,
            state: "FINALIZED",
            contractAgreementId: `agreement-${Math.random().toString(36).substring(2, 9)}`,
          }
          setContractNegotiations((prev) => [
            updatedMockNegotiation,
            ...prev.filter((n) => n.id !== mockNegotiation.id),
          ])
        }, 3000)
      }
    } catch (error) {
      console.error("Error initiating negotiation:", error)
      setError(`Failed to initiate negotiation: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setNegotiationsLoading(false)
    }
  }

  const openTransferDialog = (contract: ContractNegotiation) => {
    setSelectedContractForTransfer(contract)
    setIsTransferDialogOpen(true)
  }

  // Reemplazar la función handleTransfer con esta versión mejorada:
  const handleTransfer = async (
    assetId: string,
    contractId: string,
    counterPartyId: string,
    counterPartyAddress: string,
    transferType = "HttpData-PULL",
    serverAddress?: string,
  ) => {
    try {
      setTransfersLoading(true)
      setError(null)

      console.log(`Iniciando transferencia para asset: ${assetId}, contrato: ${contractId}`)
      console.log(`Counter party ID: ${counterPartyId}`)
      console.log(`Counter party address: ${counterPartyAddress}`)
      console.log(`Tipo de transferencia: ${transferType}`)
      if (serverAddress) {
        console.log(`Dirección del servidor: ${serverAddress}`)
      }

      if (!counterPartyAddress) {
        const errorMsg = "La dirección del counter party es requerida para la transferencia"
        console.error(errorMsg)
        setError(errorMsg)
        setTransfersLoading(false)
        return
      }

      if (apiMode === "live") {
        try {
          // Usar directamente el counterPartyId proporcionado en lugar de intentar obtenerlo de nuevo
          console.log(`Usando Counter Party ID proporcionado: ${counterPartyId}`)

          // Log de todos los parámetros antes de hacer la llamada a la API
          console.log("Parámetros de transferencia:", {
            contractId,
            assetId,
            counterPartyId,
            counterPartyAddress,
            transferType,
            serverAddress,
          })

          await initiateTransfer(
            contractId,
            assetId,
            counterPartyId, // Usar el ID proporcionado directamente
            counterPartyAddress,
            transferType,
            serverAddress,
          )

          const updatedTransfers = await getTransferProcesses()
          setTransferProcesses(updatedTransfers)
          showSuccessMessage(`Transferencia iniciada para el asset ${assetId}`)

          setTimeout(async () => {
            console.log("Auto-refrescando transferencias después de 3 segundos")
            try {
              const refreshedTransfers = await getTransferProcesses()
              setTransferProcesses(refreshedTransfers)
            } catch (error) {
              console.error("Error al auto-refrescar transferencias:", error)
            }
          }, 3000)
        } catch (error) {
          console.error("Error al iniciar la transferencia:", error)
          setError(`Error al iniciar la transferencia: ${error instanceof Error ? error.message : String(error)}`)
        }
      } else {
        // Código para modo mock (sin cambios)
        const mockTransfer = {
          id: `transfer-${Math.random().toString(36).substring(2, 9)}`,
          state: "REQUESTED",
          contractId: contractId,
          assetId: assetId,
          transferType: transferType.includes("PULL") ? "PULL" : "PUSH",
          createdAt: Date.now(),
        }
        setTransferProcesses([mockTransfer, ...transferProcesses])
        showSuccessMessage(`Transferencia mock iniciada para el asset ${assetId}`)

        setTimeout(() => {
          console.log("Auto-refrescando transferencias mock después de 3 segundos")
          const updatedMockTransfer = {
            ...mockTransfer,
            state: "COMPLETED",
          }
          setTransferProcesses((prev) => [updatedMockTransfer, ...prev.filter((t) => t.id !== mockTransfer.id)])
        }, 3000)
      }
    } catch (error) {
      console.error("Error al iniciar la transferencia:", error)
      setError(`Error al iniciar la transferencia: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setTransfersLoading(false)
    }
  }

  const handlePullButtonClick = (transfer: TransferProcess) => {
    setSelectedPullTransfer(transfer)
    setPullToken("")
    setPullEndpoint("")
    setPullResponse(null)
    setShowResponseData(false)
    setResponseType("none")
    setIsPullPanelOpen(true)
  }

  const handleGetToken = async (transfer: TransferProcess) => {
    if (!transfer) return

    setIsGettingToken(true)
    setPullToken("")
    setPullResponse(null)
    setShowResponseData(false)
    setResponseType("none")

    try {
      console.log(`Getting token for transfer: ${transfer.id}, contract: ${transfer.contractId}`)

      if (apiMode === "live") {
        const API_PROXY_URL = getApiProxyUrl()
        console.log(`Making EDRs request to: ${API_PROXY_URL}/v3/edrs/request`)

        const edrsResponse = await fetch(`${API_PROXY_URL}/v3/edrs/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": "password",
            "X-Connector-Address": getConnectorAddress(),
          },
          body: JSON.stringify({
            "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
            "@type": "QuerySpec",
          }),
        }).then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch EDRs: ${res.status} ${res.statusText}`)
          }
          return res.json()
        })

        console.log("EDRs response:", edrsResponse)

        if (!Array.isArray(edrsResponse) || edrsResponse.length === 0) {
          throw new Error("No endpoint data references found")
        }

        const matchingEdr = edrsResponse.find(
          (edr: EndpointDataReferenceEntry) => edr.agreementId === transfer.contractId,
        )

        if (!matchingEdr) {
          throw new Error(`No matching endpoint data reference found for contract ${transfer.contractId}`)
        }

        console.log("Matching EDR:", matchingEdr)

        console.log(
          `Making data address request to: ${API_PROXY_URL}/v3/edrs/${matchingEdr.transferProcessId}/dataaddress`,
        )

        const dataAddressResponse = await fetch(
          `${API_PROXY_URL}/v3/edrs/${matchingEdr.transferProcessId}/dataaddress`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": "password",
              "X-Connector-Address": getConnectorAddress(),
            },
          },
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch data address: ${res.status} ${res.statusText}`)
          }
          return res.json()
        })

        console.log("Data address response:", dataAddressResponse)

        if (!dataAddressResponse || !dataAddressResponse.authorization) {
          throw new Error("No authorization token found in data address")
        }

        // Después de extraer el token de autorización
        const authToken = dataAddressResponse.authorization

        // Extraer también el endpoint
        const endpoint = dataAddressResponse.endpoint
        if (endpoint) {
          console.log("Endpoint extracted from response:", endpoint)
          setPullEndpoint(endpoint)
        }

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(authToken)
          showSuccessMessage("Authorization token copied to clipboard")
        }

        setPullToken(authToken)
        return authToken
      } else {
        // Código para modo mock (sin cambios)
        const mockToken = `eyJraWQiOiJkaWQ6d2ViOnByb3ZpZGVyLWlkZW50aXR5aHViJTNBNzA4Mzpwcm92aWRlciNrZXktMSIsImFsZyI6IkVTMjU2In0.eyJpc3MiOiJkaWQ6d2ViOnByb3ZpZGVyLWlkZW50aXR5aHViJTNBNzA4Mzpwcm92aWRlciIsImF1ZCI6ImRpZDp3ZWI6Y29uc3VtZXItaWRlbnRpdHlodWIlM0E3MDgzOmNvbnN1bWVyIiwic3ViIjoiZGlkOndlYjpwcm92aWRlci1pZGVudGl0eXh1YiJTNBNzA4Mzpwcm92aWRlciIsImlhdCI6MTc0NDI3MzIzMjc1OCwianRpIjoiNWQ5MGYxNzgtOTY4NS00YTM0LThmM2QtODJjYjI0ZGI0MTY2In0.YqBN15z1iT5IfP3xehLBW1f98yej5XhbBFerggOOZjKgtAiY6_hIwdPf3ODALaIfO5TZ9jRrYlvNcczUsQMsiA`

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(mockToken)
          showSuccessMessage("Mock authorization token copied to clipboard")
        }

        setPullToken(mockToken)
        return mockToken
      }
    } catch (error) {
      console.error("Error getting token:", error)
      setError(`Failed to get token: ${error instanceof Error ? error.message : String(error)}`)
      return null
    } finally {
      setIsGettingToken(false)
    }
  }

  // Modificar la función handlePullData para mostrar más información en la interfaz de usuario

  // Buscar la función handlePullData y modificarla para mostrar más información de depuración
  const handlePullData = async () => {
    if (!selectedPullTransfer || !pullToken || !pullEndpoint) return

    setIsPullingData(true)
    setPullResponse(null)
    setShowResponseData(false)
    setResponseType("none")

    try {
      console.log(`Pulling data for transfer: ${selectedPullTransfer.id} with token`)
      console.log(`Using endpoint URL: ${pullEndpoint}`)

      // Mostrar información del token para depuración
      const tokenPreview = pullToken.substring(0, 30) + "..."
      console.log(`Token preview: ${tokenPreview}`)

      if (apiMode === "live") {
        // Añadir información de depuración a la interfaz
        setPullResponse(
          "Iniciando solicitud PULL...\n" +
            `Endpoint: ${pullEndpoint}\n` +
            `Token (primeros 30 caracteres): ${tokenPreview}\n` +
            "Esperando respuesta...",
        )
        setResponseType("text")
        setShowResponseData(true)

        try {
          // Usar la función pullData que ahora utiliza el endpoint personalizado
          const result = await pullData(selectedPullTransfer.id, pullToken, pullEndpoint)

          if (result.type === "json") {
            setPullResponse(result.data)
            setResponseType("json")
            setShowResponseData(true)
          } else if (result.type === "text") {
            setPullResponse(result.data)
            setResponseType("text")
            setShowResponseData(true)
          } else if (result.type === "binary") {
            // Para archivos binarios, crear un enlace de descarga
            const blob = result.data
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = result.filename || `${selectedPullTransfer.assetId}-data`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            setPullResponse(`File downloaded: ${result.filename || `${selectedPullTransfer.assetId}-data`}`)
            setResponseType("binary")
            setShowResponseData(true)
          }

          showSuccessMessage(`Data pulled successfully for ${selectedPullTransfer.assetId}`)
        } catch (error: any) {
          console.error("Error pulling data:", error)
          setError(`Failed to pull data: ${error instanceof Error ? error.message : String(error)}`)

          // Mostrar información detallada del error
          setPullResponse(
            `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
              "Información de depuración:\n" +
              `Endpoint: ${pullEndpoint}\n` +
              `Token (primeros 30 caracteres): ${tokenPreview}\n` +
              "Revisa la consola del navegador para más detalles.",
          )
          setResponseType("text")
          setShowResponseData(true)
        }
      } else {
        // Código para modo mock (sin cambios)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Simular diferentes tipos de respuesta aleatoriamente
        const responseTypes = ["json", "text", "binary"]
        const randomType = responseTypes[Math.floor(Math.random() * responseTypes.length)]

        if (randomType === "json") {
          const mockJsonData = {
            assetId: selectedPullTransfer.assetId,
            timestamp: new Date().toISOString(),
            data: {
              value: Math.random() * 100,
              unit: "units",
              status: "OK",
            },
          }
          setPullResponse(mockJsonData)
          setResponseType("json")
        } else if (randomType === "text") {
          const mockTextData = `# Data for ${selectedPullTransfer.assetId}

This is a sample text response for the requested asset.
Timestamp: ${new Date().toISOString()}
Status: OK
Value: ${Math.random() * 100} units`
          setPullResponse(mockTextData)
          setResponseType("text")
        } else {
          // Simular descarga de archivo
          setPullResponse(`File downloaded: ${selectedPullTransfer.assetId}-data.bin`)
          setResponseType("binary")
          showSuccessMessage(`Mock file downloaded for ${selectedPullTransfer.assetId}`)
        }

        setShowResponseData(true)
      }
    } catch (error) {
      console.error("Error pulling data:", error)
      setError(`Failed to pull data: ${error instanceof Error ? error.message : String(error)}`)
      setPullResponse(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setResponseType("text")
      setShowResponseData(true)
    } finally {
      setIsPullingData(false)
    }
  }

  const getFilenameFromResponse = (response: Response): string => {
    const contentDisposition = response.headers.get("content-disposition")
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/)
      if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1]
      }
    }

    const contentType = response.headers.get("content-type")
    if (contentType) {
      const extension = getExtensionFromContentType(contentType)
      if (extension) {
        return `${selectedPullTransfer?.assetId || "download"}.${extension}`
      }
    }

    return `${selectedPullTransfer?.assetId || "download"}.bin`
  }

  const getExtensionFromContentType = (contentType: string): string | null => {
    if (contentType.includes("application/json")) return "json"
    if (contentType.includes("text/plain")) return "txt"
    if (contentType.includes("text/csv")) return "csv"
    if (contentType.includes("application/xml")) return "xml"
    if (contentType.includes("application/pdf")) return "pdf"
    if (contentType.includes("image/jpeg")) return "jpg"
    if (contentType.includes("image/png")) return "png"
    if (contentType.includes("application/zip")) return "zip"
    return null
  }

  const handleViewLogs = (assetId: string) => {
    setSelectedAssetForLogs(assetId)
    setIsFlowerLogsDialogOpen(true)
  }

  const handleOpenMLflow = (assetId: string) => {
    setSelectedAssetForLogs(assetId)
    setIsMLflowDialogOpen(true)
  }

  const handleTerminateNegotiation = async (negotiation: ContractNegotiation) => {
    if (!negotiation || !negotiation.id) return

    try {
      setNegotiationsLoading(true)
      setError(null)

      console.log(`Terminating negotiation: ${negotiation.id}`)

      if (apiMode === "live") {
        try {
          await terminateNegotiation(negotiation.id)

          const updatedNegotiations = await getContractNegotiations()
          setContractNegotiations(updatedNegotiations)
          showSuccessMessage(`Negotiation ${negotiation.id} terminated successfully`)

          setTimeout(async () => {
            console.log("Auto-refreshing negotiations after 3 seconds")
            try {
              const refreshedNegotiations = await getContractNegotiations()
              setContractNegotiations(refreshedNegotiations)
            } catch (error) {
              console.error("Error auto-refreshing negotiations:", error)
            }
          }, 3000)
        } catch (error) {
          console.error("Error terminating negotiation:", error)
          setError(`Failed to terminate negotiation: ${error instanceof Error ? error.message : String(error)}`)
        }
      } else {
        const updatedNegotiation = {
          ...negotiation,
          state: "TERMINATED",
          isTerminating: false,
        }
        setContractNegotiations((prev) => [updatedNegotiation, ...prev.filter((n) => n.id !== negotiation.id)])
        showSuccessMessage(`Mock negotiation terminated for negotiation ${negotiation.id}`)
      }
    } catch (error) {
      console.error("Error terminating negotiation:", error)
      setError(`Failed to terminate negotiation: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setNegotiationsLoading(false)
    }
  }

  const handleTerminateTransfer = async (transfer: TransferProcess) => {
    if (!transfer || !transfer.id) return

    try {
      setTransfersLoading(true)
      setError(null)

      console.log(`Terminating transfer: ${transfer.id}`)

      if (apiMode === "live") {
        try {
          await terminateTransfer(transfer.id)

          const updatedTransfers = await getTransferProcesses()
          setTransferProcesses(updatedTransfers)
          showSuccessMessage(`Transfer ${transfer.id} terminated successfully`)

          setTimeout(async () => {
            console.log("Auto-refreshing transfers after 3 seconds")
            try {
              const refreshedTransfers = await getTransferProcesses()
              setTransferProcesses(refreshedTransfers)
            } catch (error) {
              console.error("Error auto-refreshing transfers:", error)
            }
          }, 3000)
        } catch (error) {
          console.error("Error terminating transfer:", error)
          setError(`Failed to terminate transfer: ${error instanceof Error ? error.message : String(error)}`)
        }
      } else {
        const updatedTransfer = {
          ...transfer,
          state: "TERMINATED",
          isTerminating: false,
        }
        setTransferProcesses((prev) => [updatedTransfer, ...prev.filter((t) => t.id !== transfer.id)])
        showSuccessMessage(`Mock transfer terminated for transfer ${transfer.id}`)
      }
    } catch (error) {
      console.error("Error terminating transfer:", error)
      setError(`Failed to terminate transfer: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setTransfersLoading(false)
    }
  }

  const handleConnectorAddressChange = (address: string) => {
    setConnectorAddressState(address)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleConnectorChange()
    }
  }

  const handleConnectorChange = async () => {
    setIsChangingConnector(true)
    setPreviousConnectorAddress(getConnectorAddress())

    try {
      setConnectorAddress(connectorAddress)
      localStorage.setItem("connectorAddress", connectorAddress)

      const isReachable = await checkConnectorReachable(connectorAddress)

      if (isReachable) {
        setConnectorStatus("connected")
        setFailedConnectorAddress(null)
        showSuccessMessage("Connector address updated successfully")
      } else {
        setConnectorStatus("disconnected")
        setFailedConnectorAddress(connectorAddress)
        setError("Failed to connect to the new connector address")
      }
    } catch (error) {
      console.error("Error changing connector address:", error)
      setError(`Failed to change connector address: ${String(error)}`)
      setConnectorStatus("disconnected")
      setFailedConnectorAddress(connectorAddress)
    } finally {
      setIsChangingConnector(false)
    }
  }

  const getManageableTransfers = () => {
    return transferProcesses.filter(
      (transfer) =>
        // Solo incluir transferencias de tipo FL-Service o Model
        (transfer.assetType === "FL-Service" ||
          transfer.assetType === "Model" ||
          transfer.transferType?.includes("FL-DataApp") ||
          transfer.transferType?.includes("Model-DataApp") ||
          (transfer.assetId &&
            (transfer.assetId.toLowerCase().includes("fl-") ||
              transfer.assetId.toLowerCase().includes("flower") ||
              transfer.assetId.toLowerCase().includes("model")))) &&
        // Solo incluir transferencias STARTED o COMPLETED, excluir TERMINATED
        (transfer.state === "STARTED" || transfer.state === "COMPLETED") &&
        // Excluir transferencias terminadas
        transfer.state !== "TERMINATED",
    )
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

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)
  }

  const getApiProxyUrl = () => {
    // Cuando se ejecuta en el navegador, usar el origen actual
    if (typeof window !== "undefined") {
      // Actualizar para usar la nueva ruta connector-proxy en lugar de api-proxy
      return `${window.location.origin}/connector-proxy`
    }
    // Fallback para renderizado del lado del servidor
    return "/connector-proxy"
  }

  const navigateToProvider = () => {
    router.push("/edc-provider")
  }

  const refreshData = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const toggleApiMode = () => {
    setApiMode((prevMode) => (prevMode === "live" ? "mock" : "live"))
  }

  return (
    <main className="min-h-screen flex flex-col pb-16">
      {/* Top bar with lime green accent border */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white p-4 flex items-center justify-between border-b-2 border-lime-500">
        {/* Logo with hover effect and link */}
        <Link
          href="https://www.ikerlan.es/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-transform duration-300 hover:scale-110"
        >
          <div className="h-12 w-36 relative">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ikerlan_BRTA_V2-kEfpkdzKLTDdzKZuFRUfTexpzGyQMk.png"
              alt="Ikerlan Logo"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </Link>

        {/* Centered title with larger font */}
        <div className="flex-1 flex justify-center">
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-2xl font-bold hover:bg-gray-800 px-6 py-2">
                  Consumer Mode
                  <ChevronDown className="ml-2 h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 bg-black border-gray-700 text-white">
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                  onClick={navigateToProvider}
                >
                  Provider Mode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Settings dropdown with hamburger menu in green */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-gray-800">
                <Menu className="h-6 w-6 text-lime-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black border-gray-700 text-white">
              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                onClick={refreshData}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {t("refreshData")}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                onClick={() => setIsCheckDialogOpen(true)}
              >
                <Terminal className="h-4 w-4 mr-2" />
                {t("checkApi")}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                onClick={toggleApiMode}
              >
                <div className={`h-3 w-3 rounded-full mr-2 ${apiMode === "live" ? "bg-lime-500" : "bg-gray-500"}`} />
                {apiMode === "live" ? t("switchToMock") : t("switchToLive")}
              </DropdownMenuItem>

              {/* Proper horizontal separator */}
              <DropdownMenuSeparator className="bg-gray-700 my-1" />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="hover:bg-gray-800 focus:bg-gray-800 data-[state=open]:bg-lime-500 data-[state=open]:text-black font-medium">
                  Data Apps
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-black border-gray-700 text-white">
                  <div className="px-2 py-1.5 flex items-center space-x-2">
                    <Checkbox
                      id="fl-data-app"
                      checked={isFlDataAppEnabled}
                      onCheckedChange={(checked) => setIsFlDataAppEnabled(checked === true)}
                      className="data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
                    />
                    <Label htmlFor="fl-data-app" className="text-sm cursor-pointer">
                      FL Data App
                    </Label>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="bg-gray-700 my-1" />

              <DropdownMenuItem className="flex items-center hover:bg-gray-800 focus:bg-gray-800">
                {t("language")}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800 pl-6"
                onClick={() => setLanguage("en")}
              >
                <div className={`h-3 w-3 rounded-full mr-2 ${language === "en" ? "bg-lime-500" : "bg-gray-500"}`} />
                {t("english")}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800 pl-6"
                onClick={() => setLanguage("es")}
              >
                <div className={`h-3 w-3 rounded-full mr-2 ${language === "es" ? "bg-lime-500" : "bg-gray-500"}`} />
                {t("spanish")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-6 pt-24 bg-white">
        {/* Connector Status Banner */}
        <div
          className={`mb-6 p-4 rounded-md flex items-center ${
            connectorStatus === "connected"
              ? "bg-green-50 border border-green-200 text-green-700"
              : connectorStatus === "disconnected"
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-gray-50 border border-gray-200 text-gray-700"
          }`}
        >
          {connectorStatus === "connected" ? (
            <Check className="w-5 h-5 mr-2 text-green-500" />
          ) : connectorStatus === "disconnected" ? (
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2 text-gray-500" />
          )}
          <div>
            <span className="font-medium">Connector Status: </span>
            {connectorStatus === "connected"
              ? `Connected to ${getConnectorAddress()}`
              : connectorStatus === "disconnected"
                ? `No connector found at ${failedConnectorAddress || getConnectorAddress()}`
                : "Checking connector status..."}
          </div>
        </div>

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
                <span className="font-medium">{t("apiMode")}</span>{" "}
                <span className={apiMode === "live" ? "text-lime-600 font-medium" : "text-gray-600"}>
                  {apiMode === "live" ? t("liveApi") : t("mockData")}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label htmlFor="connector-address" className="whitespace-nowrap font-medium">
                  {t("connectorAddress")}
                </Label>
                <div className="flex-1 flex gap-2">
                  <Input
                    id="connector-address"
                    value={connectorAddress}
                    onChange={(e) => handleConnectorAddressChange(e.target.value)}
                    onKeyDown={handleKeyDown}
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
                        {t("checking")}
                      </>
                    ) : (
                      t("changeConnector")
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
          <div className={`grid grid-cols-1 ${isFlDataAppEnabled ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6`}>
            {/* Provider Catalog Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Provider Catalog</h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCatalogSearchOpen(true)}
                  className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {catalogLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
                  </div>
                ) : catalogItems.length > 0 ? (
                  catalogItems.map((item) => {
                    const isFlService =
                      item.id.toLowerCase().includes("fl-") ||
                      item.id.toLowerCase().includes("flower") ||
                      item.name.toLowerCase().includes("federated") ||
                      item.name.toLowerCase().includes("fl service")

                    const isModel = item.id.toLowerCase().includes("model") || item.name.toLowerCase().includes("ml")

                    let assetTypeIcon = <Database className="h-5 w-5 text-white" />

                    if (isFlService) {
                      assetTypeIcon = <Network className="h-5 w-5 text-white" />
                    } else if (isModel) {
                      assetTypeIcon = <BarChart2 className="h-5 w-5 text-white" />
                    }

                    const contractId = item.policy?.["@id"] || "No contract ID available"

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded border hover:border-lime-300 transition-colors flex items-start relative overflow-hidden mb-3"
                      >
                        <div
                          className={`w-6 h-full absolute left-0 top-0 bottom-0 ${
                            isFlService ? "bg-teal-500" : isModel ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                        ></div>

                        <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                          {assetTypeIcon}
                        </div>

                        <div className="flex-1 pl-8 p-3">
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            <span className="font-medium">ID:</span> {item.id}
                          </p>
                          <p className="text-xs text-gray-400" style={{ wordBreak: "break-all" }}>
                            <span className="font-medium">Contract ID:</span> {contractId}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openNegotiationDialog(item)}
                            className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300 mt-2"
                          >
                            Negotiate
                          </Button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No catalog items available</p>
                    <p className="text-sm mt-1">Click the search button to query the provider catalog</p>
                  </div>
                )}
              </div>
            </div>

            {/* Negotiated Contracts Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Negotiated Contracts</h2>
              </div>
              <div className="space-y-3">
                {negotiationsLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
                  </div>
                ) : contractNegotiations.length > 0 ? (
                  contractNegotiations
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((negotiation) => {
                      const assetId = negotiation.assetId || ""
                      const assetName = negotiation.assetName || ""
                      const isRequested =
                        negotiation.state === "REQUESTED" ||
                        negotiation.state === "INITIATED" ||
                        negotiation.state === "REQUESTING" ||
                        negotiation.state === "INITIAL"
                      const isUnknownAsset = !assetId || !assetName

                      const isFlService =
                        assetId.toLowerCase().includes("fl-") ||
                        assetId.toLowerCase().includes("flower") ||
                        assetName.toLowerCase().includes("federated") ||
                        assetName.toLowerCase().includes("fl service")

                      const isModel = assetId.toLowerCase().includes("model") || assetName.toLowerCase().includes("ml")

                      let assetTypeIcon = <Database className="h-5 w-5 text-white" />
                      let barColor = "bg-amber-500"

                      if (isRequested || isUnknownAsset) {
                        assetTypeIcon = isRequested ? (
                          <Clock className="h-5 w-5 text-white" />
                        ) : (
                          <HelpCircle className="h-5 w-5 text-white" />
                        )
                        barColor = "bg-gray-400"
                      } else if (isFlService) {
                        assetTypeIcon = <Network className="h-5 w-5 text-white" />
                        barColor = "bg-teal-500"
                      } else if (isModel) {
                        assetTypeIcon = <BarChart2 className="h-5 w-5 text-white" />
                        barColor = "bg-indigo-500"
                      }

                      return (
                        <ContextMenu key={negotiation.id}>
                          <ContextMenuTrigger>
                            <div className="bg-white rounded border hover:border-lime-300 transition-colors flex items-start relative overflow-hidden mb-3">
                              <div className={`w-6 h-full absolute left-0 top-0 bottom-0 ${barColor}`}></div>

                              <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                                {assetTypeIcon}
                              </div>

                              <div className="flex-1 pl-8 p-3 pb-12">
                                <h3 className="font-medium">
                                  {negotiation.state === "TERMINATED"
                                    ? "Failed Negotiation"
                                    : negotiation.assetName || negotiation.assetId || "Unknown Asset"}
                                </h3>
                                <span className="text-xs text-gray-500">{formatTimeAgo(negotiation.createdAt)}</span>

                                {negotiation.errorDetail && (
                                  <p className="text-xs text-red-600 mt-1 italic">Error: {negotiation.errorDetail}</p>
                                )}

                                <div className="mt-1 text-xs text-gray-500">
                                  <p>
                                    <span className="font-medium">Negotiation ID:</span> {negotiation.id}
                                  </p>
                                  {negotiation.contractAgreementId && (
                                    <p>
                                      <span className="font-medium">Agreement ID:</span>{" "}
                                      {negotiation.contractAgreementId}
                                    </p>
                                  )}
                                  {negotiation.counterPartyAddress && (
                                    <p>
                                      <span className="font-medium">Counter Party Address:</span>{" "}
                                      {negotiation.counterPartyAddress}
                                    </p>
                                  )}
                                  {negotiation.counterPartyId && (
                                    <p>
                                      <span className="font-medium">Counter Party ID:</span>{" "}
                                      {negotiation.counterPartyId}
                                    </p>
                                  )}
                                </div>
                                {negotiation.state === "FINALIZED" && negotiation.contractAgreementId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openTransferDialog(negotiation)}
                                    className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300 absolute bottom-3 right-3"
                                  >
                                    Transfer
                                  </Button>
                                )}
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => handleTerminateNegotiation(negotiation)}
                              disabled={negotiation.isTerminating || negotiation.state === "TERMINATED"}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Terminate Negotiation
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })
                ) : (
                  <p className="text-center text-gray-500 py-4">No contract negotiations available</p>
                )}
              </div>
            </div>

            {/* Initiated Transfers Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">Initiated Transfers</h2>
              </div>
              <div className="space-y-3">
                {transfersLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
                  </div>
                ) : transferProcesses.length > 0 ? (
                  transferProcesses
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((transfer) => {
                      const assetId = transfer.assetId || ""

                      const isInProgress =
                        transfer.state === "INITIAL" ||
                        transfer.state === "REQUESTED" ||
                        transfer.state === "REQUESTING"

                      const isFlService =
                        assetId.toLowerCase().includes("fl-") ||
                        assetId.toLowerCase().includes("flower") ||
                        transfer.assetType === "FL-Service"

                      const isModel = assetId.toLowerCase().includes("model") || transfer.assetType === "Model"

                      let assetTypeIcon = <Database className="h-5 w-5 text-white" />
                      let barColor = "bg-amber-500"

                      if (isInProgress) {
                        assetTypeIcon = <Clock className="h-5 w-5 text-white" />
                        barColor = "bg-gray-400"
                      } else if (isFlService) {
                        assetTypeIcon = <Network className="h-5 w-5 text-white" />
                        barColor = "bg-teal-500"
                      } else if (isModel) {
                        assetTypeIcon = <BarChart2 className="h-5 w-5 text-white" />
                        barColor = "bg-indigo-500"
                      }

                      return (
                        <ContextMenu key={transfer.id}>
                          <ContextMenuTrigger>
                            <div className="bg-white rounded border hover:border-lime-300 transition-colors flex items-start relative overflow-hidden mb-3">
                              <div className={`w-6 h-full absolute left-0 top-0 bottom-0 ${barColor}`}></div>

                              <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                                {assetTypeIcon}
                              </div>

                              <div className="flex-1 pl-8 p-3 pb-12">
                                <h3 className="font-medium">
                                  {transfer.assetId}{" "}
                                  <span className="text-gray-500">
                                    (
                                    {transfer.transferType?.includes("PUSH")
                                      ? "PUSH"
                                      : transfer.transferType?.includes("FL-DataApp")
                                        ? "FL-DataApp"
                                        : transfer.transferType?.includes("Model-DataApp")
                                          ? "Model-DataApp"
                                          : "PULL"}
                                    )
                                  </span>
                                </h3>
                                <span className="text-xs text-gray-500">{formatTimeAgo(transfer.createdAt)}</span>

                                {transfer.transferType?.includes("PUSH") && transfer.endpointUrl && (
                                  <p className="text-xs text.gray-600 mt-1">Endpoint: {transfer.endpointUrl}</p>
                                )}

                                <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                                  <p>Transfer ID: {transfer.id}</p>
                                  <p>Agreement ID: {transfer.contractId}</p>
                                </div>

                                {transfer.isCompleted && (
                                  <p className="text-xs text-green-600 font-medium mt-1">✓ Transfer completed</p>
                                )}

                                <Badge
                                  className={`absolute top-3 right-3 ${
                                    transfer.state === "STARTED" ||
                                    transfer.state === "COMPLETED" ||
                                    transfer.isCompleted
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : "bg-red-100 text-red-800 hover:bg-red-100"
                                  }`}
                                >
                                  {transfer.isTerminating ? (
                                    <span className="flex items-center">
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Terminating...
                                    </span>
                                  ) : (
                                    transfer.state
                                  )}
                                </Badge>

                                {transfer.assetType === "PULL" && transfer.state === "STARTED" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePullButtonClick(transfer)}
                                    className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300 absolute bottom-3 right-3"
                                  >
                                    PULL
                                  </Button>
                                )}
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => handleTerminateTransfer(transfer)}
                              disabled={transfer.isTerminating || transfer.state === "TERMINATED"}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Terminate Transfer
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })
                ) : (
                  <p className="text-center text-gray-500 py-4">No transfer processes available</p>
                )}
              </div>
            </div>

            {/* Transfer Management Column - Moved to the right */}
            {isFlDataAppEnabled && (
              <div className="border rounded-lg p-4 bg-lime-50 border-t-2 border-t-lime-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-lime-700">Data Applications</h2>
                  <TransferManagementInfo />
                </div>
                <div className="space-y-3">
                  {transfersLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
                    </div>
                  ) : getManageableTransfers().length > 0 ? (
                    getManageableTransfers()
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((transfer) => {
                        const isFlService =
                          transfer.assetType === "FL-Service" ||
                          transfer.transferType === "FL-DataApp" ||
                          (transfer.assetId && transfer.assetId.toLowerCase().includes("fl-"))

                        const isModel =
                          transfer.assetType === "Model" ||
                          transfer.transferType === "Model-DataApp" ||
                          (transfer.assetId && transfer.assetId.toLowerCase().includes("model"))

                        const appIcon = isFlService ? (
                          <Network className="h-5 w-5 text-white" />
                        ) : (
                          <BarChart2 className="h-5 w-5 text-white" />
                        )

                        const barColor = isFlService ? "bg-teal-500" : "bg-indigo-500"

                        const badgeText = isFlService ? "FL-Service" : "Model"

                        return (
                          <div
                            key={transfer.id}
                            className="bg-white rounded border hover:border-lime-300 transition-colors flex items-start relative overflow-hidden mb-3"
                          >
                            {/* Barra lateral de color */}
                            <div className={`w-6 h-full absolute left-0 top-0 bottom-0 ${barColor}`}></div>

                            {/* Icono centrado sobre la barra */}
                            <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                              {appIcon}
                            </div>

                            {/* Contenido con padding ajustado para la barra */}
                            <div className="flex-1 pl-8 p-3 pb-12">
                              <h3 className="font-medium">{transfer.assetId}</h3>
                              <span className="text-xs text-gray-500">{formatTimeAgo(transfer.createdAt)}</span>

                              <p className="text-xs text-gray-400 mt-1">
                                <span className="font-medium">Transfer ID:</span> {transfer.id.substring(0, 8)}...
                              </p>
                              <p className="text-xs text-gray-400">
                                <span className="font-medium">Contract ID:</span> {transfer.contractId.substring(0, 8)}
                                ...
                              </p>
                              <p className="text-xs text-gray-400">
                                <span className="font-medium">Type:</span> {transfer.transferType || "Unknown"}
                              </p>

                              <Badge className="absolute top-3 right-3 bg-lime-100 text-lime-800 hover:bg-lime-100">
                                {badgeText}
                              </Badge>

                              {/* Botones específicos según el tipo */}
                              {isFlService && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewLogs(transfer.assetId)}
                                  className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300 absolute bottom-3 right-3"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  View Logs
                                </Button>
                              )}

                              {isModel && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenMLflow(transfer.assetId)}
                                  className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300 absolute bottom-3 right-3"
                                >
                                  <BarChart2 className="h-3 w-3 mr-1" />
                                  See Model
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <p>No data applications available</p>
                      <p className="text-sm mt-1">FL and Model transfers will appear here when initiated</p>
                    </div>
                  )}
                </div>
              </div>
            )}
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

      {/* Flower Client Logs Dialog */}
      <FlowerClientLogsDialog
        open={isFlowerLogsDialogOpen}
        onOpenChange={setIsFlowerLogsDialogOpen}
        assetId={selectedAssetForLogs}
      />

      {/* MLflow Dialog */}
      <MLflowDialog
        open={isMLflowDialogOpen}
        onOpenChange={setIsMLflowDialogOpen}
        assetId={selectedAssetForLogs}
        modelId={`model-${selectedAssetForLogs}`}
      />

      {/* Connectivity Check Dialog */}
      <ConnectivityCheckDialog open={isCheckDialogOpen} onOpenChange={setIsCheckDialogOpen} />

      {/* PULL Token Panel */}
      {isPullPanelOpen && selectedPullTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full border-2 border-lime-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-lime-700">PULL Data for {selectedPullTransfer.assetId}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPullPanelOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="pull-token" className="text-gray-700">
                  Authorization Token
                </Label>
                <div className="flex mt-1">
                  <Input
                    id="pull-token"
                    value={pullToken}
                    onChange={(e) => setPullToken(e.target.value)}
                    placeholder="Paste or generate authorization token"
                    className="flex-1 mr-2 focus-visible:ring-lime-500 border-gray-300"
                  />
                  <Button
                    onClick={() => handleGetToken(selectedPullTransfer)}
                    disabled={isGettingToken}
                    className="bg-lime-600 hover:bg-lime-700 text-white"
                  >
                    {isGettingToken ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {isGettingToken ? "Getting..." : "Get Token"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Click "Get Token" to generate and copy an authorization token to your clipboard
                </p>
                {pullToken && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-xs font-medium text-gray-700">Información del token:</p>
                    <div className="mt-1 text-xs text-gray-600 break-all">
                      <p>
                        <span className="font-medium">Primeros 30 caracteres:</span> {pullToken.substring(0, 30)}...
                      </p>
                      <p>
                        <span className="font-medium">Longitud:</span> {pullToken.length} caracteres
                      </p>
                      <p>
                        <span className="font-medium">Formato en la solicitud:</span> Bearer{" "}
                        {pullToken.substring(0, 15)}...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {pullEndpoint && (
                <div className="mt-3">
                  <Label htmlFor="pull-endpoint" className="text-gray-700">
                    Endpoint URL
                  </Label>
                  <Input
                    id="pull-endpoint"
                    value={pullEndpoint}
                    onChange={(e) => setPullEndpoint(e.target.value)}
                    placeholder="API endpoint URL"
                    className="mt-1 focus-visible:ring-lime-500 border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can customize this URL to access specific API endpoints (e.g., add '/1' or '/all' at the end)
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPullPanelOpen(false)}
                  className="border-lime-200 text-lime-700 hover:bg-lime-50"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-lime-600 hover:bg-lime-700 text-white"
                  disabled={!pullToken.trim() || !pullEndpoint.trim() || isPullingData}
                  onClick={handlePullData}
                >
                  {isPullingData ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Pulling...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Pull Data
                    </>
                  )}
                </Button>
              </div>

              {/* Response data section */}
              {showResponseData && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Response</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResponseData(!showResponseData)}
                      className="text-gray-500 hover:text-gray-700 h-6 w-6 p-0"
                    >
                      {showResponseData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  {responseType === "json" && (
                    <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto max-h-60 border border-gray-200">
                      {JSON.stringify(pullResponse, null, 2)}
                    </pre>
                  )}

                  {responseType === "text" && (
                    <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto max-h-60 border border-gray-200 whitespace-pre-wrap">
                      {pullResponse}
                    </pre>
                  )}

                  {responseType === "binary" && (
                    <div className="bg-gray-50 p-3 rounded-md text-sm border border-gray-200 flex items-center">
                      <Download className="h-4 w-4 mr-2 text-lime-600" />
                      {pullResponse}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
