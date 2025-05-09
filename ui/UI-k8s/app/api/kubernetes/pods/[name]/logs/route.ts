import { type NextRequest, NextResponse } from "next/server"
import * as k8s from "@kubernetes/client-node"

// Inicializar el cliente de Kubernetes
const kc = new k8s.KubeConfig()
kc.loadFromCluster() // Carga la configuración desde dentro del cluster
const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    // Obtener el nombre del pod de los params
    const podName = params.name

    // Obtener el namespace y el container de los query params
    const { searchParams } = new URL(request.url)
    const namespace = searchParams.get("namespace") || "default"
    const container = searchParams.get("container") || undefined

    // Obtener los logs del pod
    const response = await k8sApi.readNamespacedPodLog(
      podName,
      namespace,
      container,
      false, // follow
      undefined, // limitBytes
      false, // pretty
      undefined, // previous
      undefined, // sinceSeconds
      undefined, // tailLines
      undefined, // timestamps
    )

    return new NextResponse(response.body)
  } catch (error: any) {
    console.error("Error fetching pod logs:", error)
    return NextResponse.json({ error: "Failed to fetch pod logs", message: error.message }, { status: 500 })
  }
}
