"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RefreshCw, Network } from "lucide-react"

interface FlowerClientLogsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
}

export function FlowerClientLogsDialog({ open, onOpenChange, assetId }: FlowerClientLogsDialogProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [clientStatus, setClientStatus] = useState<"connected" | "training" | "idle">("idle")
  const logsRef = useRef<HTMLDivElement>(null)

  // Fetch logs when dialog opens
  useEffect(() => {
    if (open) {
      fetchLogs()
    }
  }, [open, assetId])

  // Auto-scroll when logs update
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  // Simulate log fetching
  const fetchLogs = async () => {
    setIsLoading(true)
    setLogs([])

    try {
      // This is a simulation - in a real app, you would fetch logs from your API
      const simulatedLogs = [
        `[${new Date().toISOString()}] Starting Flower client for asset ${assetId}...`,
        `[${new Date().toISOString()}] Loading model weights...`,
        `[${new Date().toISOString()}] Connecting to server...`,
        `[${new Date().toISOString()}] Client connected to server at 0.0.0.0:8080`,
        `[${new Date().toISOString()}] Received model parameters from server`,
        `[${new Date().toISOString()}] Waiting for training instructions...`,
      ]

      // Simulate async loading
      for (let i = 0; i < simulatedLogs.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        setLogs((prev) => [...prev, simulatedLogs[i]])
      }

      // Set client status to connected after logs are loaded
      setClientStatus("connected")
    } catch (error) {
      console.error("Error fetching logs:", error)
      setLogs((prev) => [...prev, `Error fetching logs: ${error}`])
    } finally {
      setIsLoading(false)
    }
  }

  // Simulate starting training
  const simulateTraining = async () => {
    setClientStatus("training")

    const trainingLogs = [
      `[${new Date().toISOString()}] Received training instruction from server`,
      `[${new Date().toISOString()}] Starting local training...`,
      `[${new Date().toISOString()}] Epoch 1/5, Loss: 0.3245, Accuracy: 0.8765`,
      `[${new Date().toISOString()}] Epoch 2/5, Loss: 0.2876, Accuracy: 0.9012`,
      `[${new Date().toISOString()}] Epoch 3/5, Loss: 0.2543, Accuracy: 0.9134`,
      `[${new Date().toISOString()}] Epoch 4/5, Loss: 0.2321, Accuracy: 0.9256`,
      `[${new Date().toISOString()}] Epoch 5/5, Loss: 0.2187, Accuracy: 0.9312`,
      `[${new Date().toISOString()}] Local training completed`,
      `[${new Date().toISOString()}] Sending model updates to server...`,
      `[${new Date().toISOString()}] Server acknowledged receipt of model updates`,
      `[${new Date().toISOString()}] Waiting for next round...`,
    ]

    for (let i = 0; i < trainingLogs.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setLogs((prev) => [...prev, trainingLogs[i]])
    }

    setClientStatus("connected")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-teal-700 flex items-center">
            <Network className="h-5 w-5 mr-2 text-teal-600" />
            Flower Client Logs - Asset {assetId}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4 bg-teal-50 p-2 rounded-md">
          <div className="flex items-center">
            <div
              className={`h-3 w-3 rounded-full mr-2 ${
                clientStatus === "connected"
                  ? "bg-green-500"
                  : clientStatus === "training"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-medium">
              Status:{" "}
              {clientStatus === "connected"
                ? "Connected to server"
                : clientStatus === "training"
                  ? "Training in progress"
                  : "Initializing"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {clientStatus === "connected" && (
              <Button
                variant="outline"
                size="sm"
                onClick={simulateTraining}
                className="text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                Simulate Training
              </Button>
            )}
          </div>
        </div>

        <div
          ref={logsRef}
          className="bg-black text-green-400 font-mono text-sm p-4 rounded-md overflow-y-auto mt-2 h-80"
        >
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          ) : (
            <div className="text-gray-500">{isLoading ? "Fetching logs..." : "No logs available"}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
