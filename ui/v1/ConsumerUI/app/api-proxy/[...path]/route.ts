// Fix the API proxy to ensure it correctly forwards requests to the consumer connector
import { type NextRequest, NextResponse } from "next/server"
import { getConnectorAddress } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  const API_BASE_URL = getConnectorAddress()
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
  const API_BASE_URL = getConnectorAddress()
  console.log(`Proxying POST request to: ${API_BASE_URL}/${path}`)

  try {
    // Get the request body
    const body = await request.text()
    console.log(`Request body: ${body}`)

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
    console.log(`Response status: ${response.status}`)
    console.log(`Response data: ${data.substring(0, 200)}...`)

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
    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API", details: error }), {
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
  const API_BASE_URL = getConnectorAddress()
  console.log(`Proxying PUT request to: ${API_BASE_URL}/${path}`)

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
  } catch (error) {
    console.error("API proxy error:", error)
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
  const API_BASE_URL = getConnectorAddress()
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
  } catch (error) {
    console.error("API proxy error:", error)
    return new NextResponse(JSON.stringify({ error: "Failed to fetch from API" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

