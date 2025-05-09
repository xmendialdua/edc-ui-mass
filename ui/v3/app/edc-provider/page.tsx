"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  Terminal,
  Loader2,
  ChevronDown,
  Menu,
  XCircle,
  Database,
  Network,
  BarChart2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

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
} from "@/app/edc-provider/lib/api"

import { useLanguage } from "@/contexts/language-context"
import { useAppSettings } from "@/contexts/app-settings-context"

// Import components
import { AssetFormDialog } from "@/app/edc-provider/components/asset-form-dialog"
import { PolicyFormDialog } from "@/app/edc-provider/components/policy-form-dialog"
import { ContractFormDialog } from "@/app/edc-provider/components/contract-form-dialog"
import { ConnectivityCheckDialog } from "@/app/edc-provider/components/connectivity-check-dialog"

// Añadir los imports para los nuevos componentes de diálogo
import { FlowerServerLogsDialog } from "./flower-server-logs-dialog"
import { MLflowDialog } from "./mlflow-dialog"
import { Server } from "lucide-react"

// Define types for our items
type Asset = {
  id: string
  name: string
  description: string
  baseUrl?: string // Add baseUrl field
  dataAddress?: any
}

type Policy = {
  id: string
  name: string
  constraints: string
  policyJson?: string
  permission?: any
  prohibition?: any
  obligation?: any
  policy?: any
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

// Provider page component
export default function ProviderPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { isFlDataAppEnabled, setIsFlDataAppEnabled } = useAppSettings()

  // State for each category
  const [assets, setAssets] = useState<Asset[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [contractDefinitions, setContractDefinitions] = useState<ContractDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [apiMode, setApiMode] = useState<"mock" | "live">("live") // Changed default to "live"
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Actualizar el estado inicial para el connectorAddress
  const [connectorAddress, setConnectorAddressState] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("connectorAddress") || "http://172.16.56.42/provider-qna/cp/api/management"
      : "http://172.16.56.42/provider-qna/cp/api/management",
  )
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false)
  const [isChangingConnector, setIsChangingConnector] = useState(false)
  const [previousConnectorAddress, setPreviousConnectorAddress] = useState(getConnectorAddress())
  // Add the connectorStatus state
  const [connectorStatus, setConnectorStatus] = useState<"connected" | "disconnected" | "unknown">("unknown")
  // Modificar el estado para almacenar la dirección que causó el error
  const [failedConnectorAddress, setFailedConnectorAddress] = useState<string | null>(null)

  // Añadir estados para controlar la apertura de los diálogos
  const [isFlowerLogsOpen, setIsFlowerLogsOpen] = useState(false)
  const [isMLflowOpen, setIsMLflowOpen] = useState(false)

  // Estados para controlar la expansión y selección de elementos
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null)
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  // Añadir un nuevo estado para controlar la expansión de los Contract Definitions
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null)

  // Función para alternar la expansión de un asset
  const toggleAssetExpansion = (id: string) => {
    setExpandedAssetId(expandedAssetId === id ? null : id)
    // Cerrar otros paneles al abrir uno nuevo
    setExpandedPolicyId(null)
  }

  // Función para alternar la expansión de una política
  const togglePolicyExpansion = (id: string) => {
    setExpandedPolicyId(expandedPolicyId === id ? null : id)
    // Cerrar otros paneles al abrir uno nuevo
    setExpandedAssetId(null)
  }

  // Modificar la función toggleContractSelection para que funcione como las otras funciones de expansión
  const isAssetReferencedBySelectedContract = (assetId: string) => {
    if (!selectedContractId) return false
    const contract = contractDefinitions.find((c) => c.id === selectedContractId)
    return contract?.assetIds?.includes(assetId) || false
  }

  // Función para verificar si una política está referenciada por el contrato seleccionado
  const isPolicyReferencedBySelectedContract = (policyId: string) => {
    if (!selectedContractId) return false
    const contract = contractDefinitions.find((c) => c.id === selectedContractId)
    return contract?.accessPolicyId === policyId || contract?.contractPolicyId === policyId
  }

  // Función para determinar el tipo de política referenciada (acceso o contrato)
  const getPolicyReferenceType = (policyId: string) => {
    if (!selectedContractId) return null
    const contract = contractDefinitions.find((c) => c.id === selectedContractId)
    if (contract?.accessPolicyId === policyId) return "Access Policy"
    if (contract?.contractPolicyId === policyId) return "Contract Policy"
    return null
  }

  // Función para formatear JSON para mostrar
  const formatJsonForDisplay = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2)
    } catch (e) {
      return String(json)
    }
  }

  // Update connector address state when it changes in the API
  // Add this useEffect to check the connector status when the component mounts
  useEffect(() => {
    setConnectorAddressState(getConnectorAddress())
    // Check initial connector status
    checkCurrentConnectorStatus()
  }, [])

  // Actualizar useEffect para establecer el valor predeterminado correcto
  useEffect(() => {
    // Establecer el valor predeterminado si no existe en localStorage
    if (typeof window !== "undefined" && !localStorage.getItem("connectorAddress")) {
      localStorage.setItem("connectorAddress", "http://172.16.56.42/provider-qna/cp/api/management")
      setConnectorAddressState("http://172.16.56.42/provider-qna/cp/api/management")
    }
  }, [])

  // Add this function to check the current connector status
  const checkCurrentConnectorStatus = async () => {
    try {
      const currentAddress = getConnectorAddress()
      const isReachable = await checkConnectorReachable(currentAddress)
      setConnectorStatus(isReachable ? "connected" : "disconnected")
      if (!isReachable) {
        setFailedConnectorAddress(currentAddress)
      } else {
        setFailedConnectorAddress(null)
      }
    } catch (err) {
      setConnectorStatus("disconnected")
      setFailedConnectorAddress(getConnectorAddress())
    }
  }

  // Update the handleConnectorChange function
  const handleConnectorChange = async () => {
    if (!connectorAddress.trim()) {
      setError("Connector address cannot be empty")
      return
    }

    // Save the previous connector address so we can revert if needed
    const previousAddress = getConnectorAddress()
    setPreviousConnectorAddress(previousAddress)

    setIsChangingConnector(true)
    setError(null) // Clear any existing errors
    setSuccessMessage(null) // Clear any existing success messages

    try {
      // First check if the connector is reachable
      const isReachable = await checkConnectorReachable(connectorAddress)

      if (!isReachable) {
        // If connector isn't reachable, show error and revert
        setError(`No connector found at ${connectorAddress}. Please check the address and try again.`)
        setConnectorStatus("disconnected")
        setFailedConnectorAddress(connectorAddress)

        // Restore the previous connector address
        setConnectorAddress(previousAddress)
        setConnectorAddressState(previousAddress)
        return
      }

      // If connector is reachable, update the address
      localStorage.setItem("connectorAddress", connectorAddress)
      setConnectorAddress(connectorAddress)
      setConnectorStatus("connected")
      setFailedConnectorAddress(null)

      // Refresh data with the new connector
      setIsRefreshing(true)
      try {
        await fetchData()
        showSuccessMessage(`Successfully connected to: ${connectorAddress}`)
      } catch (fetchError: any) {
        // Check if the error is a "Connector not found" error
        if (fetchError.message && fetchError.message.includes("Connector not found")) {
          setError(`No connector found at ${connectorAddress}. Please check the address and try again.`)
          setConnectorStatus("disconnected")
          setFailedConnectorAddress(connectorAddress)

          // Restore the previous connector address
          setConnectorAddress(previousAddress)
          setConnectorAddressState(previousAddress)
        } else {
          // Even if fetching data fails, we're still connected to the connector
          setError(`Connected to ${connectorAddress}, but failed to load data: ${fetchError.message}`)
        }
      }
    } catch (err: any) {
      console.error("Error checking connector:", err)

      // Check if the error is a "Connector not found" error
      if (err.message && err.message.includes("Connector not found")) {
        setError(`No connector found at ${connectorAddress}. Please check the address and try again.`)
        setConnectorStatus("disconnected")
        setFailedConnectorAddress(connectorAddress)
      } else {
        setError(`Failed to check connector: ${err.message}`)
        setConnectorStatus("disconnected")
        setFailedConnectorAddress(connectorAddress)
      }

      // Restore the previous connector address
      setConnectorAddress(previousAddress)
      setConnectorAddressState(previousAddress)
    } finally {
      setIsChangingConnector(false)
      setIsRefreshing(false)
    }
  }

  // Añadir manejador para la tecla ENTER en el campo de dirección del conector
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleConnectorChange()
    }
  }

  // Update the fetchData function to ensure it uses the current connector address
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
          console.log("Current connector address:", getConnectorAddress())

          let hasError = false
          let errorMessage = ""

          // Fetch data sequentially to better identify which request fails
          try {
            console.log("Fetching assets...")
            const assetsData = await getAssets()
            console.log("Assets data received:", assetsData)
            setAssets(assetsData)
          } catch (assetError: any) {
            console.error("Failed to load assets:", assetError)
            hasError = true
            errorMessage = `Failed to load assets: ${assetError.message}`
            setAssets(getMockAssets())
          }

          try {
            console.log("Fetching policies...")
            const policiesData = await getPolicies()
            console.log("Policies data received:", policiesData)
            setPolicies(policiesData)
          } catch (policyError: any) {
            console.error("Failed to load policies:", policyError)
            hasError = true
            errorMessage = errorMessage || `Failed to load policies: ${policyError.message}`
            setPolicies(getMockPolicies())
          }

          try {
            console.log("Fetching contract definitions...")
            const contractsData = await getContractDefinitions()
            console.log("Contract definitions data received:", contractsData)
            setContractDefinitions(contractsData)
          } catch (contractError: any) {
            console.error("Failed to load contracts:", contractError)
            hasError = true
            errorMessage = errorMessage || `Failed to load contracts: ${contractError.message}`
            setContractDefinitions(getMockContractDefinitions())
          }

          if (hasError) {
            setError(`${errorMessage} Using fallback data.`)
          } else {
            showSuccessMessage("Data loaded from API successfully")
          }
        } catch (apiError: any) {
          console.error("API error:", apiError)
          setError(`Failed to load data from API: ${apiError.message}. Falling back to mock data.`)

          // Fall back to mock data
          setAssets(getMockAssets())
          setPolicies(getMockPolicies())
          setContractDefinitions(getMockContractDefinitions())
        }
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(`Failed to load data: ${err.message}`)

      // Fall back to mock data
      setAssets(getMockAssets())
      setPolicies(getMockPolicies())
      setContractDefinitions(getMockContractDefinitions())
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
    }, 5000)
  }

  // Handle connector address change
  const handleConnectorAddressChange = (address: string) => {
    setConnectorAddressState(address)
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

  // Navigate to consumer page
  const navigateToConsumer = () => {
    router.push("/edc-consumer")
  }

  // Manejador para cambiar el estado de FL Data App
  const handleFlDataAppToggle = () => {
    setIsFlDataAppEnabled(!isFlDataAppEnabled)
  }

  // Modificar la función toggleContractExpansion para que también seleccione el contrato
  const toggleContractExpansion = (id: string) => {
    // Si ya está expandido, lo contraemos y deseleccionamos
    if (expandedContractId === id) {
      setExpandedContractId(null)
      setSelectedContractId(null)
    } else {
      // Si no está expandido, lo expandimos y seleccionamos
      setExpandedContractId(id)
      setSelectedContractId(id)
    }
    // Cerrar otros paneles al abrir uno nuevo
    setExpandedAssetId(null)
    setExpandedPolicyId(null)
  }

  // Add the Connector Status Banner right after the header
  return (
    <main className="min-h-screen flex flex-col pb-20">
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
                  {t("title")}
                  <ChevronDown className="ml-2 h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 bg-black border-gray-700 text-white">
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                  onClick={navigateToConsumer}
                >
                  {t("consumer")}
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

              {/* Nueva sección de Data Apps */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="hover:bg-gray-800 focus:bg-gray-800 data-[state=open]:bg-lime-500 data-[state=open]:text-black font-medium">
                  Data Apps
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-black border-gray-700 text-white">
                  <div className="px-2 py-1.5 flex items-center space-x-2">
                    <Checkbox
                      id="fl-data-app"
                      checked={isFlDataAppEnabled}
                      onCheckedChange={handleFlDataAppToggle}
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
      <div className="flex-1 p-6 pt-24 pb-20 bg-white">
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
            <XCircle className="w-5 h-5 mr-2 text-red-500" />
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
                  {/* Actualizar el componente Input para incluir el manejador de la tecla ENTER */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Assets Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">{t("assets")}</h2>
                {/* Replace AssetFormDialog component usage */}
                <AssetFormDialog onAddAsset={handleAddAsset} />
              </div>
              <div className="space-y-3">
                {assets.map((asset) => {
                  // Determinar el tipo de asset basado en su ID o nombre
                  const isFlService =
                    asset.id.toLowerCase().includes("fl-") ||
                    asset.id.toLowerCase().includes("flower") ||
                    asset.name.toLowerCase().includes("federated") ||
                    asset.name.toLowerCase().includes("fl service")

                  const isModel = asset.id.toLowerCase().includes("model") || asset.name.toLowerCase().includes("ml")

                  // Determinar el icono según el tipo
                  let assetTypeIcon = <Database className="h-5 w-5 text-white" />

                  if (isFlService) {
                    assetTypeIcon = <Network className="h-5 w-5 text-white" />
                  } else if (isModel) {
                    assetTypeIcon = <BarChart2 className="h-5 w-5 text-white" />
                  }

                  // Verificar si este asset está referenciado por el contrato seleccionado
                  const isReferenced = isAssetReferencedBySelectedContract(asset.id)

                  return (
                    <div
                      key={asset.id}
                      className={`rounded border transition-colors mb-1 ${
                        expandedAssetId === asset.id
                          ? "border-lime-500 bg-white"
                          : isReferenced
                            ? "border-gray-300 bg-gray-100"
                            : "hover:border-lime-300 bg-white"
                      }`}
                    >
                      <div
                        className="flex items-start relative overflow-hidden cursor-pointer"
                        onClick={() => toggleAssetExpansion(asset.id)}
                      >
                        {/* Barra lateral más ancha */}
                        <div
                          className={`w-6 h-full absolute left-0 top-0 bottom-0 ${
                            isFlService ? "bg-teal-500" : isModel ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                        ></div>

                        {/* Icono centrado directamente sobre la barra sin fondo blanco */}
                        <div className="w-6 flex items-center justify-center absolute left-0 top-0 bottom-0 text-white">
                          {assetTypeIcon}
                        </div>

                        {/* Contenido con padding ajustado para la barra más ancha */}
                        <div className="flex-1 pl-8 p-3">
                          <div className="flex items-start">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteAsset(asset.id)
                              }}
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
                            <ChevronDown
                              className={`h-5 w-5 text-gray-400 transition-transform ${expandedAssetId === asset.id ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Panel expandible con información adicional */}
                      {expandedAssetId === asset.id && (
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <h4 className="text-sm font-medium mb-2 text-lime-700">Data Address</h4>
                            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                              {formatJsonForDisplay(asset.dataAddress || { baseUrl: asset.baseUrl, type: "HttpData" })}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {assets.length === 0 && <p className="text-center text-gray-500 py-4">{t("noAssetsAvailable")}</p>}
              </div>
            </div>

            {/* Policies Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">{t("policies")}</h2>
                {/* Replace PolicyFormDialog component usage */}
                <PolicyFormDialog onAddPolicy={handleAddPolicy} />
              </div>
              <div className="space-y-3">
                {policies.map((policy) => {
                  // Verificar si esta política está referenciada por el contrato seleccionado
                  const isReferenced = isPolicyReferencedBySelectedContract(policy.id)
                  const referenceType = getPolicyReferenceType(policy.id)

                  return (
                    <div
                      key={policy.id}
                      className={`rounded border transition-colors mb-1 ${
                        expandedPolicyId === policy.id
                          ? "border-lime-500 bg-white"
                          : isReferenced
                            ? "border-gray-300 bg-gray-100"
                            : "hover:border-lime-300 bg-white"
                      }`}
                    >
                      <div
                        className="flex items-start p-3 cursor-pointer relative"
                        onClick={() => togglePolicyExpansion(policy.id)}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePolicy(policy.id)
                          }}
                          className="h-8 w-8 mr-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <h3 className="font-medium">{policy.name}</h3>
                          <p className="text-sm text-gray-600">{policy.constraints}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            <span className="font-medium">ID:</span> {policy.id}
                          </p>
                          {referenceType && (
                            <div className="text-right mt-1">
                              <span className="text-xs text-gray-600">{referenceType}</span>
                            </div>
                          )}
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-gray-400 transition-transform ${expandedPolicyId === policy.id ? "rotate-180" : ""}`}
                        />
                      </div>

                      {/* Panel expandible con información adicional */}
                      {expandedPolicyId === policy.id && (
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <h4 className="text-sm font-medium mb-2 text-lime-700">Policy Details</h4>
                            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                              {formatJsonForDisplay(
                                policy.policy || {
                                  permission: policy.permission || [],
                                  prohibition: policy.prohibition || [],
                                  obligation: policy.obligation || [],
                                },
                              )}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {policies.length === 0 && <p className="text-center text-gray-500 py-4">{t("noPoliciesAvailable")}</p>}
              </div>
            </div>

            {/* Contract Definitions Column */}
            <div className="border rounded-lg p-4 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-lime-700">{t("contractDefinitions")}</h2>
                {/* Replace ContractFormDialog component usage */}
                <ContractFormDialog onAddContract={handleAddContractDefinition} assets={assets} policies={policies} />
              </div>
              <div className="space-y-3">
                {contractDefinitions.map((contract) => (
                  <div
                    key={contract.id}
                    className={`bg-white rounded border transition-colors mb-1 ${
                      expandedContractId === contract.id ? "border-lime-500" : "hover:border-lime-300"
                    }`}
                  >
                    <div
                      className="flex items-start p-3 cursor-pointer relative"
                      onClick={() => toggleContractExpansion(contract.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteContractDefinition(contract.id)
                        }}
                        className="h-8 w-8 mr-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="flex-1">
                        <h3 className="font-medium">{contract.name}</h3>
                        <p className="text-sm text-gray-600">{contract.accessPolicy}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          <span className="font-medium">ID:</span> {contract.id}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-gray-400 transition-transform ${expandedContractId === contract.id ? "rotate-180" : ""}`}
                      />
                    </div>

                    {/* Panel expandible con información adicional */}
                    {expandedContractId === contract.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="text-sm font-medium mb-2 text-lime-700">Contract Details</h4>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Access Policy:</span> {contract.accessPolicyId}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Contract Policy:</span> {contract.contractPolicyId}
                            </p>
                            {contract.assetIds && contract.assetIds.length > 0 && (
                              <div className="mt-1">
                                <p className="text-sm font-medium">Referenced Assets:</p>
                                <ul className="text-sm text-gray-600 list-disc pl-4 mt-1">
                                  {contract.assetIds.map((assetId) => (
                                    <li key={assetId}>{assetId}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {contractDefinitions.length === 0 && (
                  <p className="text-center text-gray-500 py-4">{t("noContractsAvailable")}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom bar with buttons - solo se muestra si FL Data App está activado */}
      {isFlDataAppEnabled && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-100 p-2 z-40 border-t border-gray-200">
          <div className="container mx-auto grid grid-cols-2 gap-3">
            <div className="flex justify-center">
              <Button
                className="bg-indigo-400 hover:bg-indigo-500 text-white h-9 text-sm w-11/12"
                onClick={() => setIsFlowerLogsOpen(true)}
              >
                <Server className="h-4 w-4 mr-1" />
                Connect to Flower Server
              </Button>
            </div>
            <div className="flex justify-center">
              <Button
                className="bg-green-400 hover:bg-green-500 text-white h-9 text-sm w-11/12"
                onClick={() => setIsMLflowOpen(true)}
              >
                <BarChart2 className="h-4 w-4 mr-1" />
                Connect to MLflow Server
              </Button>
            </div>
          </div>
        </div>
      )}

      <FlowerServerLogsDialog open={isFlowerLogsOpen} onOpenChange={setIsFlowerLogsOpen} />
      <MLflowDialog open={isMLflowOpen} onOpenChange={setIsMLflowOpen} />

      {/* Connectivity Check Dialog */}
      <ConnectivityCheckDialog open={isCheckDialogOpen} onOpenChange={setIsCheckDialogOpen} />
    </main>
  )
}
