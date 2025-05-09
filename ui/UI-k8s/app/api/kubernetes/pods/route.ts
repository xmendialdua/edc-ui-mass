import { type NextRequest, NextResponse } from "next/server"
import * as k8s from "@kubernetes/client-node"

// Inicializar el cliente de Kubernetes
const kc = new k8s.KubeConfig()
kc.loadFromCluster() // Carga la configuración desde dentro del cluster
const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

export async function GET(request: NextRequest) {
  try {
    // Obtener el namespace de los query params
    const { searchParams } = new URL(request.url)
    const namespace = searchParams.get("namespace") || "default"

    // Obtener la lista de pods
    const response = await k8sApi.listNamespacedPod(namespace)

    return NextResponse.json(response.body.items)
  } catch (error: any) {
    console.error("Error fetching pods:", error)
    return NextResponse.json({ error: "Failed to fetch pods", message: error.message }, { status: 500 })
  }
}
