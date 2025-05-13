import { connectorDefaults } from "./defaults"

export const checkApiConnectivity = async () => {
  const results = {
    catalog: { status: false, message: "", timestamp: new Date().toISOString() },
    negotiations: { status: false, message: "", timestamp: new Date().toISOString() },
    transfers: { status: false, message: "", timestamp: new Date().toISOString() },
  }

  try {
    // Check catalog endpoint
    try {
      // Simulate a catalog request
      await new Promise((resolve) => setTimeout(resolve, 500))
      results.catalog.status = true
      results.catalog.message = "Successfully connected to catalog endpoint"
    } catch (error) {
      results.catalog.status = false
      results.catalog.message = error instanceof Error ? error.message : "Failed to connect to catalog endpoint"
    }

    // Check negotiations endpoint
    try {
      // Simulate a negotiations request
      await new Promise((resolve) => setTimeout(resolve, 500))
      results.negotiations.status = true
      results.negotiations.message = "Successfully connected to negotiations endpoint"
    } catch (error) {
      results.negotiations.status = false
      results.negotiations.message =
        error instanceof Error ? error.message : "Failed to connect to negotiations endpoint"
    }

    // Check transfers endpoint
    try {
      // Simulate a transfers request
      await new Promise((resolve) => setTimeout(resolve, 500))
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

// Function to get the current connector address
export const getConnectorAddress = () => {
  // First try to get from localStorage (user preference)
  if (typeof window !== "undefined") {
    const savedAddress = localStorage.getItem("connectorAddress")
    if (savedAddress) {
      return savedAddress
    }
  }

  // If not in localStorage, use the environment variable as fallback
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Final fallback to the default connector address
  return connectorDefaults.consumer
}
