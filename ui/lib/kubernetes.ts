// lib/kubernetes.ts

/**
 * Funciones para interactuar con la API de Kubernetes
 */

import { appConfig } from "@/edc-config"

// Función para verificar si Kubernetes está habilitado
export const isKubernetesEnabled = (): boolean => {
  // Primero verificar si hay una preferencia guardada en localStorage
  if (typeof window !== "undefined") {
    const savedPreference = localStorage.getItem("kubernetesEnabled")
    if (savedPreference !== null) {
      return savedPreference === "true"
    }
  }

  // Si no hay preferencia guardada, usar el valor predeterminado de la configuración
  return appConfig.kubernetesEnabled
}

// Función para activar/desactivar Kubernetes
export const setKubernetesEnabled = (enabled: boolean): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("kubernetesEnabled", enabled.toString())
  }
}

// Verificar si estamos ejecutando en Kubernetes
export const isRunningInKubernetes = (): boolean => {
  return isKubernetesEnabled()
}

// Obtener la lista de pods en un namespace
export async function getPods(namespace = "default"): Promise<any[]> {
  if (!isRunningInKubernetes()) {
    console.warn("Not running in Kubernetes, returning mock data")
    return getMockPods()
  }

  try {
    const response = await fetch(`/api/kubernetes/pods?namespace=${namespace}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch pods: ${response.status} ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching pods:", error)
    throw error
  }
}

// Obtener los logs de un pod
export async function getPodLogs(podName: string, namespace = "default", container?: string): Promise<string> {
  if (!isRunningInKubernetes()) {
    console.warn("Not running in Kubernetes, returning mock logs")
    return getMockPodLogs(podName)
  }

  try {
    const url = `/api/kubernetes/pods/${podName}/logs?namespace=${namespace}${container ? `&container=${container}` : ""}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch pod logs: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  } catch (error) {
    console.error("Error fetching pod logs:", error)
    throw error
  }
}

// Datos simulados para desarrollo
function getMockPods(): any[] {
  return [
    {
      metadata: {
        name: "flower-server-1",
        namespace: "default",
        labels: {
          app: "flower-server",
          role: "aggregator",
        },
      },
      status: {
        phase: "Running",
        containerStatuses: [
          {
            name: "flower-server",
            ready: true,
            restartCount: 0,
            state: {
              running: {
                startedAt: new Date().toISOString(),
              },
            },
          },
        ],
      },
    },
    {
      metadata: {
        name: "flower-client-1",
        namespace: "default",
        labels: {
          app: "flower-client",
          role: "client",
        },
      },
      status: {
        phase: "Running",
        containerStatuses: [
          {
            name: "flower-client",
            ready: true,
            restartCount: 0,
            state: {
              running: {
                startedAt: new Date().toISOString(),
              },
            },
          },
        ],
      },
    },
    {
      metadata: {
        name: "mlflow-server-1",
        namespace: "default",
        labels: {
          app: "mlflow",
          role: "server",
        },
      },
      status: {
        phase: "Running",
        containerStatuses: [
          {
            name: "mlflow",
            ready: true,
            restartCount: 0,
            state: {
              running: {
                startedAt: new Date().toISOString(),
              },
            },
          },
        ],
      },
    },
  ]
}

// Logs simulados para desarrollo
function getMockPodLogs(podName: string): string {
  if (podName.includes("flower-server")) {
    return `
[${new Date().toISOString()}] INFO: Starting Flower server
[${new Date().toISOString()}] INFO: Flower server running on 0.0.0.0:8080
[${new Date().toISOString()}] INFO: Waiting for clients to connect
[${new Date().toISOString()}] INFO: Client flower-client-1 connected
[${new Date().toISOString()}] INFO: Starting round 1
[${new Date().toISOString()}] INFO: Received 1 weight updates from clients
[${new Date().toISOString()}] INFO: Aggregating updates
[${new Date().toISOString()}] INFO: Round 1 complete
[${new Date().toISOString()}] INFO: Starting round 2
`
  } else if (podName.includes("flower-client")) {
    return `
[${new Date().toISOString()}] INFO: Starting Flower client
[${new Date().toISOString()}] INFO: Loading model
[${new Date().toISOString()}] INFO: Connecting to server at flower-server:8080
[${new Date().toISOString()}] INFO: Connected to server
[${new Date().toISOString()}] INFO: Received model parameters
[${new Date().toISOString()}] INFO: Training local model
[${new Date().toISOString()}] INFO: Epoch 1/5, Loss: 0.3245, Accuracy: 0.8765
[${new Date().toISOString()}] INFO: Epoch 2/5, Loss: 0.2876, Accuracy: 0.9012
[${new Date().toISOString()}] INFO: Epoch 3/5, Loss: 0.2543, Accuracy: 0.9134
[${new Date().toISOString()}] INFO: Epoch 4/5, Loss: 0.2321, Accuracy: 0.9256
[${new Date().toISOString()}] INFO: Epoch 5/5, Loss: 0.2187, Accuracy: 0.9312
[${new Date().toISOString()}] INFO: Sending model updates to server
`
  } else if (podName.includes("mlflow")) {
    return `
[${new Date().toISOString()}] INFO: Starting MLflow server
[${new Date().toISOString()}] INFO: MLflow server running on 0.0.0.0:5000
[${new Date().toISOString()}] INFO: Artifact store initialized at /mlflow/artifacts
[${new Date().toISOString()}] INFO: Registered model 'cnn-model' version 1
[${new Date().toISOString()}] INFO: Experiment 'federated-learning' created
`
  } else {
    return `No logs available for pod ${podName}`
  }
}
