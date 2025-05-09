import { type NextRequest, NextResponse } from "next/server"
import { getApiKeyForConnector } from "@/edc-config" // Importar la función

// Store the connector address in a module-level variable
let connectorAddress = "https://control-plane-connector4.dataspace-ikerlan.es/management"

// Function to update the connector address
export function updateConnectorAddress(newAddress: string) {
  connectorAddress = newAddress
  console.log("Connector address updated to:", connectorAddress)
}

// Function to get the current connector address
export function getProxyConnectorAddress(): string {
  return connectorAddress
}

// Función para obtener la dirección del conector desde los encabezados o usar un valor predeterminado
function getConnectorAddressFromRequest(request: NextRequest): string {
  const connectorAddress = request.headers.get("X-Connector-Address")
  if (connectorAddress) {
    return connectorAddress
  }
  // Valor predeterminado si no se proporciona en los encabezados
  return "https://control-plane-connector4.dataspace-ikerlan.es/management"
}

// URL fija para la solicitud PULL
const PULL_DATA_URL = "https://control-plane-connector4.dataspace-ikerlan.es/public"

// Modificar la función handlePullRequest para enviar el token sin el prefijo "Bearer "
export async function handlePullRequest(request: NextRequest, transferProcessId: string) {
  console.log(`Handling PULL request for transfer ${transferProcessId} to: ${PULL_DATA_URL}`)

  try {
    // Obtener el token de autorización del encabezado
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return new NextResponse(JSON.stringify({ error: "Authorization header is required for PULL requests" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // Extraer el token sin el prefijo "Bearer "
    let token = authHeader
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7) // Eliminar "Bearer " del token
    }

    // Realizar la solicitud PULL al endpoint con el token de autorización
    console.log(`Making PULL request to endpoint: ${PULL_DATA_URL}`)

    // Imprimir el token para depuración (solo las primeras 20 caracteres)
    const tokenPreview = token.substring(0, 20) + "..."
    console.log(`Using raw token: ${tokenPreview}`)

    const pullResponse = await fetch(PULL_DATA_URL, {
      method: "GET",
      headers: {
        Authorization: token, // Usar el token sin el prefijo "Bearer "
      },
    })

    if (!pullResponse.ok) {
      console.error(`PULL request failed: ${pullResponse.status} ${pullResponse.statusText}`)

      // Intentar leer el cuerpo de la respuesta de error para más información
      let errorBody = ""
      try {
        errorBody = await pullResponse.text()
        console.error(`Error response body: ${errorBody}`)
      } catch (e) {
        console.error("Could not read error response body")
      }

      return new NextResponse(
        JSON.stringify({
          error: "PULL request failed",
          status: pullResponse.status,
          statusText: pullResponse.statusText,
          details: errorBody,
        }),
        {
          status: pullResponse.status,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Obtener el tipo de contenido de la respuesta
    const contentType = pullResponse.headers.get("content-type") || "application/octet-stream"
    console.log(`PULL response content type: ${contentType}`)

    // Obtener los datos de la respuesta
    let responseData
    try {
      if (contentType.includes("application/json")) {
        responseData = await pullResponse.json()
      } else {
        responseData = await pullResponse.arrayBuffer()
      }
    } catch (error) {
      console.error("Error reading PULL response:", error)
      responseData = null
    }

    // Crear una nueva respuesta con los mismos headers y datos
    const newResponse = new NextResponse(
      responseData instanceof ArrayBuffer ? responseData : JSON.stringify(responseData),
      {
        status: pullResponse.status,
        statusText: pullResponse.statusText,
        headers: {
          "Content-Type": contentType,
        },
      },
    )

    // Copiar todos los headers de la respuesta original
    pullResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-length") {
        newResponse.headers.set(key, value)
      }
    })

    return newResponse
  } catch (error: any) {
    console.error("PULL request error:", error)
    return new NextResponse(
      JSON.stringify({
        error: "Failed to execute PULL request",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}

// Aplicar cambios similares a las funciones GET, PUT y DELETE
// Modificar la función GET para asegurar que se use la clave API correcta
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extraer la ruta de la URL directamente
    const url = new URL(request.url)
    const pathSegments = url.pathname.split("/api-proxy/")[1].split("/")
    const path = pathSegments.join("/")

    // Verificar si es una solicitud PULL
    if (path.includes("transfers") && path.includes("pull")) {
      // Extraer el ID del proceso de transferencia de la URL
      const segments = path.split("/")
      const transferProcessId = segments[1] // Asumiendo que la ruta es "transfers/{id}/pull"
      return handlePullRequest(request, transferProcessId)
    }

    // Obtener la dirección del conector desde los encabezados
    const API_BASE_URL = request.headers.get("X-Connector-Address") || connectorAddress
    console.log(`Proxying GET request to: ${API_BASE_URL}/${path}`)

    // Get the API key for the connector from edc-config
    const apiKey = getApiKeyForConnector(API_BASE_URL)
    console.log(`Using API key for connector ${API_BASE_URL}: ${apiKey}`)

    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey, // Usar la clave API específica para este conector
        // Forward any authorization headers from the original request
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") as string }
          : {}),
      },
    })

    // Get the response data
    const data = await response.text()

    // Check for 404 responses which indicate the connector doesn't exist
    if (response.status === 404) {
      console.warn(`Connector not found: ${API_BASE_URL} returned 404`)

      // Return a specific error for connector not found
      return new NextResponse(
        JSON.stringify({
          error: "connector_not_found",
          message: `No connector found at ${API_BASE_URL}. The endpoint returned 404 Not Found.`,
        }),
        {
          status: 503, // Service Unavailable
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": "connector_not_found",
          },
        },
      )
    }

    // Create a new response with the same status and headers
    const newResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value)
    })

    return newResponse
  } catch (error: any) {
    console.error("API proxy error:", error)

    // Detectar errores específicos de conexión
    const isConnectionError =
      error.message?.includes("EHOSTUNREACH") ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("fetch failed") ||
      error.message?.includes("network error")

    if (isConnectionError) {
      // Devolver un error específico para "conector no encontrado"
      return new NextResponse(
        JSON.stringify({
          error: "connector_not_found",
          message: `No connector found. The host is unreachable.`,
        }),
        {
          status: 503, // Service Unavailable
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": "connector_not_found",
          },
        },
      )
    }

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API", details: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

// Modificar la función POST para manejar mejor los errores de conexión
// Modificar la función POST para asegurar que se use la clave API correcta
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extraer la ruta de la URL directamente
    const url = new URL(request.url)
    const pathSegments = url.pathname.split("/api-proxy/")[1].split("/")
    const path = pathSegments.join("/")

    // Obtener la dirección del conector desde los encabezados
    const API_BASE_URL = request.headers.get("X-Connector-Address") || connectorAddress
    console.log(`Proxying POST request to: ${API_BASE_URL}/${path}`)

    // Get the request body for debugging
    let requestBody = ""
    try {
      requestBody = await request.clone().text()
      console.log(`Request body: ${requestBody}`)
    } catch (e) {
      requestBody = "Could not extract request body"
      console.error("Error extracting request body:", e)
    }

    // Get the request body
    const body = await request.text()

    // Log the full URL we're sending the request to
    console.log(`Full request URL: ${API_BASE_URL}/${path}`)

    // Get the API key for the connector from edc-config
    const apiKey = getApiKeyForConnector(API_BASE_URL)
    console.log(`Using API key for connector ${API_BASE_URL}: ${apiKey}`)

    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey, // Usar la clave API específica para este conector
        // Forward any authorization headers from the original request
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") as string }
          : {}),
      },
      body: body,
    })

    // Get the response data
    let data = ""
    try {
      data = await response.text()
      console.log(`Response status: ${response.status}, Response data: ${data}`)
    } catch (e) {
      console.error("Error reading response:", e)
      data = JSON.stringify({ error: "Failed to read response" })
    }

    // Check for 404 responses which indicate the connector doesn't exist
    if (response.status === 404) {
      console.warn(`Connector not found: ${API_BASE_URL} returned 404`)

      // Return a specific error for connector not found
      return new NextResponse(
        JSON.stringify({
          error: "connector_not_found",
          message: `No connector found at ${API_BASE_URL}. The endpoint returned 404 Not Found.`,
        }),
        {
          status: 503, // Service Unavailable
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": "connector_not_found",
          },
        },
      )
    }

    // Special handling for {"error":{}} responses
    if (data.includes('{"error":{}}')) {
      console.warn("Received empty error object from API, returning empty array")

      // For collection endpoints, return empty array
      if (path.includes("/request")) {
        return NextResponse.json([], {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      }
    }

    // Create a new response with the same status and headers
    const newResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value)
    })

    return newResponse
  } catch (error: any) {
    console.error("API proxy error:", error)

    // Detectar errores específicos de conexión
    const isConnectionError =
      error.message?.includes("EHOSTUNREACH") ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("fetch failed") ||
      error.message?.includes("network error")

    if (isConnectionError) {
      // Devolver un error específico para "conector no encontrado"
      return new NextResponse(
        JSON.stringify({
          error: "connector_not_found",
          message: `No connector found. The host is unreachable.`,
        }),
        {
          status: 503, // Service Unavailable
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": "connector_not_found",
          },
        },
      )
    }

    // For collection endpoints, return empty array instead of throwing
    if (path.includes("/request")) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API", details: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extraer la ruta de la URL directamente
    const url = new URL(request.url)
    const pathSegments = url.pathname.split("/api-proxy/")[1].split("/")
    const path = pathSegments.join("/")

    // Obtener la dirección del conector desde los encabezados
    const API_BASE_URL = getConnectorAddressFromRequest(request)
    console.log(`Proxying PUT request to: ${API_BASE_URL}/${path}`)

    // Get the request body for debugging
    let requestBody = ""
    try {
      requestBody = await request.clone().text()
    } catch (e) {
      requestBody = "Could not extract request body"
    }

    // Get the request body
    const body = await request.text()

    // Get the API key for the connector
    const apiKey = getApiKeyForConnector(API_BASE_URL)

    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey || "password",
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") as string }
          : {}),
      },
      body: body,
    })

    // Get the response data
    const data = await response.text()

    // Create a new response with the same status and headers
    const newResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value)
    })

    return newResponse
  } catch (error: any) {
    console.error("API proxy error:", error)

    // Detectar errores específicos de conexión
    const isConnectionError =
      error.message?.includes("EHOSTUNREACH") ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("fetch failed") ||
      error.message?.includes("network error")

    if (isConnectionError) {
      // Devolver un error específico para "conector no encontrado"
      return new NextResponse(
        JSON.stringify({
          error: "connector_not_found",
          message: `No connector found. The host is unreachable.`,
        }),
        {
          status: 503, // Service Unavailable
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": "connector_not_found",
          },
        },
      )
    }

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API", details: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extraer la ruta de la URL directamente
    const url = new URL(request.url)
    const pathSegments = url.pathname.split("/api-proxy/")[1].split("/")
    const path = pathSegments.join("/")

    // Obtener la dirección del conector desde los encabezados
    const API_BASE_URL = getConnectorAddressFromRequest(request)
    console.log(`Proxying DELETE request to: ${API_BASE_URL}/${path}`)

    // Get the API key for the connector
    const apiKey = getApiKeyForConnector(API_BASE_URL)

    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey || "password",
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") as string }
          : {}),
      },
    })

    // Get the response data
    const data = await response.text()

    // Create a new response with the same status and headers
    const newResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value)
    })

    return newResponse
  } catch (error: any) {
    console.error("API proxy error:", error)

    // Detectar errores específicos de conexión
    const isConnectionError =
      error.message?.includes("EHOSTUNREACH") ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("fetch failed") ||
      error.message?.includes("network error")

    if (isConnectionError) {
      // Devolver un error específico para "conector no encontrado"
      return new NextResponse(
        JSON.stringify({
          error: "connector_not_found",
          message: `No connector found. The host is unreachable.`,
        }),
        {
          status: 503, // Service Unavailable
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": "connector_not_found",
          },
        },
      )
    }

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API", details: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")

  // Obtener la dirección del conector desde los headers
  const connectorAddress = req.headers.get("X-Connector-Address") || ""

  // Obtener la clave de API específica para este conector
  const apiKey = getApiKeyForConnector(connectorAddress)

  // Construir la URL completa
  const targetUrl = `${connectorAddress}/${path}`

  console.log(`Proxying ${req.method} request to: ${targetUrl}`)

  // Clonar los headers y modificarlos
  const headers = new Headers(req.headers)

  // Establecer la clave de API correcta
  headers.set("X-API-Key", apiKey)

  // Resto del código igual...
}
