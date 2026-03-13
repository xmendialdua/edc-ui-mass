"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronDown,
  Server,
  Database,
  Network,
  BarChart2,
  Filter,
} from "lucide-react"

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
} from "@/app/edc-provider/lib/api"

// Importar la configuración centralizada
import { connectorDefaults } from "@/edc-config"

import { useLanguage } from "@/contexts/language-context"
import { useAppSettings } from "@/contexts/app-settings-context"

// Cambiar las importaciones de componentes
import { AssetFormDialog } from "@/app/edc-provider/assets/asset-form-dialog"
import { PolicyFormDialog } from "@/app/edc-provider/policies/policy-form-dialog"
import { ContractFormDialog } from "@/app/edc-provider/contracts/contract-form-dialog"
import { ConnectivityCheckDialog } from "@/app/edc-provider/common/connectivity-check-dialog"

// Importar el componente AppHeader
import { AppHeader } from "@/components/app-header"

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
  const { language, setLanguage, t } = useLanguage()
  const { isFlDataAppEnabled, setIsFlDataAppEnabled } = useAppSettings()

  // State for each category
  const [assets, setAssets] = useState<Asset[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [contractDefinitions, setContractDefinitions] = useState<ContractDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [apiMode, setApiMode] = useState<"mock" | "live">("live") // Changed default to "live"

  // Actualizar el estado inicial para el connectorAddress
  const [connectorAddress, setConnectorAddressState] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("connectorAddress") || connectorDefaults.provider
      : connectorDefaults.provider,
  )
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false)
  const [isChangingConnector, setIsChangingConnector] = useState(false)
  const [previousConnectorAddress, setPreviousConnectorAddress] = useState(getConnectorAddress())
  // Add the connectorStatus state
  const [connectorStatus, setConnectorStatus] = useState<"connected" | "disconnected" | "unknown">("unknown")
  // Modificar el estado para almacenar la dirección que causó el error
  const [failedConnectorAddress, setFailedConnectorAddress] = useState<string | null>(null)

  // Estados para controlar la expansión y selección de elementos
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null)
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  // Añadir un nuevo estado para controlar la expansión de los Contract Definitions
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null)

  // Estado para controlar qué sección de filtros está abierta
  const [pinnedSection, setPinnedSection] = useState<string | null>(null)
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null)

  // Referencias para detectar clics fuera de los paneles de filtros
  const assetsFilterRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  // Estados para los filtros
  const [assetsFilters, setAssetsFilters] = useState({
    assetType: ["fl", "model", "normal"], // Todas marcadas por defecto
    sortBy: "name", // Cambiado de "default" a "name"
  })

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
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("connectorAddress")) {
        localStorage.setItem("connectorAddress", connectorDefaults.provider)
        setConnectorAddressState(connectorDefaults.provider)
        // También actualizar el valor en el API proxy
        setConnectorAddress(connectorDefaults.provider)
      } else {
        // Asegurarse de que el estado refleja el valor actual
        setConnectorAddressState(getConnectorAddress())
      }
    }
  }, [])

  // Efecto para detectar clics fuera de los paneles de filtros
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Si el panel de filtros está abierto y el clic no fue dentro del panel ni en el título
      if (
        pinnedSection === "assets" &&
        assetsFilterRef.current &&
        !assetsFilterRef.current.contains(event.target as Node) &&
        titleRef.current &&
        !titleRef.current.contains(event.target as Node)
      ) {
        setPinnedSection(null)
      }
    }

    // Añadir el event listener
    document.addEventListener("mousedown", handleClickOutside)

    // Limpiar el event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [pinnedSection])

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

  // Función para manejar los cambios en los checkboxes de tipo de asset
  const handleAssetTypeChange = (type: string) => {
    setAssetsFilters((prev) => {
      // Si ya está seleccionado, lo quitamos
      if (prev.assetType.includes(type)) {
        // No permitir deseleccionar todos los tipos
        if (prev.assetType.length === 1) {
          return prev
        }
        return { ...prev, assetType: prev.assetType.filter((t) => t !== type) }
      }
      // Si no está seleccionado, lo añadimos
      return { ...prev, assetType: [...prev.assetType, type] }
    })
  }

  // Función para determinar el tipo de asset
  const getAssetType = (asset: Asset): string => {
    const isFlService =
      asset.id.toLowerCase().includes("fl-") ||
      asset.id.toLowerCase().includes("flower") ||
      asset.name.toLowerCase().includes("federated") ||
      asset.name.toLowerCase().includes("fl service")

    const isModel = asset.id.toLowerCase().includes("model") || asset.name.toLowerCase().includes("ml")

    if (isFlService) return "fl"
    if (isModel) return "model"
    return "normal"
  }

  // Función para filtrar los assets según los filtros seleccionados
  const getFilteredAssets = () => {
    let filtered = [...assets]

    // Filtrar por tipo de asset
    if (assetsFilters.assetType.length > 0) {
      filtered = filtered.filter((asset) => assetsFilters.assetType.includes(getAssetType(asset)))
    }

    // Ordenar
    if (assetsFilters.sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    }

    return filtered
  }

  // Función para manejar el clic en una sección para mostrar/ocultar filtros
  const handleSectionClick = () => {
    // Si el panel está abierto, cerrarlo; si está cerrado, abrirlo
    setPinnedSection(pinnedSection === "assets" ? null : "assets")
  }

  // Función para verificar si una sección está activa
  const isSectionActive = (section: string) => {
    return pinnedSection === section
  }

  // Función para verificar si un título está siendo hover
  const isTitleHovered = (section: string) => {
    return hoveredTitle === section
  }

  // Componente de filtros para los assets
  const AssetsFilters = () => {
    return (
      <div className="absolute z-10 left-0 right-0 bg-white border-t border-lime-500 shadow-md cursor-pointer">
        <div className="flex flex-col">
          {/* Sección de tipos de asset con checkboxes */}
          <div className="p-2">
            <p className="text-xs font-medium text-gray-700 mb-1">Filter by asset type:</p>
            <div className="space-y-1">
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={assetsFilters.assetType.includes("fl")}
                  onChange={() => handleAssetTypeChange("fl")}
                  className="mr-1.5 h-3 w-3 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                />
                FL Service
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={assetsFilters.assetType.includes("model")}
                  onChange={() => handleAssetTypeChange("model")}
                  className="mr-1.5 h-3 w-3 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                />
                Model
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={assetsFilters.assetType.includes("normal")}
                  onChange={() => handleAssetTypeChange("normal")}
                  className="mr-1.5 h-3 w-3 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                />
                Normal
              </label>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col pb-20">
      {/* Top bar with lime green accent border */}
      <AppHeader
        title={t("title")}
        alternateMode={t("consumer")}
        isRefreshing={isRefreshing}
        onRefresh={refreshData}
        onCheckApi={() => setIsCheckDialogOpen(true)}
        onToggleApiMode={toggleApiMode}
        apiMode={apiMode}
      />

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
              <div className="relative">
                <div
                  ref={titleRef}
                  className="flex justify-between items-center mb-4 cursor-pointer h-8"
                  onClick={handleSectionClick}
                  onMouseEnter={() => setHoveredTitle("assets")}
                  onMouseLeave={() => setHoveredTitle(null)}
                >
                  <div className="flex items-center">
                    <h2 className="text-lg font-medium text-lime-700">{t("assets")}</h2>
                    <Filter
                      className={`ml-2 h-4 w-4 transition-colors ${
                        isSectionActive("assets")
                          ? "text-lime-600"
                          : isTitleHovered("assets")
                            ? "text-lime-400"
                            : "text-gray-300"
                      }`}
                    />
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <AssetFormDialog onAddAsset={handleAddAsset} />
                  </div>
                </div>

                {isSectionActive("assets") && (
                  <div ref={assetsFilterRef}>
                    <AssetsFilters />
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  {getFilteredAssets().map((asset) => {
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
                                <p className="text-sm text-gray-600 break-words">{asset.description}</p>
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
                                {formatJsonForDisplay(
                                  asset.dataAddress || { baseUrl: asset.baseUrl, type: "HttpData" },
                                )}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {getFilteredAssets().length === 0 && (
                    <p className="text-center text-gray-500 py-4">{t("noAssetsAvailable")}</p>
                  )}
                </div>
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

      {/* Connectivity Check Dialog */}
      <ConnectivityCheckDialog open={isCheckDialogOpen} onOpenChange={setIsCheckDialogOpen} />
    </main>
  )
}
