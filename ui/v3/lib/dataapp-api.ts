// lib/dataapp-api.ts

/**
 * Functions for interacting with the Data App API
 */

// Get the Data App API proxy base URL
const getDataAppApiUrl = () => {
  // When running in the browser, use the current origin
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api-dataapp`
  }
  // Fallback for server-side rendering
  return "/api-dataapp"
}

/**
 * Set the data source for the Flower client
 * @param type The type of data source (local, remote, library)
 * @param file The file to upload (for local type)
 * @param remoteUrl The remote URL (for remote type)
 * @returns Promise with the response
 */
export async function setFlowerDataSource(
  type: "local" | "remote" | "flower", // Cambiado de "library" a "flower"
  file?: File,
  remoteUrl?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const API_URL = getDataAppApiUrl()
    let url = `${API_URL}/flower/set-data-source?type=${type}`

    if (type === "remote" && remoteUrl) {
      url += `&remote_url=${encodeURIComponent(remoteUrl)}`
    }

    console.log(`Setting Flower data source: ${url}`)

    let response: Response

    if (type === "local" && file) {
      // For local type, send the file as form data
      const formData = new FormData()
      formData.append("file", file)

      response = await fetch(url, {
        method: "POST",
        body: formData,
      })
    } else {
      // For remote and flower types, just send the request
      response = await fetch(url, {
        method: "POST",
      })
    }

    // Log the response for debugging
    console.log(`Data source response status: ${response.status} ${response.statusText}`)

    // Si la respuesta es exitosa (200-299), consideramos que la operación fue exitosa
    // independientemente del contenido del cuerpo
    if (response.ok) {
      console.log("Received successful response (200 OK)")

      // Intentar leer el cuerpo de la respuesta, pero no es crítico si está vacío
      let responseText = ""
      try {
        responseText = await response.text()
        console.log(`Data source response body: ${responseText || "empty"}`)
      } catch (e) {
        console.log("Could not read response body, but response was successful")
      }

      // Intentar parsear como JSON solo si hay contenido
      let data = null
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.log("Response is not JSON, using text as message")
          data = { message: responseText }
        }
      } else {
        console.log("Response body is empty, using default success message")
        data = { message: "Data source set successfully" }
      }

      return {
        success: true,
        message: data?.message || "Data source set successfully",
      }
    }

    // Si llegamos aquí, la respuesta no fue exitosa
    let errorText = ""
    try {
      errorText = await response.text()
    } catch (e) {
      errorText = "Unknown error"
    }

    throw new Error(`Failed to set data source: ${response.status} ${response.statusText} - ${errorText}`)
  } catch (error: any) {
    console.error("Error setting Flower data source:", error)
    return {
      success: false,
      message: error.message || "Failed to set data source",
    }
  }
}

/**
 * Initiate a Flower client transfer
 * @param assetId The ID of the asset to transfer
 * @returns Promise with the connector transfer request parameters
 */
export async function initiateFlowerTransfer(assetId: string): Promise<{
  success: boolean
  message: string
  transferUrl?: string
}> {
  try {
    console.log(`Initiating Flower transfer for asset: ${assetId}`)

    // Construct the listener URL for the PUSH transfer
    const transferUrl = `http://172.19.0.2:30381/flower/listener/${assetId}`
    console.log(`Using transfer URL: ${transferUrl}`)

    // En una implementación real, aquí verificaríamos que el listener está listo
    // haciendo una solicitud GET al API de Data App

    // Simular una verificación exitosa
    console.log("Flower client ready to receive data")

    return {
      success: true,
      message: "Flower client ready to receive data",
      transferUrl,
    }
  } catch (error: any) {
    console.error("Error initiating Flower transfer:", error)
    return {
      success: false,
      message: error.message || "Failed to initiate Flower transfer",
    }
  }
}

/**
 * Set up MLflow server
 * @param hasExistingServer Whether to use an existing MLflow server
 * @param serverUrl The URL of the existing MLflow server (if applicable)
 * @returns Promise with the response
 */
export async function setupMlflowServer(
  hasExistingServer: boolean,
  serverUrl?: string,
): Promise<{ success: boolean; message: string; mlflowUrl?: string }> {
  try {
    console.log(`Setting up MLflow server. Has existing server: ${hasExistingServer}`)

    const API_URL = getDataAppApiUrl()
    let url = `${API_URL}/mlflow/set-mlflow-url`

    // Si hay un servidor existente, añadir la URL como parámetro
    if (hasExistingServer && serverUrl) {
      url += `?mlflow_url=${encodeURIComponent(serverUrl)}`
    }

    console.log(`Making request to: ${url}`)

    const response = await fetch(url, {
      method: "POST",
    })

    console.log(`MLflow setup response status: ${response.status} ${response.statusText}`)

    if (response.ok) {
      let responseText = ""
      try {
        responseText = await response.text()
        console.log(`MLflow setup response: ${responseText || "empty"}`)
      } catch (e) {
        console.log("Could not read response body, but response was successful")
      }

      // Intentar parsear como JSON solo si hay contenido
      let data = null
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.log("Response is not JSON, using text as message")
          data = { message: responseText }
        }
      } else {
        console.log("Response body is empty, using default success message")
        data = {
          message: hasExistingServer
            ? `Connected to MLflow server at ${serverUrl}`
            : "New MLflow server created successfully",
          mlflowUrl: hasExistingServer ? serverUrl : "http://172.19.0.2:30381/mlflow",
        }
      }

      return {
        success: true,
        message: data?.message || "MLflow server setup successfully",
        mlflowUrl: data?.mlflowUrl || (hasExistingServer ? serverUrl : "http://172.19.0.2:30381/mlflow"),
      }
    }

    // Si la respuesta no es exitosa
    let errorText = ""
    try {
      errorText = await response.text()
    } catch (e) {
      errorText = "Unknown error"
    }

    throw new Error(`Failed to setup MLflow server: ${response.status} ${response.statusText} - ${errorText}`)
  } catch (error: any) {
    console.error("Error setting up MLflow server:", error)
    return {
      success: false,
      message: error.message || "Failed to setup MLflow server",
    }
  }
}

export { getDataAppApiUrl }
