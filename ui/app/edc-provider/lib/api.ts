// Import the connector address update function from the API proxy
import { updateConnectorAddress } from "@/app/api-proxy/[...path]/route"
import { connectorDefaults } from "@/edc-config"

// Mock data for development
export const getMockAssets = () => [
  // FL Services
  {
    id: "fl-fedavg-v1",
    name: "Federated Learning - FedAvg Algorithm",
    description:
      "Federated Learning service using Federated Averaging algorithm for distributed model training without sharing raw data.",
    baseUrl: "https://example.com/fl-services/fedavg",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/fl-services/fedavg",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },
  {
    id: "fl-secure-agg-v2",
    name: "Secure Aggregation FL Service",
    description:
      "Privacy-preserving federated learning with secure aggregation protocol to protect individual contributions.",
    baseUrl: "https://example.com/fl-services/secure-agg",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/fl-services/secure-agg",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },
  {
    id: "flower-client-manager",
    name: "Flower Client Management Service",
    description: "Service for managing and orchestrating Flower clients in a federated learning environment.",
    baseUrl: "https://example.com/flower/client-manager",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/flower/client-manager",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },

  // Models
  {
    id: "model-cnn-v2",
    name: "Pre-trained CNN Model",
    description: "Convolutional Neural Network trained on manufacturing defect images with 95% accuracy.",
    baseUrl: "https://example.com/models/cnn-v2",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/models/cnn-v2",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },
  {
    id: "model-transformer-v1",
    name: "Transformer for Time Series",
    description: "Transformer-based model for time series forecasting in manufacturing processes.",
    baseUrl: "https://example.com/models/transformer-v1",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/models/transformer-v1",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },
  {
    id: "ml-anomaly-detector",
    name: "ML Anomaly Detection System",
    description: "Machine learning system for detecting anomalies in sensor data streams in real-time.",
    baseUrl: "https://example.com/ml/anomaly-detector",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/ml/anomaly-detector",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },

  // Regular Data Assets
  {
    id: "data-sensor-001",
    name: "Manufacturing Sensor Dataset",
    description:
      "Real-time sensor data from manufacturing equipment including temperature, pressure, and vibration readings.",
    baseUrl: "https://example.com/data/sensor-001",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/data/sensor-001",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },
  {
    id: "data-metrics-002",
    name: "Production Metrics Dataset",
    description: "Historical production metrics with quality indicators and efficiency measurements.",
    baseUrl: "https://example.com/data/metrics-002",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/data/metrics-002",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },
  {
    id: "api-access-003",
    name: "Quality Control API",
    description: "API access to quality control systems with real-time validation capabilities.",
    baseUrl: "https://example.com/api/quality-control",
    dataAddress: {
      "@type": "DataAddress",
      type: "HttpData",
      baseUrl: "https://example.com/api/quality-control",
      proxyPath: "true",
      proxyQueryParams: "true",
    },
  },
]

export const getMockPolicies = () => [
  {
    id: "policy-1",
    name: "Open Access",
    constraints: "No restrictions, freely accessible",
    policy: {
      "@id": "open-access-policy",
      "@type": "odrl:Set",
      "odrl:permission": {
        "odrl:action": { "@id": "odrl:use" },
        "odrl:constraint": {
          "odrl:leftOperand": { "@id": "AccessLevel" },
          "odrl:operator": { "@id": "odrl:eq" },
          "odrl:rightOperand": "open",
        },
      },
      "odrl:prohibition": [],
      "odrl:obligation": [],
    },
  },
  {
    id: "policy-2",
    name: "Restricted Access",
    constraints: "Requires authentication and authorization",
    policy: {
      "@id": "restricted-access-policy",
      "@type": "odrl:Set",
      "odrl:permission": {
        "odrl:action": { "@id": "odrl:use" },
        "odrl:constraint": {
          "odrl:leftOperand": { "@id": "AuthenticationRequired" },
          "odrl:operator": { "@id": "odrl:eq" },
          "odrl:rightOperand": "true",
        },
      },
      "odrl:prohibition": [],
      "odrl:obligation": [],
    },
  },
  {
    id: "policy-3",
    name: "Time-Limited Access",
    constraints: "Access expires after 30 days",
    policy: {
      "@id": "time-limited-policy",
      "@type": "odrl:Set",
      "odrl:permission": {
        "odrl:action": { "@id": "odrl:use" },
        "odrl:constraint": {
          "odrl:leftOperand": { "@id": "TimeLimit" },
          "odrl:operator": { "@id": "odrl:lteq" },
          "odrl:rightOperand": "30",
        },
      },
      "odrl:prohibition": [],
      "odrl:obligation": [],
    },
  },
]

export const getMockContractDefinitions = () => [
  {
    id: "contract-1",
    name: "Basic Data Sharing",
    accessPolicy: "Access: Open Access, Contract: Time-Limited Access, Assets: 2",
    accessPolicyId: "policy-1",
    contractPolicyId: "policy-3",
    assetIds: ["data-sensor-001", "data-metrics-002"],
  },
  {
    id: "contract-2",
    name: "Premium Data Sharing",
    accessPolicy: "Access: Restricted Access, Contract: Time-Limited Access, Assets: 1",
    accessPolicyId: "policy-2",
    contractPolicyId: "policy-3",
    assetIds: ["api-access-003"],
  },
  {
    id: "contract-3",
    name: "FL Service Contract",
    accessPolicy: "Access: Restricted Access, Contract: Open Access, Assets: 2",
    accessPolicyId: "policy-2",
    contractPolicyId: "policy-1",
    assetIds: ["fl-fedavg-v1", "fl-secure-agg-v2"],
  },
]

// Default connector address
const DEFAULT_CONNECTOR_ADDRESS = "http://172.16.0.2/provider-qna/cp/api/management"

// Function to get the current connector address
export const getConnectorAddress = () => {
  // First try to get from localStorage (user preference)
  if (typeof window !== "undefined") {
    const savedAddress = localStorage.getItem("connectorAddress")
    if (savedAddress) {
      return savedAddress
    }
  }

  // If not in localStorage, use the default from our config
  return connectorDefaults.provider
}

// Function to update the connector address
export const setConnectorAddress = (address: string) => {
  console.log("Setting connector address to:", address)

  // Update the connector address in the API proxy
  updateConnectorAddress(address)

  // Also store in localStorage for persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("connectorAddress", address)
    console.log("Connector address saved to localStorage")
  }

  return address
}

// Initialize connector address from localStorage if available
if (typeof window !== "undefined") {
  const savedAddress = localStorage.getItem("connectorAddress")
  if (savedAddress) {
    console.log("Initializing connector address from localStorage:", savedAddress)
    setConnectorAddress(savedAddress)
  } else {
    console.log("Setting default connector address:", connectorDefaults.provider)
    localStorage.setItem("connectorAddress", connectorDefaults.provider)
    setConnectorAddress(connectorDefaults.provider)
  }
}

// Get the API proxy base URL
const getApiProxyUrl = () => {
  // When running in the browser, use the current origin
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api-proxy`
  }
  // Fallback for server-side rendering
  return "/api-proxy"
}

// Modificar cualquier función que use process.env.NEXT_PUBLIC_API_URL para usar valores predeterminados o localStorage
// Por ejemplo, si hay una función getDefaultApiUrl(), reemplazarla con:

export function getDefaultApiUrl(): string {
  // Primero verificar si hay una URL guardada en localStorage
  if (typeof window !== "undefined") {
    const savedUrl = localStorage.getItem("defaultApiUrl")
    if (savedUrl) {
      return savedUrl
    }
  }

  // Si no hay URL guardada, usar un valor predeterminado
  return "http://localhost:8181/api/v1/management"
}

// Update the fetchFromApiProxy function to handle 404 responses
export const fetchFromApiProxy = async (endpoint: string, options: RequestInit = {}) => {
  const API_PROXY_URL = getApiProxyUrl()
  const url = `${API_PROXY_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`

  // Obtener la dirección del conector actual desde localStorage o usar un valor predeterminado
  const connectorAddress =
    typeof window !== "undefined"
      ? localStorage.getItem("connectorAddress") || "http://172.16.56.42/provider-qna/cp/api/management"
      : "http://172.16.56.42/provider-qna/cp/api/management"

  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-API-KEY": "password",
    // Incluir la dirección del conector en los encabezados
    "X-Connector-Address": connectorAddress,
  }

  try {
    console.log(`Making API request to: ${url}`)
    console.log(`Using connector address: ${connectorAddress}`)

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    // Verificar si hay un error específico de "conector no encontrado"
    if (response.headers.get("X-Error-Type") === "connector_not_found") {
      const errorData = await response.json()
      throw new Error(`Connector not found: ${errorData.message || "The host is unreachable"}`)
    }

    // Get the response data
    let responseData
    let responseText = ""

    try {
      responseText = await response.text()

      // Try to parse as JSON if not empty
      if (responseText && responseText.trim()) {
        try {
          responseData = JSON.parse(responseText)

          // Special handling for {"error":{}} pattern
          if (
            responseData &&
            typeof responseData === "object" &&
            responseData.error &&
            Object.keys(responseData.error).length === 0
          ) {
            console.warn("Received empty error object from API, treating as empty result")

            // For collection endpoints, return empty array
            if (endpoint.includes("/request")) {
              return []
            }

            // For other endpoints, return empty object
            return {}
          }
        } catch (e) {
          // If not valid JSON, use the text
          responseData = responseText
        }
      } else {
        // Handle empty response
        responseData = { status: response.status, message: "Empty response" }
      }
    } catch (e) {
      console.error("Error reading response:", e)
      responseData = { status: response.status, message: "Failed to read response" }
    }

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}: ${responseText}`)

      // Check for 404 responses which indicate the connector doesn't exist
      if (response.status === 404) {
        throw new Error(`Connector not found: The endpoint returned 404 Not Found`)
      }

      // For 404 errors, return empty array for collection endpoints
      if (response.status === 404 && endpoint.includes("/request")) {
        console.warn("Resource not found, returning empty array")
        return []
      }

      // Special handling for {"error":{}} pattern
      if (responseText.includes('{"error":{}}')) {
        console.warn("Received empty error object from API, treating as empty result")

        // For collection endpoints, return empty array
        if (endpoint.includes("/request")) {
          return []
        }

        // For other endpoints, return empty object
        return {}
      }

      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return responseData
  } catch (error) {
    console.error(`API request error:`, error)

    // Verificar si es un error de "conector no encontrado"
    if (error instanceof Error && error.message.includes("Connector not found")) {
      throw error // Reenviar el error específico para que se maneje adecuadamente
    }

    // For collection endpoints, return empty array instead of throwing
    if (endpoint.includes("/request")) {
      console.warn("Error in collection request, returning empty array")
      return []
    }

    throw error
  }
}

// Default query spec template
const createQuerySpec = (limit = 1000) => ({
  "@context": {
    "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
  },
  "@type": "QuerySpec",
  offset: 0,
  limit: limit,
  sortOrder: "DESC",
  filterExpression: [],
})

// API functions for assets
export const getAssets = async () => {
  try {
    console.log("Fetching assets...")

    // Create a more robust query spec
    const querySpec = {
      "@context": {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
      },
      "@type": "QuerySpec",
      offset: 0,
      limit: 1000,
      sortOrder: "DESC",
      filterExpression: [],
    }

    // Log the exact request being sent
    console.log("Assets request payload:", JSON.stringify(querySpec, null, 2))

    const response = await fetchFromApiProxy("/v3/assets/request", {
      method: "POST",
      body: JSON.stringify(querySpec),
    })

    console.log("Assets response:", response)

    // Handle empty or non-array responses
    if (!response) {
      console.warn("Empty assets response, returning empty array")
      return []
    }

    if (!Array.isArray(response)) {
      console.warn("Unexpected assets response format, not an array:", response)

      // If response is an object with an empty error property, return empty array
      if (response && typeof response === "object" && response.error && Object.keys(response.error).length === 0) {
        console.warn("Received error object with empty error property, returning empty array")
        return []
      }

      return []
    }

    // Transform the response to match our expected format
    return response.map((asset: any) => ({
      id: asset["@id"] || `asset-${Math.random().toString(36).substring(2, 9)}`,
      name: asset.properties?.id || asset["@id"] || "Unnamed Asset",
      description: asset.properties?.description || "No description available",
      baseUrl: asset.properties?.["asset:prop:baseUrl"] || asset.dataAddress?.baseUrl || undefined,
      dataAddress: asset.dataAddress || undefined, // Añadir el dataAddress completo
    }))
  } catch (error) {
    console.error("Error fetching assets:", error)
    // Return empty array instead of throwing to prevent app crash
    return []
  }
}

export const createAsset = async (asset: any) => {
  try {
    const assetId = asset.id || asset.name.replace(/\s+/g, "-").toLowerCase()

    const payload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@id": assetId,
      "@type": "Asset",
      properties: {
        description: asset.description,
        id: assetId,
        name: asset.name,
      },
      dataAddress: {
        "@type": "DataAddress",
        type: "HttpData",
        baseUrl: asset.baseUrl || "",
        proxyPath: "true",
        proxyQueryParams: "true",
      },
    }

    console.log("Creating asset with payload:", payload)
    return await fetchFromApiProxy("/v3/assets", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("Error creating asset:", error)
    throw error
  }
}

export const deleteAsset = async (id: string) => {
  try {
    console.log(`Deleting asset with ID: ${id}`)
    return await fetchFromApiProxy(`/v3/assets/${id}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Error deleting asset:", error)
    throw error
  }
}

// API functions for policies
export const getPolicies = async () => {
  try {
    console.log("Fetching policies...")

    // Create a more robust query spec
    const querySpec = {
      "@context": {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
      },
      "@type": "QuerySpec",
      offset: 0,
      limit: 1000,
      sortOrder: "DESC",
      filterExpression: [],
    }

    // Log the exact request being sent
    console.log("Policies request payload:", JSON.stringify(querySpec, null, 2))

    const response = await fetchFromApiProxy("/v3/policydefinitions/request", {
      method: "POST",
      body: JSON.stringify(querySpec),
    })

    console.log("Policies response:", response)

    // Handle empty or non-array responses
    if (!response) {
      console.warn("Empty policies response, returning empty array")
      return []
    }

    if (!Array.isArray(response)) {
      console.warn("Unexpected policies response format, not an array:", response)

      // If response is an object with an empty error property, return empty array
      if (response && typeof response === "object" && response.error && Object.keys(response.error).length === 0) {
        console.warn("Received error object with empty error property, returning empty array")
        return []
      }

      return []
    }

    // Transform the response to match our expected format
    return response.map((policy: any) => {
      // Extract constraints from the policy structure
      let constraints = "Custom policy"
      let policyJson = null

      try {
        // Try to extract constraint information from the ODRL policy
        const policyObj = policy.policy
        policyJson = JSON.stringify(policyObj)

        if (policyObj && policyObj["odrl:permission"] && policyObj["odrl:permission"]["odrl:constraint"]) {
          const constraint = policyObj["odrl:permission"]["odrl:constraint"]
          constraints = `${constraint["odrl:leftOperand"]["@id"]} ${constraint["odrl:operator"]["@id"]} ${constraint["odrl:rightOperand"]}`
        } else if (policyObj && policyObj["odrl:obligation"] && policyObj["odrl:obligation"]["odrl:constraint"]) {
          const constraint = policyObj["odrl:obligation"]["odrl:constraint"]
          constraints = `${constraint["odrl:leftOperand"]["@id"]} ${constraint["odrl:operator"]["@id"]} ${constraint["odrl:rightOperand"]}`
        }
      } catch (e) {
        console.warn("Error extracting policy constraints:", e)
        constraints = "Complex policy structure"
      }

      return {
        id: policy["@id"] || `policy-${Math.random().toString(36).substring(2, 9)}`,
        name: policy["@id"] || "Unnamed Policy",
        constraints: constraints,
        policyJson: policyJson, // Añadir el JSON de la política
        permission: policy.policy?.["odrl:permission"] || undefined,
        prohibition: policy.policy?.["odrl:prohibition"] || undefined,
        obligation: policy.policy?.["odrl:obligation"] || undefined,
        policy: policy.policy || undefined, // Añadir la política completa
      }
    })
  } catch (error) {
    console.error("Error fetching policies:", error)
    // Return empty array instead of throwing to prevent app crash
    return []
  }
}

export const createPolicy = async (policy: any) => {
  try {
    const policyId = policy.id || policy.name.replace(/\s+/g, "-").toLowerCase()

    // Parse the policy JSON to extract the relevant parts
    let policyContent = {}
    try {
      policyContent = JSON.parse(policy.policyJson)
    } catch (e) {
      throw new Error("Invalid policy JSON format")
    }

    const payload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@type": "PolicyDefinition",
      "@id": policyId,
      policy: policyContent,
    }

    console.log("Creating policy with payload:", payload)
    return await fetchFromApiProxy("/v3/policydefinitions", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("Error creating policy:", error)
    throw error
  }
}

export const deletePolicy = async (id: string) => {
  try {
    console.log(`Deleting policy with ID: ${id}`)
    return await fetchFromApiProxy(`/v3/policydefinitions/${id}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Error deleting policy:", error)
    throw error
  }
}

// API functions for contract definitions
export const getContractDefinitions = async () => {
  try {
    console.log("Fetching contract definitions...")

    // Create a more robust query spec
    const querySpec = {
      "@context": {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
      },
      "@type": "QuerySpec",
      offset: 0,
      limit: 1000,
      sortOrder: "DESC",
      filterExpression: [],
    }

    // Log the exact request being sent
    console.log("Contract definitions request payload:", JSON.stringify(querySpec, null, 2))

    const response = await fetchFromApiProxy("/v3/contractdefinitions/request", {
      method: "POST",
      body: JSON.stringify(querySpec),
    })

    console.log("Contract definitions response:", response)

    // Handle empty or non-array responses
    if (!response) {
      console.warn("Empty contract definitions response, returning empty array")
      return []
    }

    if (!Array.isArray(response)) {
      console.warn("Unexpected contract definitions response format, not an array:", response)

      // If response is an object with an empty error property, return empty array
      if (response && typeof response === "object" && response.error && Object.keys(response.error).length === 0) {
        console.warn("Received error object with empty error property, returning empty array")
        return []
      }

      return []
    }

    // Transform the response to match our expected format
    return response.map((contract: any) => {
      // Extract access policy information
      let accessPolicy = ""
      let assetIds = []

      try {
        accessPolicy = `Access: ${contract.accessPolicyId || "Unknown"}, Contract: ${contract.contractPolicyId || "Unknown"}`

        // Extract asset IDs from the assetsSelector
        if (contract.assetsSelector) {
          if (contract.assetsSelector.operandRight && typeof contract.assetsSelector.operandRight === "string") {
            assetIds = [contract.assetsSelector.operandRight]
            accessPolicy += `, Asset: ${contract.assetsSelector.operandRight}`
          } else if (Array.isArray(contract.assetsSelector.operandRight)) {
            assetIds = contract.assetsSelector.operandRight
            accessPolicy += `, Assets: ${contract.assetsSelector.operandRight.length}`
          }
        }
      } catch (e) {
        console.warn("Error extracting contract access policy:", e)
        accessPolicy = "Complex contract structure"
      }

      return {
        id: contract["@id"] || `contract-${Math.random().toString(36).substring(2, 9)}`,
        name: contract["@id"] || "Unnamed Contract",
        accessPolicy: accessPolicy,
        accessPolicyId: contract.accessPolicyId,
        contractPolicyId: contract.contractPolicyId,
        assetIds: assetIds,
      }
    })
  } catch (error) {
    console.error("Error fetching contract definitions:", error)
    // Return empty array instead of throwing to prevent app crash
    return []
  }
}

export const createContractDefinition = async (contract: any) => {
  try {
    const contractId = contract.id || contract.name.replace(/\s+/g, "-").toLowerCase()

    // For multiple assets, we need to handle differently
    let assetsSelector

    if (contract.assetIds.length === 1) {
      // Single asset
      assetsSelector = {
        "@type": "Criterion",
        operandLeft: "https://w3id.org/edc/v0.0.1/ns/id",
        operator: "=",
        operandRight: contract.assetIds[0],
      }
    } else {
      // Multiple assets - using the "in" operator
      assetsSelector = {
        "@type": "Criterion",
        operandLeft: "https://w3id.org/edc/v0.0.1/ns/id",
        operator: "in",
        operandRight: contract.assetIds,
      }
    }

    const payload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@id": contractId,
      "@type": "ContractDefinition",
      accessPolicyId: contract.accessPolicyId,
      contractPolicyId: contract.contractPolicyId,
      assetsSelector: assetsSelector,
    }

    console.log("Creating contract definition with payload:", payload)
    return await fetchFromApiProxy("/v3/contractdefinitions", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("Error creating contract definition:", error)
    throw error
  }
}

export const deleteContractDefinition = async (id: string) => {
  try {
    console.log(`Deleting contract definition with ID: ${id}`)
    return await fetchFromApiProxy(`/v3/contractdefinitions/${id}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Error deleting contract definition:", error)
    throw error
  }
}

// Debug API call function
export const debugApiCall = (action: string, params: any, error?: any) => {
  if (error) {
    console.group(`[DEBUG API CALL] ${action} - ERROR`)
  } else {
    console.group(`[DEBUG API CALL] ${action}`)
  }
  console.log("Timestamp:", new Date().toISOString())
  console.log("Action:", action)
  console.log("Parameters:", params)
  if (error) {
    console.error("Error:", error)
  }
  console.groupEnd()
}

// Update the checkConnectorReachable function to better handle 404 errors
export async function checkConnectorReachable(address: string): Promise<boolean> {
  try {
    console.log(`Checking if connector is reachable at: ${address}`)

    // Enhanced debug logging for connector check
    console.group("🔍 CONNECTOR REACHABILITY CHECK")
    console.log("🌐 Testing connector address:", address)

    // Create a temporary API proxy URL
    const API_BASE_URL = typeof window !== "undefined" ? `${window.location.origin}/api-proxy` : "/api-proxy"
    console.log("🔌 Using API proxy:", API_BASE_URL)

    // Store the current connector address
    const currentAddress = getConnectorAddress()
    console.log("💾 Current connector address:", currentAddress)

    // We'll use a temporary header to check the connector without changing the global state
    const headers = {
      "Content-Type": "application/json",
      "X-API-KEY": "password",
      "X-Connector-Address": address, // Use the address we're checking
    }

    // Try to fetch assets as a simple connectivity test with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    console.log("📡 Sending test request to:", `${API_BASE_URL}/v3/assets/request`)

    try {
      const response = await fetch(`${API_BASE_URL}/v3/assets/request`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(createQuerySpec(1)),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("📊 Response status:", response.status, response.statusText)

      // Check for connector not found error
      if (response.headers.get("X-Error-Type") === "connector_not_found") {
        console.log("❌ Connector not found error detected")
        console.groupEnd()
        return false
      }

      console.log("✅ Connector is reachable:", response.ok)
      console.groupEnd()

      // Only return true if we got a successful response
      return response.ok
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error("❌ Fetch error:", fetchError)
      console.groupEnd()
      return false
    }
  } catch (error) {
    console.error("❌ Error checking connector reachability:", error)
    console.log("❌ Connector is NOT reachable")
    console.groupEnd()
    return false
  }
}

// Placeholder for checkConnectorExists function
export async function checkConnectorExists(address: string): Promise<boolean> {
  // Implement your logic to check if the connector exists at the given address
  // This is a placeholder and should be replaced with actual implementation
  console.warn("checkConnectorExists function is a placeholder and needs implementation")
  return true // Or false, depending on your implementation
}
