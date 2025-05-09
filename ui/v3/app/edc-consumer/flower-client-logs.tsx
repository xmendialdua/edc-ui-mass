"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Play, Square, RefreshCw, Info } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function FlowerClientLogs() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Default translations
  const translations = {
    flowerClient: "Flower Client",
    infoTitle: "About Flower Client",
    infoContent:
      "The Flower Client participates in federated learning by training models on local data and sending model updates to the server without sharing the raw data.",
    logs: "Logs",
    noLogs: "No logs available",
  }

  // Simulate log fetching
  const fetchLogs = async () => {
    if (!clientId.trim()) return

    setIsLoading(true)
    setLogs([])

    try {
      // This is a simulation - in a real app, you would fetch logs from your K8s API
      const simulatedLogs = [
        `[${new Date().toISOString()}] Starting Flower client...`,
        `[${new Date().toISOString()}] Loading model weights...`,
        `[${new Date().toISOString()}] Connecting to server...`,
        `[${new Date().toISOString()}] Client ${clientId} is running`,
        `[${new Date().toISOString()}] Connected to server at 0.0.0.0:8080`,
      ]

      // Simulate async loading
      for (let i = 0; i < simulatedLogs.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        setLogs((prev) => [...prev, simulatedLogs[i]])
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      setLogs((prev) => [...prev, `Error fetching logs: ${error}`])
    } finally {
      setIsLoading(false)
    }
  }

  // Simulate log streaming
  const startStreaming = () => {
    if (!clientId.trim() || isStreaming) return

    setIsStreaming(true)

    // Initial fetch
    fetchLogs()

    // Simulate streaming with periodic updates
    const interval = setInterval(() => {
      const newLog = `[${new Date().toISOString()}] Training round completed. Loss: ${(Math.random() * 0.5).toFixed(4)}`
      setLogs((prev) => [...prev, newLog])

      // Auto-scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
    }, 3000)

    // Cleanup
    return () => {
      clearInterval(interval)
      setIsStreaming(false)
    }
  }

  // Stop streaming
  const stopStreaming = () => {
    setIsStreaming(false)
  }

  // Auto-scroll when logs update
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black text-white border-t-2 border-lime-500">
      <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800 p-1"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
          <h3 className="text-sm font-medium ml-2">{translations.flowerClient}</h3>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-gray-800 p-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsInfoOpen(true)
                    }}
                  >
                    <Info className="h-4 w-4 text-lime-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{translations.infoTitle}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p>{translations.infoContent}</p>
                    <div className="bg-gray-100 p-3 rounded text-sm text-gray-800">
                      <pre className="whitespace-pre-wrap">
                        <code>
                          {`# Example Flower client code
import flwr as fl
import tensorflow as tf

# Load and prepare dataset
(x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()

# Define model
model = tf.keras.Sequential([
  tf.keras.layers.Flatten(input_shape=(28, 28)),
  tf.keras.layers.Dense(128, activation="relu"),
  tf.keras.layers.Dense(10, activation="softmax")
])
model.compile(optimizer="adam", loss="sparse_categorical_crossentropy")

# Define Flower client
class MnistClient(fl.client.NumPyClient):
  def get_parameters(self, config):
    return model.get_weights()
  
  def fit(self, parameters, config):
    model.set_weights(parameters)
    model.fit(x_train, y_train, epochs=1)
    return model.get_weights(), len(x_train), {}
  
  def evaluate(self, parameters, config):
    model.set_weights(parameters)
    loss, accuracy = model.evaluate(x_test, y_test)
    return loss, len(x_test), {"accuracy": accuracy}

# Start Flower client
fl.client.start_numpy_client(server_address="127.0.0.1:8080", client=MnistClient())`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TooltipTrigger>
            <TooltipContent>
              <p>Learn about Flower Client</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isExpanded && (
        <div className="p-4 bg-gray-900 max-h-64 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter client ID"
              className="bg-gray-800 border-gray-700 text-white w-64 h-8 text-sm"
            />
            {isStreaming ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 bg-gray-800 border-gray-700 hover:bg-gray-700"
                onClick={() => stopStreaming()}
              >
                <Square className="h-4 w-4 text-red-400 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 bg-gray-800 border-gray-700 hover:bg-gray-700"
                onClick={() => startStreaming()}
                disabled={!clientId.trim() || isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 text-lime-400 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 text-lime-400 mr-1" />
                )}
                {isLoading ? "Loading..." : "Stream Logs"}
              </Button>
            )}
          </div>

          <h4 className="text-xs uppercase text-gray-400 mb-2">{translations.logs}</h4>
          <div ref={terminalRef} className="bg-black text-green-400 font-mono text-sm h-40 overflow-y-auto p-2">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">
                {isLoading
                  ? "Fetching logs..."
                  : clientId
                    ? "Click 'Stream Logs' to start viewing logs"
                    : "Enter a client ID to view logs"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
