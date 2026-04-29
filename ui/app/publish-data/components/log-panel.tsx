"use client"

import { useEffect, useRef } from "react"
import type { LogEntry } from "@/lib/publish-flow"

type LogPanelProps = {
  logs: LogEntry[]
  maxHeight?: string
}

export function LogPanel({ logs, maxHeight = "300px" }: LogPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final cuando se añaden nuevos logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-green-500"
      case "error":
        return "text-red-500"
      case "warning":
        return "text-yellow-500"
      case "info":
      default:
        return "text-green-400"
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="w-full bg-black border border-green-700 rounded-lg p-4 font-mono text-sm" style={{ maxHeight }}>
      <div className="space-y-1 overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 2rem)` }}>
        {logs.length === 0 ? (
          <div className="text-green-500 opacity-70">Esperando operaciones...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`flex gap-2 ${getLogColor(log.type)}`}>
              <span className="opacity-70 text-xs">[{formatTimestamp(log.timestamp)}]</span>
              <span className="flex-1">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
