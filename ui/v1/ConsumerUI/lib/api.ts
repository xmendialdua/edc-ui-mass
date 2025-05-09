// Define API endpoints as constants
const API_ENDPOINTS = {
  CATALOG: "/v3/catalog/request",
  CONTRACT_NEGOTIATIONS: "/v3/contractnegotiations/request",
  TRANSFER_PROCESSES: "/v3/transferprocesses/request",
  INITIATE_NEGOTIATION: "/v3/contractnegotiations",
  INITIATE_TRANSFER: "/v3/transferprocesses",
  CONTRACT_AGREEMENTS: "/v3/contractagreements",
}

// Store the API base URL that can be updated by the user
// Set the correct consumer connector address by default
let connectorAddress = "http://172.16.56.42/consumer/cp/api/management"

// Function to update the connector address
export function getConnectorAddress() {
  return connectorAddress
}

// Make sure setConnectorAddress is properly updating the global variable
export function setConnectorAddress(address: string) {
  connectorAddress = address
  console.log("Connector address updated to:", address)
  // Clear any cached data that might be using the old address
  localStorage.setItem("connectorAddress", address)
}

// Use the current hostname instead of relative paths
// This ensures requests go to the actual server where the app is hosted
const getApiBaseUrl = () => {
  // When running in the browser, use the current origin
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api-proxy`
  }
  // Fallback for server-side rendering
  return "/api-proxy"
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

// Helper function for API requests
export async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
  // Get the base URL using the current hostname
  const API_BASE_URL = getApiBaseUrl()

  // Ensure we're using an absolute path with the current hostname
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`

  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-API-KEY": "password",
  }

  try {
    console.log(`Making API request to: ${url}`)
    console.log(`Request body:`, options.body)

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API request failed with status ${response.status}: ${errorText}`)
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    // Check if the response is JSON
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return response.json()
    } else {
      return response.text()
    }
  } catch (error) {
    console.error(`API request error:`, error)

    // Provide more detailed error information
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error("Network error: This could be due to CORS, network connectivity, or the API server being down")
      console.error("Request URL was:", url)
      throw new Error(
        "Network error: Unable to connect to the API. Please check your network connection and API server status.",
      )
    }

    throw error
  }
}

// Query the provider catalog
export async function queryCatalog(counterPartyId: string, counterPartyAddress: string) {
  try {
    console.log(`Querying catalog from ${counterPartyAddress} with ID ${counterPartyId}`)

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

    const response = await fetchFromApi(API_ENDPOINTS.CATALOG, {
      method: "POST",
      body: JSON.stringify(payload),
    })

    console.log("Catalog response:", response)

    // Transform the response to match our expected format
    if (response["@type"] === "dcat:Catalog" && response["dcat:dataset"]) {
      // If it's a single dataset (not in an array)
      if (!Array.isArray(response["dcat:dataset"])) {
        const dataset = response["dcat:dataset"]
        return [
          {
            id: dataset["@id"] || dataset["id"],
            name: dataset["title"] || dataset["@id"] || dataset["id"],
            description: dataset["description"] || "No description available",
            policy: dataset["odrl:hasPolicy"] || null,
          },
        ]
      }
      // If it's an array of datasets
      else {
        return response["dcat:dataset"].map((dataset: any) => ({
          id: dataset["@id"] || dataset["id"],
          name: dataset["title"] || dataset["@id"] || dataset["id"],
          description: dataset["description"] || "No description available",
          policy: dataset["odrl:hasPolicy"] || null,
        }))
      }
    }

    // If the response structure is unexpected, return an empty array
    console.error("Unexpected catalog response structure:", response)
    return []
  } catch (error) {
    console.error("Error querying catalog:", error)
    throw error
  }
}

// Update the types in the API file
type ContractNegotiation = {
  id: string
  state: string
  contractAgreementId?: string
  assetId?: string
  assetName?: string
  createdAt: number // Add createdAt field
}

type TransferProcess = {
  id: string
  state: string
  contractId: string
  assetId: string
  assetName?: string
  transferType?: string
  endpointUrl?: string
  createdAt: number // Add createdAt field
  isCompleted?: boolean
}

// Update the getContractNegotiations function to include createdAt
export async function getContractNegotiations() {
  try {
    const response = await fetchFromApi(API_ENDPOINTS.CONTRACT_NEGOTIATIONS, {
      method: "POST",
      body: JSON.stringify(createQuerySpec()),
    })

    console.log("Contract negotiations response:", response)

    // Transform and sort the response
    const negotiations = await Promise.all(
      response.map(async (negotiation: any) => {
        const result = {
          id: negotiation["@id"],
          state: negotiation["state"],
          contractAgreementId: negotiation["contractAgreementId"],
          assetId: negotiation["assetId"] || extractAssetIdFromPolicy(negotiation),
          assetName: "Loading...",
          createdAt: negotiation["createdAt"] || Date.now(), // Use current time as fallback
          errorDetail: negotiation["errorDetail"] || null, // Add error detail
        }

        // Get contract agreement details if available
        if (result.contractAgreementId) {
          try {
            const agreementDetails = await fetchFromApi(
              `${API_ENDPOINTS.CONTRACT_AGREEMENTS}/${result.contractAgreementId}`,
              {
                method: "GET",
              },
            )
            if (agreementDetails) {
              result.assetId = agreementDetails.assetId || result.assetId
              result.assetName = agreementDetails.assetId || "Unknown Asset"
            }
          } catch (error) {
            console.error(`Error fetching details for agreement ${result.contractAgreementId}:`, error)
          }
        }

        return result
      }),
    )

    // Sort by createdAt in descending order
    return negotiations.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error("Error fetching contract negotiations:", error)
    throw error
  }
}

// Helper function to extract asset ID from policy
function extractAssetIdFromPolicy(negotiation: any) {
  try {
    if (
      negotiation.policy &&
      negotiation.policy.permission &&
      negotiation.policy.permission.length > 0 &&
      negotiation.policy.permission[0].target
    ) {
      return negotiation.policy.permission[0].target
    }
  } catch (e) {
    console.error("Error extracting asset ID from policy:", e)
  }
  return "unknown"
}

// Update the getTransferProcesses function to include createdAt and additional fields
export async function getTransferProcesses() {
  try {
    const response = await fetchFromApi(API_ENDPOINTS.TRANSFER_PROCESSES, {
      method: "POST",
      body: JSON.stringify(createQuerySpec()),
    })

    console.log("Transfer processes response:", response)

    // Transform and sort the response
    const transfers = response.map((transfer: any) => {
      // Extract fields directly from the root of the transfer object
      const assetId = transfer.assetId || "unknown"
      const contractId = transfer.contractId || "unknown"
      const transferType = transfer.transferType || "unknown"

      // Extract endpoint URL for PUSH transfers
      let endpointUrl = undefined
      if (transferType.includes("PUSH") && transfer.dataDestination) {
        endpointUrl = transfer.dataDestination.baseUrl
      }

      return {
        id: transfer["@id"],
        state: transfer["state"],
        contractId,
        assetId,
        assetName: assetId, // Use assetId as assetName
        transferType,
        endpointUrl,
        createdAt: transfer.stateTimestamp || Date.now(), // Use stateTimestamp as createdAt
        isCompleted: transfer["state"] === "COMPLETED",
      }
    })

    // Sort by createdAt in descending order
    return transfers.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error("Error fetching transfer processes:", error)
    throw error
  }
}

// Initiate a contract negotiation with the exact format requested
export async function initiateNegotiation(
  assetId: string,
  counterPartyId: string,
  counterPartyAddress: string,
  policy: any,
) {
  try {
    console.log(`Initiating negotiation for asset ${assetId} with ${counterPartyId}`)

    // Ensure policy has the required structure
    const policyToSend = {
      ...policy,
      target: policy.target || assetId,
      assigner: policy.assigner || counterPartyId,
    }

    const payload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@type": "ContractRequest",
      counterPartyAddress: counterPartyAddress,
      counterPartyId: counterPartyId,
      protocol: "dataspace-protocol-http",
      policy: policyToSend,
      callbackAddresses: [],
    }

    console.log("Negotiation payload:", payload)

    const response = await fetchFromApi(API_ENDPOINTS.INITIATE_NEGOTIATION, {
      method: "POST",
      body: JSON.stringify(payload),
    })

    console.log("Negotiation initiation response:", response)
    return response
  } catch (error) {
    console.error("Error initiating negotiation:", error)
    throw error
  }
}

// Initiate a data transfer with the exact format requested
export async function initiateTransfer(
  contractId: string,
  assetId: string,
  counterPartyId: string,
  counterPartyAddress: string,
  transferType = "HttpData-PULL",
  serverAddress?: string,
) {
  try {
    console.log(`Initiating transfer for contract ${contractId} and asset ${assetId}`)

    // Create the data destination based on transfer type
    let dataDestination
    if (transferType === "HttpData-PUSH" && serverAddress) {
      dataDestination = {
        type: "HttpData",
        baseUrl: serverAddress,
      }
    } else {
      dataDestination = {
        type: "HttpProxy",
      }
    }

    const payload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      assetId: assetId,
      counterPartyAddress: counterPartyAddress,
      connectorId: counterPartyId,
      contractId: contractId,
      dataDestination: dataDestination,
      protocol: "dataspace-protocol-http",
      transferType: transferType,
    }

    console.log("Transfer payload:", payload)

    const response = await fetchFromApi(API_ENDPOINTS.INITIATE_TRANSFER, {
      method: "POST",
      body: JSON.stringify(payload),
    })

    console.log("Transfer initiation response:", response)
    return response
  } catch (error) {
    console.error("Error initiating transfer:", error)
    throw error
  }
}

/**
 * Check API connectivity to all endpoints and log results
 * @returns Promise<object> with connectivity status for each endpoint
 */
export async function checkApiConnectivity() {
  const API_BASE_URL = getApiBaseUrl()
  const currentConnectorAddress = getConnectorAddress()

  console.log("=== API CONNECTIVITY CHECK ===")
  console.log(`Checking connectivity to API at: ${currentConnectorAddress}`)
  console.log(`Using proxy: ${API_BASE_URL}`)

  const results = {
    catalog: { status: false, message: "", timestamp: new Date().toISOString() },
    negotiations: { status: false, message: "", timestamp: new Date().toISOString() },
    transfers: { status: false, message: "", timestamp: new Date().toISOString() },
  }

  // Check Contract Negotiations endpoint
  try {
    console.log(`\n--- Checking Contract Negotiations Endpoint ---`)
    console.log(`Endpoint: ${API_ENDPOINTS.CONTRACT_NEGOTIATIONS}`)
    console.log(`Full URL: ${API_BASE_URL}${API_ENDPOINTS.CONTRACT_NEGOTIATIONS}`)

    const negotiationsResponse = await fetchFromApi(API_ENDPOINTS.CONTRACT_NEGOTIATIONS, {
      method: "POST",
      body: JSON.stringify(createQuerySpec(5)),
    })

    console.log("✅ Contract Negotiations endpoint is accessible")
    console.log("Response:", negotiationsResponse)

    results.negotiations.status = true
    results.negotiations.message = `Successfully retrieved ${Array.isArray(negotiationsResponse) ? negotiationsResponse.length : 0} negotiations`
  } catch (error) {
    console.error("❌ Failed to connect to Contract Negotiations endpoint:", error)
    results.negotiations.status = false
    results.negotiations.message = error instanceof Error ? error.message : String(error)
  }

  // Check Transfer Processes endpoint
  try {
    console.log(`\n--- Checking Transfer Processes Endpoint ---`)
    console.log(`Endpoint: ${API_ENDPOINTS.TRANSFER_PROCESSES}`)
    console.log(`Full URL: ${API_BASE_URL}${API_ENDPOINTS.TRANSFER_PROCESSES}`)

    const transfersResponse = await fetchFromApi(API_ENDPOINTS.TRANSFER_PROCESSES, {
      method: "POST",
      body: JSON.stringify(createQuerySpec(5)),
    })

    console.log("✅ Transfer Processes endpoint is accessible")
    console.log("Response:", transfersResponse)

    results.transfers.status = true
    results.transfers.message = `Successfully retrieved ${Array.isArray(transfersResponse) ? transfersResponse.length : 0} transfers`
  } catch (error) {
    console.error("❌ Failed to connect to Transfer Processes endpoint:", error)
    results.transfers.status = false
    results.transfers.message = error instanceof Error ? error.message : String(error)
  }

  // Check Catalog endpoint last as it requires more parameters
  try {
    console.log(`\n--- Checking Catalog Endpoint ---`)
    console.log(`Endpoint: ${API_ENDPOINTS.CATALOG}`)
    console.log(`Full URL: ${API_BASE_URL}${API_ENDPOINTS.CATALOG}`)

    // Use the correct values for testing
    const testPayload = {
      "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
      "@type": "CatalogRequest",
      counterPartyAddress: "http://provider-qna-controlplane:8082/api/dsp",
      counterPartyId: "did:web:provider-identityhub%3A7083:provider",
      protocol: "dataspace-protocol-http",
      querySpec: {
        offset: 0,
        limit: 1,
      },
    }

    const catalogResponse = await fetchFromApi(API_ENDPOINTS.CATALOG, {
      method: "POST",
      body: JSON.stringify(testPayload),
    })

    console.log("✅ Catalog endpoint is accessible")
    console.log("Response:", catalogResponse)

    results.catalog.status = true
    results.catalog.message = "Successfully connected to catalog endpoint"
  } catch (error) {
    console.error("❌ Failed to connect to Catalog endpoint:", error)
    results.catalog.status = false
    results.catalog.message = error instanceof Error ? error.message : String(error)
  }

  // Log summary
  console.log("\n=== API CONNECTIVITY SUMMARY ===")
  console.log(`Catalog: ${results.catalog.status ? "✅ Connected" : "❌ Failed"} - ${results.catalog.message}`)
  console.log(
    `Negotiations: ${results.negotiations.status ? "✅ Connected" : "❌ Failed"} - ${results.negotiations.message}`,
  )
  console.log(`Transfers: ${results.transfers.status ? "✅ Connected" : "❌ Failed"} - ${results.transfers.message}`)

  return results
}

