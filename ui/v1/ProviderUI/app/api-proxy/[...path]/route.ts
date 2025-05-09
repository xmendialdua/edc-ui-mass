import { type NextRequest, NextResponse } from "next/server"
import { getConnectorAddress, debugApiCall } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  // Get the connector address dynamically for each request
  const API_BASE_URL = getConnectorAddress()
  console.log(`Proxying GET request to: ${API_BASE_URL}/${path}`)

  // Debug the proxy call - NEW
  debugApiCall("PROXY_GET", {
    path: path,
    connectorAddress: API_BASE_URL,
    fullUrl: `${API_BASE_URL}/${path}`,
  })

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

    // Debug the proxy response - NEW
    debugApiCall(
      "PROXY_GET",
      { path, connectorAddress: API_BASE_URL },
      {
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 300) + (data.length > 300 ? "..." : ""),
      },
    )

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
  } catch (error) {
    console.error("API proxy error:", error)

    // Debug the proxy error - NEW
    debugApiCall("PROXY_GET", { path, connectorAddress: API_BASE_URL }, { error: true, message: String(error) })

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  // Get the connector address dynamically for each request
  const API_BASE_URL = getConnectorAddress()
  console.log(`Proxying POST request to: ${API_BASE_URL}/${path}`)

  // Get the request body for debugging - NEW
  let requestBody = ""
  try {
    requestBody = await request.clone().text()
  } catch (e) {
    requestBody = "Could not extract request body"
  }

  // Debug the proxy call - NEW
  debugApiCall("PROXY_POST", {
    path: path,
    connectorAddress: API_BASE_URL,
    fullUrl: `${API_BASE_URL}/${path}`,
    body: requestBody.substring(0, 300) + (requestBody.length > 300 ? "..." : ""),
  })

  try {
    // Get the request body
    const body = await request.text()

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
    const data = await response.text()

    // Debug the proxy response - NEW
    debugApiCall(
      "PROXY_POST",
      { path, connectorAddress: API_BASE_URL },
      {
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 300) + (data.length > 300 ? "..." : ""),
      },
    )

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
  } catch (error) {
    console.error("API proxy error:", error)

    // Debug the proxy error - NEW
    debugApiCall("PROXY_POST", { path, connectorAddress: API_BASE_URL }, { error: true, message: String(error) })

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

// Add other HTTP methods as needed (PUT, DELETE, etc.)
export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  // Get the connector address dynamically for each request
  const API_BASE_URL = getConnectorAddress()
  console.log(`Proxying PUT request to: ${API_BASE_URL}/${path}`)

  // Get the request body for debugging - NEW
  let requestBody = ""
  try {
    requestBody = await request.clone().text()
  } catch (e) {
    requestBody = "Could not extract request body"
  }

  // Debug the proxy call - NEW
  debugApiCall("PROXY_PUT", {
    path: path,
    connectorAddress: API_BASE_URL,
    fullUrl: `${API_BASE_URL}/${path}`,
    body: requestBody.substring(0, 300) + (requestBody.length > 300 ? "..." : ""),
  })

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

    // Debug the proxy response - NEW
    debugApiCall(
      "PROXY_PUT",
      { path, connectorAddress: API_BASE_URL },
      {
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 300) + (data.length > 300 ? "..." : ""),
      },
    )

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
  } catch (error) {
    console.error("API proxy error:", error)

    // Debug the proxy error - NEW
    debugApiCall("PROXY_PUT", { path, connectorAddress: API_BASE_URL }, { error: true, message: String(error) })

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  // Get the connector address dynamically for each request
  const API_BASE_URL = getConnectorAddress()
  console.log(`Proxying DELETE request to: ${API_BASE_URL}/${path}`)

  // Debug the proxy call - NEW
  debugApiCall("PROXY_DELETE", {
    path: path,
    connectorAddress: API_BASE_URL,
    fullUrl: `${API_BASE_URL}/${path}`,
  })

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

    // Debug the proxy response - NEW
    debugApiCall(
      "PROXY_DELETE",
      { path, connectorAddress: API_BASE_URL },
      {
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 300) + (data.length > 300 ? "..." : ""),
      },
    )

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
  } catch (error) {
    console.error("API proxy error:", error)

    // Debug the proxy error - NEW
    debugApiCall("PROXY_DELETE", { path, connectorAddress: API_BASE_URL }, { error: true, message: String(error) })

    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

