"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Play, Square, RefreshCw } from "lucide-react"
import { FlowerServerInfoIcon } from "@/components/flower-server-info"
import { debugApiCall } from "@/lib/api"

export function FlowerServerLogs() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [podName, setPodName] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Simulate log fetching
  const fetchLogs = async () => {
    if (!podName.trim()) return

    setIsLoading(true)
    setLogs([])

    // Debug API call for log fetching - NEW
    debugApiCall("FLOWER_SERVER_LOGS", { podName, action: "fetchLogs" })

    try {
      // This is a simulation - in a real app, you would fetch logs from your K8s API
      const simulatedLogs = [
        `[${new Date().toISOString()}] Starting Flower server...`,
        `[${new Date().toISOString()}] Initializing aggregator...`,
        `[${new Date().toISOString()}] Waiting for clients to connect...`,
        `[${new Date().toISOString()}] Pod ${podName} is running`,
        `[${new Date().toISOString()}] Server listening on 0.0.0.0:8080`,
      ]

      // Simulate async loading
      for (let i = 0; i < simulatedLogs.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        setLogs((prev) => [...prev, simulatedLogs[i]])
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      setLogs((prev) => [...prev, `Error fetching logs: ${error}`])

      // Debug API call for log error - NEW
      debugApiCall("FLOWER_SERVER_LOGS", { podName, action: "fetchLogs" }, { error })
    } finally {
      setIsLoading(false)
    }
  }

  // Simulate log streaming
  const startStreaming = () => {
    if (!podName.trim() || isStreaming) return

    setIsStreaming(true)

    // Debug API call for streaming start - NEW
    debugApiCall("FLOWER_SERVER_LOGS", { podName, action: "startStreaming" })

    // Initial fetch
    fetchLogs()

    // Simulate streaming with periodic updates
    const interval = setInterval(() => {
      const newLog = `[${new Date().toISOString()}] Client connected from 192.168.1.${Math.floor(Math.random() * 255)}`
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

    // Debug API call for streaming stop - NEW
    debugApiCall("FLOWER_SERVER_LOGS", { podName, action: "stopStreaming" })
  }

  // Auto-scroll when logs update
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white border-t border-gray-700">
      {/* Header bar - Fixed to only make the icon clickable for expansion */}
      <div className="flex items-center justify-between px-4 py-2 relative">
        <div className="flex items-center">
          <h3 className="font-medium text-white">Flower Server (Aggregator)</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Info Icon - NEW */}
          <FlowerServerInfoIcon />

          {isExpanded && (
            <div className="flex items-center gap-2 mr-4">
              <Input
                value={podName}
                onChange={(e) => setPodName(e.target.value)}
                placeholder="Enter Kubernetes pod name"
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
                  disabled={!podName.trim() || isLoading}
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
          )}
          {/* Only the icon toggles expansion */}
          <div className="cursor-pointer p-1 hover:bg-gray-800 rounded-full" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Terminal */}
      {isExpanded && (
        <div ref={terminalRef} className="bg-black text-green-400 font-mono text-sm p-4 h-64 overflow-y-auto">
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
                : podName
                  ? "Click 'Stream Logs' to start viewing logs"
                  : "Enter a pod name to view logs"}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

