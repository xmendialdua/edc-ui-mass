import { type NextRequest, NextResponse } from "next/server"

// Store the connector address in a module-level variable
let connectorAddress = "http://172.16.56.42/provider-qna/cp/api/management"

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
  return "http://172.16.56.42/provider-qna/cp/api/management"
}

// Aplicar cambios similares a las funciones GET, PUT y DELETE
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  // Await the params object before accessing its properties
  const pathParams = await Promise.resolve(params.path)
  const path = pathParams.join("/")

  // Obtener la dirección del conector desde los encabezados
  const API_BASE_URL = request.headers.get("X-Connector-Address") || connectorAddress
  console.log(`Proxying GET request to: ${API_BASE_URL}/${path}`)

  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "password",
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
          message: `No connector found at ${API_BASE_URL}. The host is unreachable.`,
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

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

// Modificar la función POST para manejar mejor los errores de conexión
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  // Await the params object before accessing its properties
  const pathParams = await Promise.resolve(params.path)
  const path = pathParams.join("/")

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

  try {
    // Get the request body
    const body = await request.text()

    // Log the full URL we're sending the request to
    console.log(`Full request URL: ${API_BASE_URL}/${path}`)

    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "password",
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
          message: `No connector found at ${API_BASE_URL}. The host is unreachable.`,
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

    // For collection endpoints, return empty array instead of error
    if (path.includes("/request")) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  // Await the params object before accessing its properties
  const pathParams = await Promise.resolve(params.path)
  const path = pathParams.join("/")

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

  try {
    // Get the request body
    const body = await request.text()

    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "password",
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
          message: `No connector found at ${API_BASE_URL}. The host is unreachable.`,
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

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  // Await the params object before accessing its properties
  const pathParams = await Promise.resolve(params.path)
  const path = pathParams.join("/")

  // Obtener la dirección del conector desde los encabezados
  const API_BASE_URL = getConnectorAddressFromRequest(request)
  console.log(`Proxying DELETE request to: ${API_BASE_URL}/${path}`)

  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "password",
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
          message: `No connector found at ${API_BASE_URL}. The host is unreachable.`,
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

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

