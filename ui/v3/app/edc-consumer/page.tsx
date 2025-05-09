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
  ArrowRight,
  FileText,
  Database,
  Network,
  BarChart2,
  Download,
  Copy,
  ChevronUp,
  Clock,
  HelpCircle,
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
} from "@/lib/api"

import { CatalogSearchDialog } from "./catalog-search-dialog"
import { ConnectivityCheckDialog } from "./connectivity-check-dialog"
import { NegotiationDialog } from "./negotiation-dialog"
import { TransferDialog } from "./transfer-dialog"
import { TransferManagementInfo } from "./components/transfer-management-info"
import { FlowerClientLogsDialog } from "./components/flower-client-logs-dialog"
import { MLflowDialog } from "./components/mlflow-dialog"

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

// Consumer page component
export default function ConsumerPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()

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
  const [apiMode, setApiMode] = useState<"mock" | "live">("live")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectorAddress, setConnectorAddressState] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("connectorAddress") || "http://172.16.56.42/consumer/cp/api/management"
      : "http://172.16.56.42/consumer/cp/api/management",
  )
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false)
  const [isCatalogSearchOpen, setIsCatalogSearchOpen] = useState(false)
  const [isChangingConnector, setIsChangingConnector] = useState(false)
  const [previousConnectorAddress, setPreviousConnectorAddress] = useState(getConnectorAddress())
  const [connectorStatus, setConnectorStatus] = useState<"connected" | "disconnected" | "unknown">("unknown")
  const [failedConnectorAddress, setFailedConnectorAddress] = useState<string | null>(null)
  const [lastCounterPartyId, setLastCounterPartyId] = useState<string>("did:web:provider-identityhub%3A7083:provider")
  const [lastCounterPartyAddress, setLastCounterPartyAddress] = useState<string>(
    "http://provider-qna-controlplane:8082/api/dsp",
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
  const [isGettingToken, setIsGettingToken] = useState(false)
  const [isPullingData, setIsPullingData] = useState(false)
  const [pullResponse, setPullResponse] = useState<any>(null)
  const [showResponseData, setShowResponseData] = useState(false)
  const [responseType, setResponseType] = useState<"text" | "binary" | "json" | "none">("none")

  // Update connector address state when it changes in the API
  useEffect(() => {
    setConnectorAddressState(getConnectorAddress())
    // Check initial connector status
    checkCurrentConnectorStatus()
  }, [])

  // Set default value if it doesn't exist in localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("connectorAddress")) {
      localStorage.setItem("connectorAddress", "http://172.16.56.42/consumer/cp/api/management")
      setConnectorAddressState("http://172.16.56.42/consumer/cp/api/management")
    }
  }, [])

  // Fetch data when the page loads
  useEffect(() => {
    fetchData()
  }, [])

  // Check the current connector status
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
    } catch (err) {
      setConnectorStatus("disconnected")
      setFailedConnectorAddress(getConnectorAddress())
    }
  }

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
          console.log("Current connector address:", getConnectorAddress())

          // Fetch contract negotiations
          try {
            setNegotiationsLoading(true)
            const negotiationsData = await getContractNegotiations()
            console.log("Contract negotiations loaded:", negotiationsData)
            setContractNegotiations(negotiationsData)
          } catch (negotiationError: any) {
            console.error("Failed to load contract negotiations:", negotiationError)
            setError(`Failed to load contract negotiations: ${negotiationError.message}`)
            setContractNegotiations([])
          } finally {
            setNegotiationsLoading(false)
          }

          // Fetch transfer processes
          try {
            setTransfersLoading(true)
            const transfersData = await getTransferProcesses()
            console.log("Transfer processes loaded:", transfersData)
            setTransferProcesses(transfersData)
          } catch (transferError: any) {
            console.error("Failed to load transfer processes:", transferError)
            setError(`Failed to load transfer processes: ${transferError.message}`)
            setTransferProcesses([])
          } finally {
            setTransfersLoading(false)
          }

          showSuccessMessage("Data loaded from API successfully")
        } catch (apiError: any) {
          console.error("API error:", apiError)
          setError(`Failed to load data from API: ${apiError.message}`)

          // No usar datos simulados, simplemente establecer arrays vacíos
          setCatalogItems([])
          setContractNegotiations([])
          setTransferProcesses([])
        }
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(`Failed to load data: ${err.message}`)

      // No usar datos simulados, simplemente establecer arrays vacíos
      setCatalogItems([])
      setContractNegotiations([])
      setTransferProcesses([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Handle catalog search
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
        } catch (err: any) {
          console.error("Error querying catalog:", err)
          setError(`Failed to query catalog: ${err.message}`)
          setCatalogItems([])
        }
      } else {
        // Para el modo mock, simular un retraso
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

  // Modificar la función openNegotiationDialog para asegurar que se actualiza correctamente el asset seleccionado
  const openNegotiationDialog = (asset: CatalogItem) => {
    console.log("Opening negotiation dialog for asset:", asset.id)
    // Primero establecer el estado con el nuevo asset seleccionado
    setSelectedAssetForNegotiation(asset)
    // Luego abrir el diálogo
    setIsNegotiationDialogOpen(true)
  }

  // Modificar la función handleNegotiate para asegurarse de usar el asset seleccionado actual
  const handleNegotiate = async (policy: any) => {
    // Verificar que tenemos un asset seleccionado
    if (!selectedAssetForNegotiation) {
      console.error("No asset selected for negotiation")
      setError("No asset selected for negotiation")
      return
    }

    try {
      setNegotiationsLoading(true)
      setError(null)

      // Capturar el asset actual para asegurarnos de que usamos el correcto
      const currentAsset = selectedAssetForNegotiation

      // Extraer el contractId de la política del asset
      const contractId = currentAsset.policy?.["@id"] || ""

      console.log(`Initiating negotiation for asset: ${currentAsset.id}`)
      console.log(`Using contract ID: ${contractId}`)
      console.log(`Counter party ID: ${lastCounterPartyId}`)
      console.log(`Counter party address: ${lastCounterPartyAddress}`)

      if (apiMode === "live") {
        try {
          // Asegurarse de que la política tenga el @id correcto
          const negotiationPolicy = {
            ...policy,
            "@id": contractId, // Usar el contractId del asset
          }

          await initiateNegotiation(currentAsset.id, lastCounterPartyId, lastCounterPartyAddress, negotiationPolicy)

          // Refresh negotiations after initiating a new one
          const updatedNegotiations = await getContractNegotiations()
          setContractNegotiations(updatedNegotiations)
          showSuccessMessage(`Negotiation initiated for asset ${currentAsset.id}`)

          // Programar una recarga automática después de 3 segundos
          setTimeout(async () => {
            console.log("Auto-refreshing negotiations after 3 seconds")
            try {
              const refreshedNegotiations = await getContractNegotiations()
              setContractNegotiations(refreshedNegotiations)
            } catch (refreshError) {
              console.error("Error auto-refreshing negotiations:", refreshError)
            }
          }, 3000)
        } catch (err: any) {
          console.error("Error initiating negotiation:", err)
          setError(`Failed to initiate negotiation: ${err.message}`)
        }
      } else {
        // For mock mode, simulate adding a new negotiation
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

        // Simular una actualización después de 3 segundos en modo mock
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

  // Modificar la función handleTransfer para recargar los datos después de 3 segundos
  const handleTransfer = async (transferType: string, serverAddress?: string, additionalOptions?: any) => {
    if (!selectedContractForTransfer || !selectedContractForTransfer.contractAgreementId) return

    try {
      setTransfersLoading(true)
      setError(null)

      console.log(`Initiating transfer for contract: ${selectedContractForTransfer.contractAgreementId}`)
      console.log(`Asset ID: ${selectedContractForTransfer.assetId || "unknown"}`)
      console.log(`Counter party ID: ${lastCounterPartyId}`)
      console.log(`Counter party address: ${lastCounterPartyAddress}`)
      console.log(`Transfer type: ${transferType}`)
      if (serverAddress) console.log(`Server address: ${serverAddress}`)
      if (additionalOptions) console.log(`Additional options:`, additionalOptions)

      if (apiMode === "live") {
        try {
          await initiateTransfer(
            selectedContractForTransfer.contractAgreementId,
            selectedContractForTransfer.assetId || "unknown",
            lastCounterPartyId,
            lastCounterPartyAddress,
            transferType,
            serverAddress,
          )

          // Refresh transfers after initiating a new one
          const updatedTransfers = await getTransferProcesses()
          setTransferProcesses(updatedTransfers)
          showSuccessMessage(`Transfer initiated for contract ${selectedContractForTransfer.contractAgreementId}`)

          // Programar una recarga automática después de 3 segundos
          setTimeout(async () => {
            console.log("Auto-refreshing transfers after 3 seconds")
            try {
              const refreshedTransfers = await getTransferProcesses()
              setTransferProcesses(refreshedTransfers)
            } catch (refreshError) {
              console.error("Error auto-refreshing transfers:", refreshError)
            }
          }, 3000)
        } catch (err: any) {
          console.error("Error initiating transfer:", err)
          setError(`Failed to initiate transfer: ${err.message}`)
        }
      } else {
        // For mock mode, simulate adding a new transfer
        const mockTransfer = {
          id: `transfer-${Math.random().toString(36).substring(2, 9)}`,
          state: "STARTED",
          contractId: selectedContractForTransfer.contractAgreementId,
          assetId: selectedContractForTransfer.assetId || "unknown",
          transferType: transferType,
          assetType:
            transferType === "FL-DataApp"
              ? "FL-Service"
              : transferType === "Model-DataApp"
                ? "Model"
                : transferType.includes("PUSH")
                  ? "PUSH"
                  : "PULL",
          endpointUrl: serverAddress,
          isCompleted: false,
          createdAt: Date.now(),
          additionalOptions: additionalOptions,
        }
        setTransferProcesses([mockTransfer, ...transferProcesses])
        showSuccessMessage(`Mock transfer initiated for contract ${selectedContractForTransfer.contractAgreementId}`)

        // Simular una actualización después de 3 segundos en modo mock
        setTimeout(() => {
          console.log("Auto-refreshing mock transfers after 3 seconds")
          const updatedMockTransfer = {
            ...mockTransfer,
            state: "COMPLETED",
            isCompleted: true,
          }
          setTransferProcesses((prev) => [updatedMockTransfer, ...prev.filter((t) => t.id !== mockTransfer.id)])
        }, 3000)
      }
    } catch (err: any) {
      console.error("Error initiating transfer:", err)
      setError(`Failed to initiate transfer: ${err.message}`)
    } finally {
      setTransfersLoading(false)
    }
  }

  // Añadir función para manejar el clic en el botón PULL
  const handlePullButtonClick = (transfer: TransferProcess) => {
    setSelectedPullTransfer(transfer)
    setPullToken("")
    setPullResponse(null)
    setShowResponseData(false)
    setResponseType("none")
    setIsPullPanelOpen(true)
  }

  // Implementar la nueva función para obtener el token de autorización
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
        // Paso 1: Obtener la lista de EndpointDataReferenceEntry
        // Usar el mismo método que las demás llamadas a la API
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

        // Paso 2: Encontrar la entrada que coincide con el contractId del transfer
        const matchingEdr = edrsResponse.find(
          (edr: EndpointDataReferenceEntry) => edr.agreementId === transfer.contractId,
        )

        if (!matchingEdr) {
          throw new Error(`No matching endpoint data reference found for contract ${transfer.contractId}`)
        }

        console.log("Matching EDR:", matchingEdr)

        // Paso 3: Obtener la dirección de datos con el token de autorización
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

        // Paso 4: Extraer el token de autorización
        const authToken = dataAddressResponse.authorization

        // Paso 5: Copiar el token al portapapeles
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(authToken)
          showSuccessMessage("Authorization token copied to clipboard")
        }

        // Establecer el token en el estado
        setPullToken(authToken)
        return authToken
      } else {
        // Para el modo mock, generar un token simulado
        const mockToken = `eyJraWQiOiJkaWQ6d2ViOnByb3ZpZGVyLWlkZW50aXR5aHViJTNBNzA4Mzpwcm92aWRlciNrZXktMSIsImFsZyI6IkVTMjU2In0.eyJpc3MiOiJkaWQ6d2ViOnByb3ZpZGVyLWlkZW50aXR5aHViJTNBNzA4Mzpwcm92aWRlciIsImF1ZCI6ImRpZDp3ZWI6Y29uc3VtZXItaWRlbnRpdHlodWIlM0E3MDgzOmNvbnN1bWVyIiwic3ViIjoiZGlkOndlYjpwcm92aWRlci1pZGVudGl0eWh1YiUzQTcwODM6cHJvdmlkZXIiLCJpYXQiOjE3NDQyNzMyMzI3NTgsImp0aSI6IjVkOTBmMTc4LTk2ODUtNGEzNC04ZjNkLTgyY2IyNGRiNDE2NiJ9.YqBN15z1iT5IfP3xehLBW1f98yej5XhbBFerggOOZjKgtAiY6_hIwdPf3ODALaIfO5TZ9jRrYlvNcczUsQMsiA`

        // Simular copia al portapapeles
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(mockToken)
          showSuccessMessage("Mock authorization token copied to clipboard")
        }

        // Establecer el token en el estado
        setPullToken(mockToken)
        return mockToken
      }
    } catch (err: any) {
      console.error("Error getting token:", err)
      setError(`Failed to get token: ${err.message}`)
      return null
    } finally {
      setIsGettingToken(false)
    }
  }

  // Añadir la función getApiProxyUrl si no existe
  const getApiProxyUrl = () => {
    // When running in the browser, use the current origin
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api-proxy`
    }
    // Fallback for server-side rendering
    return "/api-proxy"
  }

  // Modificar la función handlePullData para usar el nuevo método pullData del api.ts
  const handlePullData = async () => {
    if (!selectedPullTransfer || !pullToken) return

    setIsPullingData(true)
    setPullResponse(null)
    setShowResponseData(false)
    setResponseType("none")

    try {
      console.log(`Pulling data for transfer: ${selectedPullTransfer.id} with token`)

      if (apiMode === "live") {
        // Usar la nueva función pullData que utiliza el api-proxy
        const result = await pullData(selectedPullTransfer.id, pullToken)

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
      } else {
        // Para el modo mock, simular una respuesta
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
    } catch (err: any) {
      console.error("Error pulling data:", err)
      setError(`Failed to pull data: ${err.message}`)
      setPullResponse(`Error: ${err.message}`)
      setResponseType("text")
      setShowResponseData(true)
    } finally {
      setIsPullingData(false)
    }
  }

  // Función auxiliar para obtener el nombre del archivo de la respuesta
  const getFilenameFromResponse = (response: Response): string => {
    // Intentar obtener el nombre del archivo del header Content-Disposition
    const contentDisposition = response.headers.get("content-disposition")
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/)
      if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1]
      }
    }

    // Si no hay Content-Disposition, intentar obtener del Content-Type
    const contentType = response.headers.get("content-type")
    if (contentType) {
      const extension = getExtensionFromContentType(contentType)
      if (extension) {
        return `${selectedPullTransfer?.assetId || "download"}.${extension}`
      }
    }

    // Valor por defecto
    return `${selectedPullTransfer?.assetId || "download"}.bin`
  }

  // Función auxiliar para obtener la extensión del archivo según el tipo de contenido
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

  // Handle Logs button click
  const handleViewLogs = (assetId: string) => {
    setSelectedAssetForLogs(assetId)
    setIsFlowerLogsDialogOpen(true)
  }

  // Handle MLflow button click
  const handleOpenMLflow = (assetId: string) => {
    setSelectedAssetForLogs(assetId)
    setIsMLflowDialogOpen(true)
  }

  // Toggle between mock and live API modes
  const toggleApiMode = () => {
    setApiMode(apiMode === "mock" ? "live" : "mock")
  }

  // Navigate to provider page
  const navigateToProvider = () => {
    router.push("/edc-provider")
  }

  // Mock data functions
  const getMockCatalogItems = (): CatalogItem[] => {
    return [
      {
        id: "data-sensor-001",
        name: "Manufacturing Sensor Dataset",
        description: "Real-time sensor data from manufacturing equipment.",
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
          target: "data-sensor-001",
        },
      },
      {
        id: "data-metrics-002",
        name: "Production Metrics Dataset",
        description: "Historical production metrics with quality indicators.",
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
          target: "data-metrics-002",
        },
      },
      {
        id: "fl-fedavg-v1",
        name: "Federated Learning - FedAvg Algorithm",
        description: "Federated Learning service using Federated Averaging algorithm.",
        policy: {
          "@type": "Offer",
          "@id": "fl-service-policy",
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
          target: "fl-fedavg-v1",
        },
      },
      {
        id: "fl-secure-agg-v2",
        name: "Federated Learning - Secure Aggregation",
        description: "Secure aggregation protocol for privacy-preserving federated learning.",
        policy: {
          "@type": "Offer",
          "@id": "fl-secure-policy",
          assigner: "did:web:provider-identityhub%3A7083:provider",
          permission: [],
          prohibition: [],
          obligation: {
            action: "use",
            constraint: {
              leftOperand: "UsageFrequency",
              operator: "lteq",
              rightOperand: "500",
            },
          },
          target: "fl-secure-agg-v2",
        },
      },
      {
        id: "model-cnn-v2",
        name: "Pre-trained CNN Model",
        description: "Convolutional Neural Network trained on manufacturing defect images.",
        policy: {
          "@type": "Offer",
          "@id": "model-cnn-policy",
          assigner: "did:web:provider-identityhub%3A7083:provider",
          permission: [],
          prohibition: [],
          obligation: {
            action: "use",
            constraint: {
              leftOperand: "UsageFrequency",
              operator: "lteq",
              rightOperand: "2000",
            },
          },
          target: "model-cnn-v2",
        },
      },
      {
        id: "model-transformer-v1",
        name: "Transformer Model for Time Series",
        description: "Transformer-based model for time series forecasting in manufacturing.",
        policy: {
          "@type": "Offer",
          "@id": "model-transformer-policy",
          assigner: "did:web:provider-identityhub%3A7083:provider",
          permission: [],
          prohibition: [],
          obligation: {
            action: "use",
            constraint: {
              leftOperand: "UsageFrequency",
              operator: "lteq",
              rightOperand: "1500",
            },
          },
          target: "model-transformer-v1",
        },
      },
    ]
  }

  const getMockContractNegotiations = (): ContractNegotiation[] => {
    const now = Date.now()
    return [
      {
        id: "18bf27b3-2bd0-49dd-991e-4d8f347ec8ae",
        state: "FINALIZED",
        contractAgreementId: "13e79baa-d0cb-4a0f-8e23-c4d374158ef9",
        assetId: "data-sensor-001",
        assetName: "Manufacturing Sensor Dataset",
        createdAt: now - 1000 * 60 * 5, // 5 minutes ago
        errorDetail: null,
      },
      {
        id: "29cf38c4-3ce0-58ee-882f-5e9f458ec9bf",
        state: "REQUESTED",
        assetId: undefined, // Asset unknown
        assetName: undefined,
        createdAt: now - 1000 * 60 * 30, // 30 minutes ago
        errorDetail: null,
      },
      {
        id: "37df49d5-4df1-69ff-993g-6f0g569fd0cg",
        state: "DECLINED",
        assetId: "model-cnn-v2",
        assetName: "Pre-trained CNN Model",
        createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
        errorDetail: "Policy validation failed: constraints not satisfied",
      },
      {
        id: "48eg50e6-5eg2-70gg-994h-7g1h670ge1dh",
        state: "FINALIZED",
        contractAgreementId: "24f80cbb-e1dc-5b1f-9f34-d5e385d5e5f0",
        assetId: "fl-secure-agg-v2",
        assetName: "Federated Learning - Secure Aggregation",
        createdAt: now - 1000 * 60 * 120, // 2 hours ago
        errorDetail: null,
      },
      {
        id: "59fh61f7-6fh3-81hh-995i-8h2i781hf2ei",
        state: "FINALIZED",
        contractAgreementId: "35g91dcc-f2ed-6c2g-0g45-e6f496e6f6g1",
        assetId: "model-transformer-v1",
        assetName: "Transformer Model for Time Series",
        createdAt: now - 1000 * 60 * 180, // 3 hours ago
        errorDetail: null,
      },
    ]
  }

  const getMockTransferProcesses = (): TransferProcess[] => {
    const now = Date.now()
    return [
      // Datos regulares - PULL
      {
        id: "75bc27cc-793c-4956-a751-25333a3e6607",
        state: "STARTED",
        contractId: "13e79baa-d0cb-4a0f-8e23-c4d374158ef9",
        assetId: "data-sensor-001",
        transferType: "HttpData-PULL",
        assetType: "PULL",
        endpointUrl: "http://172.19.0.2:30381/listener",
        createdAt: now - 1000 * 60 * 2, // 2 minutes ago
        isCompleted: false,
      },
      // Datos regulares - PUSH
      {
        id: "12ab34cd-567e-89fg-hijk-lmnopqrs9012",
        state: "COMPLETED",
        contractId: "45t67uvw-89xy-zabc-defg-hijklmnop345",
        assetId: "data-metrics-002",
        transferType: "HttpData-PUSH",
        assetType: "PUSH",
        endpointUrl: "http://172.19.0.2:30381/listener",
        createdAt: now - 1000 * 60 * 60, // 1 hour ago
        isCompleted: true,
      },
      // FL-Service - PULL
      {
        id: "86cd38dd-804d-5067-b862-36444b4f7718",
        state: "STARTED",
        contractId: "24f80cbb-e1dc-5b1f-9f34-d5e385d5e5f0",
        assetId: "fl-fedavg-v1",
        transferType: "HttpData-PULL",
        assetType: "FL-Service",
        createdAt: now - 1000 * 60 * 15, // 15 minutes ago
        isCompleted: false,
      },
      // FL-Service - FL Data App
      {
        id: "34ef56gh-789i-jklm-nopq-rstuv1234567",
        state: "STARTED",
        contractId: "67wx89yz-abcd-efgh-ijkl-mnopqrstuv12",
        assetId: "fl-secure-agg-v2",
        transferType: "FL-DataApp",
        assetType: "FL-Service",
        createdAt: now - 1000 * 60 * 30, // 30 minutes ago
        isCompleted: false,
      },
      // Model - PULL
      {
        id: "97de49ee-915e-6178-c973-47555c5g8829",
        state: "STARTED",
        contractId: "35g91dcc-f2ed-6c2g-0g45-e6f496e6f6g1",
        assetId: "model-cnn-v2",
        transferType: "HttpData-PULL",
        assetType: "Model",
        endpointUrl: "http://172.19.0.2:30381/listener",
        createdAt: now - 1000 * 60 * 45, // 45 minutes ago
        isCompleted: false,
      },
      // Model - Model Data App
      {
        id: "78ij90kl-mnop-qrst-uvwx-yz1234567890",
        state: "STARTED",
        contractId: "89ab12cd-efgh-ijkl-mnop-qrstuvwxyz34",
        assetId: "model-transformer-v1",
        transferType: "Model-DataApp",
        assetType: "Model",
        createdAt: now - 1000 * 60 * 50, // 50 minutes ago
        isCompleted: false,
      },
    ]
  }

  // Helper function to format date
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

  const refreshData = () => {
    setIsRefreshing(true)
    fetchData()
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
      const isReachable = await checkConnectorReachable(connectorAddress)

      if (isReachable) {
        setConnectorAddress(connectorAddress)
        localStorage.setItem("connectorAddress", connectorAddress)
        showSuccessMessage("Connector address updated successfully")
        setConnectorStatus("connected")
        setFailedConnectorAddress(null)

        // Refresh data with new connector
        refreshData()
      } else {
        setError(`Cannot connect to connector at ${connectorAddress}`)
        setConnectorStatus("disconnected")
        setFailedConnectorAddress(connectorAddress)
      }
    } catch (error: any) {
      console.error("Error updating connector address:", error)
      setError(`Failed to update connector address: ${error.message}`)
      setConnectorStatus("disconnected")
      setFailedConnectorAddress(connectorAddress)
    } finally {
      setIsChangingConnector(false)
    }
  }

  // Modificar la función getManageableTransfers para filtrar correctamente las transferencias FL y Model
  const getManageableTransfers = () => {
    return transferProcesses.filter((transfer) => {
      // Verificar si es una transferencia de tipo FL-Service o Model
      const isFlService =
        transfer.assetType === "FL-Service" ||
        transfer.transferType === "FL-DataApp" ||
        (transfer.assetId && transfer.assetId.toLowerCase().includes("fl-"))

      const isModel =
        transfer.assetType === "Model" ||
        transfer.transferType === "Model-DataApp" ||
        (transfer.assetId && transfer.assetId.toLowerCase().includes("model"))

      // Solo mostrar transferencias FL-Service o Model que estén en estado STARTED o COMPLETED
      return isFlService || isModel
    })
  }

  // New function to fetch from API
  const fetchFromApi = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = getConnectorAddress()
    const url = `${baseUrl}${endpoint}`

    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error("API fetch error:", error)
      setError(`API fetch error: ${error.message}`)
      throw error
    }
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
                  // Modificamos la sección donde se muestran los elementos del catálogo
                  catalogItems.map((item) => {
                    // Determinar el tipo de asset basado en su ID o nombre
                    const isFlService =
                      item.id.toLowerCase().includes("fl-") ||
                      item.id.toLowerCase().includes("flower") ||
                      item.name.toLowerCase().includes("federated") ||
                      item.name.toLowerCase().includes("fl service")

                    const isModel = item.id.toLowerCase().includes("model") || item.name.toLowerCase().includes("ml")

                    // Determinar el icono según el tipo
                    let assetTypeIcon = <Database className="h-5 w-5 text-white" />

                    if (isFlService) {
                      assetTypeIcon = <Network className="h-5 w-5 text-white" />
                    } else if (isModel) {
                      assetTypeIcon = <BarChart2 className="h-5 w-5 text-white" />
                    }

                    // Extraer el hashPolicy-id de la política
                    const contractId = item.policy?.["@id"] || "No contract ID available"

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded border hover:border-lime-300 transition-colors flex items-start relative overflow-hidden"
                      >
                        {/* Barra lateral de color */}
                        <div
                          className={`w-6 h-full absolute left-0 top-0 bottom-0 ${
                            isFlService ? "bg-teal-500" : isModel ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                        ></div>

                        {/* Icono centrado sobre la barra */}
                        <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                          {assetTypeIcon}
                        </div>

                        {/* Contenido con padding ajustado para la barra */}
                        <div className="flex-1 pl-8 p-3">
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            <span className="font-medium">ID:</span> {item.id}
                          </p>
                          {/* Añadimos el Contract ID */}
                          <p className="text-xs text-gray-400">
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
                      // Determinar el tipo de asset basado en su ID o nombre
                      const assetId = negotiation.assetId || ""
                      const assetName = negotiation.assetName || ""
                      // Modificar la condición para incluir todos los estados de espera posibles
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

                      // Determinar el icono según el tipo (solo los 3 principales)
                      let assetTypeIcon = <Database className="h-5 w-5 text-white" />
                      let barColor = "bg-amber-500"

                      if (isRequested || isUnknownAsset) {
                        // Icono de reloj o signo de interrogación para assets desconocidos o en espera
                        assetTypeIcon = isRequested ? (
                          <Clock className="h-5 w-5 text-white" />
                        ) : (
                          <HelpCircle className="h-5 w-5 text-white" />
                        )
                        barColor = "bg-gray-400" // Barra gris para assets desconocidos o en espera
                      } else if (isFlService) {
                        assetTypeIcon = <Network className="h-5 w-5 text-white" />
                        barColor = "bg-teal-500"
                      } else if (isModel) {
                        assetTypeIcon = <BarChart2 className="h-5 w-5 text-white" />
                        barColor = "bg-indigo-500"
                      }

                      return (
                        <div
                          key={negotiation.id}
                          className="bg-white rounded border hover:border-lime-300 transition-colors flex items-start relative overflow-hidden"
                        >
                          {/* Barra lateral de color */}
                          <div className={`w-6 h-full absolute left-0 top-0 bottom-0 ${barColor}`}></div>

                          {/* Icono centrado sobre la barra */}
                          <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                            {assetTypeIcon}
                          </div>

                          {/* Contenido con padding ajustado para la barra */}
                          <div className="flex-1 pl-8 p-3 pb-12">
                            <h3 className="font-medium">
                              {negotiation.state === "TERMINATED"
                                ? "Failed Negotiation"
                                : negotiation.assetName || negotiation.assetId || "Unknown Asset"}
                            </h3>
                            <span className="text-xs text-gray-500">{formatTimeAgo(negotiation.createdAt)}</span>

                            {/* Display error details for failed negotiations */}
                            {negotiation.errorDetail && (
                              <p className="text-xs text-red-600 mt-1 italic">Error: {negotiation.errorDetail}</p>
                            )}

                            {negotiation.contractAgreementId && (
                              <p className="text-xs text-gray-500 mt-1">
                                Agreement ID: {negotiation.contractAgreementId}
                              </p>
                            )}

                            {negotiation.state === "TERMINATED" ? (
                              <p className="text-xs text-gray-400 mt-1">Negotiation ID: {negotiation.id}</p>
                            ) : (
                              <h3>{negotiation.assetName || negotiation.assetId || "Unknown Asset"}</h3>
                            )}
                            <span className="text-xs text-gray-500">{formatTimeAgo(negotiation.createdAt)}</span>

                            {/* Display error details for failed negotiations */}
                            {negotiation.errorDetail && (
                              <p className="text-xs text-red-600 mt-1 italic">Error: {negotiation.errorDetail}</p>
                            )}

                            {negotiation.contractAgreementId && (
                              <p className="text-xs text-gray-500 mt-1">
                                Agreement ID: {negotiation.contractAgreementId}
                              </p>
                            )}

                            {negotiation.state === "TERMINATED" ? (
                              <p className="text-xs text-gray-400 mt-1">Negotiation ID: {negotiation.id}</p>
                            ) : (
                              negotiation.assetId && (
                                <p className="text-xs text-gray-400 mt-1">Asset ID: {negotiation.assetId}</p>
                              )
                            )}

                            <Badge
                              className={`absolute top-3 right-3 ${
                                negotiation.state === "FINALIZED"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : negotiation.state === "DECLINED" ||
                                      negotiation.state === "ERROR" ||
                                      negotiation.state === "TERMINATED"
                                    ? "bg-red-100 text-red-800 hover:bg-red-100"
                                    : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              }`}
                            >
                              {negotiation.state}
                            </Badge>

                            {negotiation.state === "FINALIZED" && negotiation.contractAgreementId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTransferDialog(negotiation)}
                                className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300 absolute bottom-3 right-3"
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Transfer
                              </Button>
                            )}
                          </div>
                        </div>
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
                      // Determinar el tipo de asset basado en su ID
                      const assetId = transfer.assetId || ""

                      // Verificar si la transferencia está en proceso
                      const isInProgress =
                        transfer.state === "INITIAL" ||
                        transfer.state === "REQUESTED" ||
                        transfer.state === "REQUESTING"

                      const isFlService =
                        assetId.toLowerCase().includes("fl-") ||
                        assetId.toLowerCase().includes("flower") ||
                        transfer.assetType === "FL-Service"

                      const isModel = assetId.toLowerCase().includes("model") || transfer.assetType === "Model"

                      // Determinar el icono según el tipo y estado
                      let assetTypeIcon = <Database className="h-5 w-5 text-white" />
                      let barColor = "bg-amber-500"

                      if (isInProgress) {
                        // Icono de reloj para transferencias en proceso
                        assetTypeIcon = <Clock className="h-5 w-5 text-white" />
                        barColor = "bg-gray-400" // Barra gris para transferencias en proceso
                      } else if (isFlService) {
                        assetTypeIcon = <Network className="h-5 w-5 text-white" />
                        barColor = "bg-teal-500"
                      } else if (isModel) {
                        assetTypeIcon = <BarChart2 className="h-5 w-5 text-white" />
                        barColor = "bg-indigo-500"
                      }

                      return (
                        <div
                          key={transfer.id}
                          className="bg-white rounded border hover:border-lime-300 transition-colors flex items-start relative overflow-hidden"
                        >
                          {/* Barra lateral de color */}
                          <div className={`w-6 h-full absolute left-0 top-0 bottom-0 ${barColor}`}></div>

                          {/* Icono centrado sobre la barra */}
                          <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                            {assetTypeIcon}
                          </div>

                          {/* Contenido con padding ajustado para la barra */}
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

                            {/* Show endpoint for PUSH transfers */}
                            {transfer.transferType?.includes("PUSH") && transfer.endpointUrl && (
                              <p className="text-xs text.gray-600 mt-1">Endpoint: {transfer.endpointUrl}</p>
                            )}

                            {/* Secondary attributes - más compactos pero completos */}
                            <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                              <p>Transfer ID: {transfer.id}</p>
                              {/* Cambiamos "Contract ID" por "Agreement ID" */}
                              <p>Agreement ID: {transfer.contractId}</p>
                            </div>

                            {transfer.isCompleted && (
                              <p className="text-xs text-green-600 font-medium mt-1">✓ Transfer completed</p>
                            )}

                            <Badge
                              className={`absolute top-3 right-3 ${
                                transfer.state === "STARTED" || transfer.state === "COMPLETED" || transfer.isCompleted
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-red-100 text-red-800 hover:bg-red-100"
                              }`}
                            >
                              {transfer.state}
                            </Badge>

                            {/* Botón PULL correctamente posicionado */}
                            {transfer.assetType === "PULL" && (
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
                      )
                    })
                ) : (
                  <p className="text-center text-gray-500 py-4">No transfer processes available</p>
                )}
              </div>
            </div>

            {/* Transfer Management Column - Moved to the right */}
            {isFlDataAppEnabled && (
              <div className="border rounded-lg p-4 bg-emerald-50 border-t-2 border-t-emerald-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-emerald-700">Data Applications</h2>
                  <TransferManagementInfo />
                </div>
                <div className="space-y-3">
                  {transfersLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : getManageableTransfers().length > 0 ? (
                    getManageableTransfers()
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((transfer) => {
                        // Determinar el tipo de asset basado en su ID o transferType
                        const isFlService =
                          transfer.assetType === "FL-Service" ||
                          transfer.transferType === "FL-DataApp" ||
                          (transfer.assetId && transfer.assetId.toLowerCase().includes("fl-"))

                        const isModel =
                          transfer.assetType === "Model" ||
                          transfer.transferType === "Model-DataApp" ||
                          (transfer.assetId && transfer.assetId.toLowerCase().includes("model"))

                        // Determinar el icono según el tipo
                        const appIcon = isFlService ? (
                          <Network className="h-5 w-5 text-white" />
                        ) : (
                          <BarChart2 className="h-5 w-5 text-white" />
                        )

                        // Determinar el color de la barra
                        const barColor = isFlService ? "bg-teal-500" : "bg-indigo-500"

                        // Determinar el tipo de badge a mostrar
                        const badgeText = isFlService ? "FL-Service" : "Model"

                        return (
                          <div
                            key={transfer.id}
                            className="bg-white rounded border hover:border-emerald-300 transition-colors flex items-start relative overflow-hidden"
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

                              <Badge className="absolute top-3 right-3 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                {badgeText}
                              </Badge>

                              {/* Botones específicos según el tipo */}
                              {isFlService && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewLogs(transfer.assetId)}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 absolute bottom-3 right-3"
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
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-300 absolute bottom-3 right-3"
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
              </div>

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
                  disabled={!pullToken.trim() || isPullingData}
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
