import { type NextRequest, NextResponse } from "next/server"

// Data App API base URL
const DATA_APP_BASE_URL = "http://172.19.0.2:30381"

// Modificar la función GET para mantener consistencia
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Await the params object before accessing its properties
    const pathParams = await Promise.resolve(params.path)
    const path = pathParams.join("/")

    console.log(`Proxying GET request to Data App: ${DATA_APP_BASE_URL}/${path}`)

    // Get the request URL to extract query parameters
    const url = new URL(request.url)
    const searchParams = url.searchParams.toString()

    // Construct the full URL with query parameters
    const fullUrl = `${DATA_APP_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ""}`
    console.log(`Full Data App URL: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        ...Object.fromEntries(request.headers),
      },
    })

    // Log the response status for debugging
    console.log(`Data App response status: ${response.status} ${response.statusText}`)

    // Get the response data
    let responseData: string
    try {
      responseData = await response.text()
      console.log(`Data App response body: ${responseData.substring(0, 200)}${responseData.length > 200 ? "..." : ""}`)
    } catch (error) {
      console.error("Error reading response body:", error)
      responseData = JSON.stringify({ success: response.ok, message: response.statusText })
    }

    // Create a new response with the same status and headers
    const newResponse = new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-length") {
        // Skip content-length as it might be incorrect after modifications
        newResponse.headers.set(key, value)
      }
    })

    return newResponse
  } catch (error: any) {
    console.error("Data App API proxy error:", error)
    return new NextResponse(
      JSON.stringify({
        error: "Failed to fetch from Data App API",
        message: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    )
  }
}

// Modificar la función POST para manejar mejor las respuestas vacías
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Await the params object before accessing its properties
    const pathParams = await Promise.resolve(params.path)
    const path = pathParams.join("/")

    console.log(`Proxying POST request to Data App: ${DATA_APP_BASE_URL}/${path}`)

    // Get the request URL to extract query parameters
    const url = new URL(request.url)
    const searchParams = url.searchParams.toString()

    // Check if the request is multipart/form-data
    const contentType = request.headers.get("content-type") || ""
    const isFormData = contentType.includes("multipart/form-data")

    let requestBody: any

    if (isFormData) {
      // Handle form data (file uploads)
      requestBody = await request.formData()
      console.log("Forwarding form data to Data App")
    } else {
      // Handle JSON or other content types
      requestBody = await request.text()
      console.log("Forwarding data to Data App:", requestBody.substring(0, 100) + "...")
    }

    // Construct the full URL with query parameters
    const fullUrl = `${DATA_APP_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ""}`
    console.log(`Full Data App URL: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => key !== "content-length" && (isFormData ? key !== "content-type" : true),
          ),
        ),
      },
      body: requestBody,
    })

    // Log the response status for debugging
    console.log(`Data App response status: ${response.status} ${response.statusText}`)

    // Get the response data
    let responseData = ""
    try {
      responseData = await response.text()
      console.log(`Data App response body: ${responseData || "null"}`)
    } catch (error) {
      console.error("Error reading response body:", error)
      // Si no podemos leer el cuerpo pero la respuesta es exitosa, devolvemos un objeto de éxito
      if (response.ok) {
        responseData = JSON.stringify({ success: true, message: "Operation completed successfully" })
      } else {
        responseData = JSON.stringify({ success: false, message: response.statusText })
      }
    }

    // Si la respuesta está vacía pero es exitosa, devolvemos un objeto de éxito
    if ((!responseData || responseData.trim() === "") && response.ok) {
      responseData = JSON.stringify({ success: true, message: "Operation completed successfully" })
      console.log("Empty successful response, using default success message")
    }

    // Create a new response with the same status and headers
    const newResponse = new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-length") {
        // Skip content-length as it might be incorrect after modifications
        newResponse.headers.set(key, value)
      }
    })

    return newResponse
  } catch (error: any) {
    console.error("Data App API proxy error:", error)
    return new NextResponse(
      JSON.stringify({
        error: "Failed to send data to Data App API",
        message: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    )
  }
}
