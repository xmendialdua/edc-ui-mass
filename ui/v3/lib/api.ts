// lib/api.ts

// Import the connector address update function from the API proxy
import { updateConnectorAddress, getProxyConnectorAddress } from "@/app/api-proxy/[...path]/route"

// Default connector address
const DEFAULT_CONNECTOR_ADDRESS = "http://172.16.56.42/provider-qna/cp/api/management"

// Function to get the current connector address
export const getConnectorAddress = () => {
  // Use the connector address from the API proxy
  return getProxyConnectorAddress()
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
    console.log("Setting default connector address:", DEFAULT_CONNECTOR_ADDRESS)
    localStorage.setItem("connectorAddress", DEFAULT_CONNECTOR_ADDRESS)
    setConnectorAddress(DEFAULT_CONNECTOR_ADDRESS)
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

// Update the fetchFromApiProxy function to handle 404 responses
export const fetchFromApi = async (endpoint: string, options: RequestInit = {}) => {
  const API_PROXY_URL = getApiProxyUrl()
  const url = `${API_PROXY_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`

  // Get the current connector address from localStorage or use a default value
  const connectorAddress =
    typeof window !== "undefined"
      ? localStorage.getItem("connectorAddress") || "http://172.16.56.42/provider-qna/cp/api/management"
      : "http://172.16.56.42/provider-qna/cp/api/management"

  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-API-KEY": "password",
    // Include the connector address in the headers
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

    // Check for specific "connector not found" error
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

    // Check if it's a "connector not found" error
    if (error instanceof Error && error.message.includes("Connector not found")) {
      throw error // Forward the specific error to be handled appropriately
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

// API connectivity check function
export async function checkApiConnectivity(): Promise<any> {
  const results = {
    catalog: { status: false, message: "", timestamp: new Date().toISOString() },
    negotiations: { status: false, message: "", timestamp: new Date().toISOString() },
    transfers: { status: false, message: "", timestamp: new Date().toISOString() },
  }

  try {
    // Check catalog endpoint
    try {
      // Try to fetch a catalog to test connectivity
      await fetchFromApi("/v3/catalog/request", {
        method: "POST",
        body: JSON.stringify({
          counterPartyAddress: "http://provider-qna-controlplane:8082/api/dsp",
          counterPartyId: "did:web:provider-identityhub%3A7083:provider",
          protocol: "dataspace-protocol-http",
          querySpec: createQuerySpec(1),
        }),
      })
      results.catalog.status = true
      results.catalog.message = "Successfully connected to catalog endpoint"
    } catch (error) {
      results.catalog.status = false
      results.catalog.message = error instanceof Error ? error.message : "Failed to connect to catalog endpoint"
    }

    // Check negotiations endpoint
    try {
      // Try to fetch negotiations to test connectivity
      await fetchFromApi("/v3/contractnegotiations/request", {
        method: "POST",
        body: JSON.stringify(createQuerySpec(1)),
      })
      results.negotiations.status = true
      results.negotiations.message = "Successfully connected to negotiations endpoint"
    } catch (error) {
      results.negotiations.status = false
      results.negotiations.message =
        error instanceof Error ? error.message : "Failed to connect to negotiations endpoint"
    }

    // Check transfers endpoint
    try {
      // Try to fetch transfers to test connectivity
      await fetchFromApi("/v3/transferprocesses/request", {
        method: "POST",
        body: JSON.stringify(createQuerySpec(1)),
      })
      results.transfers.status = true
      results.transfers.message = "Successfully connected to transfers endpoint"
    } catch (error) {
      results.transfers.status = false
      results.transfers.message = error instanceof Error ? error.message : "Failed to connect to transfers endpoint"
    }

    return results
  } catch (error) {
    console.error("Error in API connectivity check:", error)
    throw error
  }
}

// Check if a connector is reachable
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

// Modify the queryCatalog function to correctly parse the catalog response
export async function queryCatalog(counterPartyId: string, counterPartyAddress: string): Promise<any[]> {
  try {
    console.log(`Querying catalog from ${counterPartyAddress} with counterPartyId ${counterPartyId}`)

    // Crear el payload exacto para la solicitud del catálogo
    const payload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@type": "CatalogRequest",
      counterPartyAddress: counterPartyAddress,
      counterPartyId: counterPartyId,
      protocol: "dataspace-protocol-http",
      querySpec: {
        offset: 0,
        limit: 50,
      },
    }

    console.log("Catalog request payload:", JSON.stringify(payload, null, 2))

    const response = await fetchFromApi("/v3/catalog/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("Catalog response:", response)

    // Manejar respuesta vacía
    if (!response) {
      console.warn("Empty catalog response, returning empty array")
      return []
    }

    // Procesar la respuesta según el formato proporcionado
    if (response["dcat:dataset"]) {
      // Si dcat:dataset es un array, procesarlo directamente
      if (Array.isArray(response["dcat:dataset"])) {
        return response["dcat:dataset"].map((dataset: any) => ({
          id: dataset["@id"] || dataset.id || "unknown-id",
          name: dataset.name || dataset["@id"] || "Unnamed Asset",
          description: dataset.description || "No description available",
          policy: dataset["odrl:hasPolicy"] || {},
        }))
      }
      // Si dcat:dataset es un objeto único (no un array), convertirlo en un array de un elemento
      else {
        const dataset = response["dcat:dataset"]
        return [
          {
            id: dataset["@id"] || dataset.id || "unknown-id",
            name: dataset.name || dataset["@id"] || "Unnamed Asset",
            description: dataset.description || "No description available",
            policy: dataset["odrl:hasPolicy"] || {},
          },
        ]
      }
    }

    // Si no hay dcat:dataset, verificar si la respuesta es un array
    if (Array.isArray(response)) {
      return response.map((item: any) => ({
        id: item["@id"] || item.id || `asset-${Math.random().toString(36).substring(2, 9)}`,
        name: item.name || item["@id"] || "Unnamed Asset",
        description: item.description || "No description available",
        policy: item["odrl:hasPolicy"] || {},
      }))
    }

    // Si llegamos aquí, no pudimos procesar la respuesta en un formato conocido
    console.warn("Unexpected catalog response format:", response)
    return [] // Devolver array vacío en lugar de datos simulados
  } catch (error) {
    console.error("Error querying catalog:", error)
    throw error // Propagar el error para que se maneje en la UI
  }
}

// Add mock data functions
export const getMockCatalogItems = (): any[] => {
  return [
    {
      id: "asset-1",
      name: "Manufacturing Dataset",
      description: "This asset requires Membership to view and negotiate.",
      policy: {
        "@type": "Offer",
        "@id": "bWVtYmVyLWFuZC1kYXRhcHJvY2Vzc29yLWRlZg==:YXNzZXQtMQ==:Yzc2YmYwNjUtZGNiMi00OTlhLWE0YWUtOWEwMTdhMDNlZjEx",
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

export const getMockContractNegotiations = (): any[] => {
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

export const getMockTransferProcesses = (): any[] => {
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

// Update the getContractNegotiations function to better handle the response format
export async function getContractNegotiations(): Promise<any[]> {
  try {
    console.log("Fetching contract negotiations...")

    // Create the payload with the exact required format
    const querySpec = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@type": "QuerySpec",
    }

    // Log the exact request being sent
    console.log("Contract negotiations request payload:", JSON.stringify(querySpec, null, 2))

    const response = await fetchFromApi("/v3/contractnegotiations/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(querySpec),
    })

    console.log("Contract negotiations response:", response)

    // Handle empty or non-array responses
    if (!response) {
      console.warn("Empty contract negotiations response, returning empty array")
      return []
    }

    if (!Array.isArray(response)) {
      console.warn("Unexpected contract negotiations response format, not an array:", response)
      return []
    }

    // Process each negotiation and fetch additional details for FINALIZED ones
    const enhancedNegotiations = await Promise.all(
      response.map(async (negotiation: any) => {
        // Extract basic information
        const negotiationId =
          negotiation["@id"] || negotiation.id || `negotiation-${Math.random().toString(36).substring(2, 9)}`
        const state = negotiation.state || "UNKNOWN"
        let assetId = negotiation.assetId || "unknown"
        let assetName = negotiation.assetName || `Asset ${assetId}`
        let agreementDetails = null

        // For FINALIZED negotiations with a contractAgreementId, fetch the agreement details
        if (state === "FINALIZED" && negotiation.contractAgreementId) {
          try {
            console.log(`Fetching agreement details for negotiation: ${negotiationId}`)

            // Make a GET request to fetch the agreement details
            const agreementResponse = await fetchFromApi(`/v3/contractnegotiations/${negotiationId}/agreement`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            })

            console.log(`Agreement details for ${negotiationId}:`, agreementResponse)

            // Extract asset information from the agreement if available
            if (agreementResponse && agreementResponse.assetId) {
              assetId = agreementResponse.assetId
              assetName = agreementResponse.assetName || agreementResponse.assetId || assetName
            }

            agreementDetails = agreementResponse
          } catch (error) {
            console.error(`Error fetching agreement details for negotiation ${negotiationId}:`, error)
          }
        }

        // If assetId is not directly available, try to extract from correlationId
        if (assetId === "unknown" && negotiation.correlationId) {
          assetId = negotiation.correlationId
          assetName = `Asset ${assetId}`
        }

        return {
          id: negotiationId,
          state: state,
          contractAgreementId: negotiation.contractAgreementId,
          assetId: assetId,
          assetName: assetName,
          createdAt: negotiation.createdAt || Date.now(),
          errorDetail: negotiation.errorDetail || null,
          counterPartyId: negotiation.counterPartyId,
          counterPartyAddress: negotiation.counterPartyAddress,
          type: negotiation.type,
          agreementDetails: agreementDetails,
        }
      }),
    )

    return enhancedNegotiations
  } catch (error) {
    console.error("Error fetching contract negotiations:", error)
    throw error // Propagate the error to be handled in the UI
  }
}

// Initiate negotiation
export async function initiateNegotiation(
  assetId: string,
  counterPartyId: string,
  counterPartyAddress: string,
  policy: any,
): Promise<any> {
  try {
    console.log(
      `Initiating negotiation for asset ${assetId} with counterPartyId ${counterPartyId} at ${counterPartyAddress}`,
    )
    console.log(`Using policy ID: ${policy["@id"]}`)

    // Crear el payload con el formato exacto requerido
    const payload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@type": "ContractRequest",
      counterPartyAddress: counterPartyAddress,
      counterPartyId: counterPartyId,
      protocol: "dataspace-protocol-http",
      policy: {
        "@type": "Offer",
        "@id": policy["@id"] || `policy-${Math.random().toString(36).substring(2, 15)}`,
        assigner: counterPartyId,
        permission: policy.permission || [],
        prohibition: policy.prohibition || [],
        obligation: policy.obligation || {
          action: "use",
          constraint: {
            leftOperand: "DataAccess.level",
            operator: "eq",
            rightOperand: "processing",
          },
        },
        target: assetId,
      },
      callbackAddresses: [],
    }

    console.log("Negotiation request payload:", JSON.stringify(payload, null, 2))

    const response = await fetchFromApi("/v3/contractnegotiations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("Negotiation response:", response)
    return response
  } catch (error) {
    console.error("Error initiating negotiation:", error)
    throw error
  }
}

// Initiate transfer
export async function initiateTransfer(
  contractId: string,
  assetId: string,
  counterPartyId: string,
  counterPartyAddress: string,
  transferType: string,
  serverAddress?: string,
): Promise<any> {
  try {
    console.log(
      `Initiating transfer for contract ${contractId} and asset ${assetId} with counterPartyId ${counterPartyId} at ${counterPartyAddress}`,
    )

    // Asegurarse de que la dirección del counterParty tenga el formato correcto
    const formattedCounterPartyAddress = counterPartyAddress.endsWith("/api/dsp")
      ? counterPartyAddress
      : `${counterPartyAddress}/api/dsp`

    // Crear el payload base
    const transferRequest: any = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      assetId: assetId,
      counterPartyAddress: formattedCounterPartyAddress,
      connectorId: counterPartyId,
      contractId: contractId,
      protocol: "dataspace-protocol-http",
      transferType: transferType,
    }

    // Configurar dataDestination según el tipo de transferencia
    if (transferType === "HttpData-PUSH" && serverAddress) {
      transferRequest.dataDestination = {
        type: "HttpData",
        baseUrl: serverAddress,
      }
    } else if (transferType === "HttpData-PULL") {
      transferRequest.dataDestination = {
        type: "HttpProxy",
      }
    } else if (transferType === "FL-DataApp") {
      // Configuración específica para FL-DataApp
      transferRequest.dataDestination = {
        type: "FlowerClient",
      }
    } else if (transferType === "Model-DataApp") {
      // Configuración específica para Model-DataApp
      transferRequest.dataDestination = {
        type: "MLflowModel",
      }
    }

    console.log("Transfer request payload:", JSON.stringify(transferRequest, null, 2))

    const response = await fetchFromApi("/v3/transferprocesses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transferRequest),
    })

    console.log("Transfer response:", response)
    return response
  } catch (error) {
    console.error("Error initiating transfer:", error)
    throw error
  }
}

// Update the getTransferProcesses function to better handle the response format
export async function getTransferProcesses(): Promise<any[]> {
  try {
    console.log("Fetching transfer processes...")

    // Crear el payload con el formato exacto requerido
    const querySpec = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@type": "QuerySpec",
    }

    // Log the exact request being sent
    console.log("Transfer processes request payload:", JSON.stringify(querySpec, null, 2))

    const response = await fetchFromApi("/v3/transferprocesses/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(querySpec),
    })

    console.log("Transfer processes response:", response)

    // Handle empty or non-array responses
    if (!response) {
      console.warn("Empty transfer processes response, returning empty array")
      return []
    }

    if (!Array.isArray(response)) {
      console.warn("Unexpected transfer processes response format, not an array:", response)
      return []
    }

    // Transform the response to match our expected format
    return response.map((transfer: any) => {
      // Extract asset ID
      const assetId = transfer.assetId || "Unknown"

      // Determine transfer type
      const transferType = transfer.transferType || "Unknown"

      // Determine asset type based on transferType
      let assetType: "PULL" | "PUSH" | "FL-Service" | "Model" | undefined

      if (transferType.includes("PULL")) {
        assetType = "PULL"
      } else if (transferType.includes("PUSH")) {
        assetType = "PUSH"
      } else if (assetId.toLowerCase().includes("fl-") || transferType.includes("FL-DataApp")) {
        assetType = "FL-Service"
      } else if (assetId.toLowerCase().includes("model") || transferType.includes("Model-DataApp")) {
        assetType = "Model"
      }

      // Extract endpoint URL for PUSH transfers
      let endpointUrl = undefined
      if (transfer.dataDestination && transfer.dataDestination.baseUrl) {
        endpointUrl = transfer.dataDestination.baseUrl
      }

      return {
        id: transfer["@id"] || `transfer-${Math.random().toString(36).substring(2, 9)}`,
        state: transfer.state || "UNKNOWN",
        contractId: transfer.contractId || "Unknown",
        assetId: assetId,
        transferType: transferType,
        assetType: assetType,
        endpointUrl: endpointUrl,
        createdAt: transfer.stateTimestamp || Date.now(),
        isCompleted: transfer.state === "COMPLETED",
        correlationId: transfer.correlationId,
        type: transfer.type,
      }
    })
  } catch (error) {
    console.error("Error fetching transfer processes:", error)
    throw error // Propagar el error para que se maneje en la UI
  }
}

// Añadir esta nueva función para realizar solicitudes PULL a través del proxy
export async function pullData(transferProcessId: string, token: string): Promise<any> {
  try {
    console.log(`Pulling data for transfer: ${transferProcessId} with token`)

    // Usar el api-proxy para hacer la solicitud
    const API_PROXY_URL = getApiProxyUrl()
    console.log(`Making PULL request through API proxy: ${API_PROXY_URL}/v3/transfers/${transferProcessId}/pull`)

    const response = await fetch(`${API_PROXY_URL}/v3/transfers/${transferProcessId}/pull`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "password",
        "X-Connector-Address": getConnectorAddress(),
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to pull data: ${response.status} ${response.statusText}`)
    }

    // Determinar el tipo de contenido de la respuesta
    const contentType = response.headers.get("content-type") || ""
    console.log("Response content type:", contentType)

    if (contentType.includes("application/json")) {
      return {
        data: await response.json(),
        type: "json",
      }
    } else if (
      contentType.includes("text/") ||
      contentType.includes("application/xml") ||
      contentType.includes("application/javascript")
    ) {
      return {
        data: await response.text(),
        type: "text",
      }
    } else {
      // Para contenido binario, devolver el blob
      return {
        data: await response.blob(),
        type: "binary",
        filename: getFilenameFromResponse(response) || "downloaded-file",
      }
    }
  } catch (error) {
    console.error("Error pulling data:", error)
    throw error
  }
}

// Función auxiliar para obtener el nombre del archivo de la respuesta
const getFilenameFromResponse = (response: Response): string | null => {
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
      return `download.${extension}`
    }
  }

  return null
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
