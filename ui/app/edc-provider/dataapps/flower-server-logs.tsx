"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type FlowerServerLogsProps = {
  language?: "en" | "es"
  t?: (key: string) => string
}

export function FlowerServerLogs({ language = "en", t }: FlowerServerLogsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  // Default translations if not provided through props
  const translations = {
    en: {
      flowerServer: "Flower Server (Aggregator)",
      infoTitle: "About Flower Server",
      infoContent:
        "The Flower Server acts as an aggregator for federated learning. It coordinates the training process across multiple devices or servers without sharing the raw data.",
      logs: "Logs",
      noLogs: "No logs available",
    },
    es: {
      flowerServer: "Servidor Flower (Agregador)",
      infoTitle: "Acerca del Servidor Flower",
      infoContent:
        "El Servidor Flower actúa como un agregador para el aprendizaje federado. Coordina el proceso de entrenamiento entre múltiples dispositivos o servidores sin compartir los datos originales.",
      logs: "Registros",
      noLogs: "No hay registros disponibles",
    },
  }

  // Use provided translation function or fallback to local translations
  const translate = (key: string) => {
    if (t) return t(key)
    return translations[language][key as keyof (typeof translations)["en"]] || key
  }

  // Sample logs for demonstration
  const logs = [
    { timestamp: "2023-06-15 10:15:32", level: "INFO", message: "Flower server started on port 8080" },
    { timestamp: "2023-06-15 10:16:05", level: "INFO", message: "Client connected: client_1" },
    { timestamp: "2023-06-15 10:16:10", level: "INFO", message: "Client connected: client_2" },
    { timestamp: "2023-06-15 10:16:45", level: "INFO", message: "Round 1 started" },
    { timestamp: "2023-06-15 10:17:30", level: "INFO", message: "Received weights from client_1" },
    { timestamp: "2023-06-15 10:17:45", level: "INFO", message: "Received weights from client_2" },
    { timestamp: "2023-06-15 10:18:00", level: "INFO", message: "Aggregating weights" },
    { timestamp: "2023-06-15 10:18:15", level: "INFO", message: "Round 1 completed" },
    { timestamp: "2023-06-15 10:18:30", level: "INFO", message: "Global model updated" },
  ]

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
          <h3 className="text-sm font-medium ml-2">{translate("flowerServer")}</h3>
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
                    <DialogTitle>{translations[language].infoTitle}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p>{translations[language].infoContent}</p>
                    <div className="bg-gray-100 p-3 rounded text-sm text-gray-800">
                      <pre className="whitespace-pre-wrap">
                        <code>
                          # Example Flower server code import flwr as fl # Start Flower server fl.server.start_server(
                          server_address="0.0.0.0:8080", config=fl.server.ServerConfig(num_rounds=3), )
                        </code>
                      </pre>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TooltipTrigger>
            <TooltipContent>
              <p>Learn about Flower Server</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isExpanded && (
        <div className="p-4 bg-gray-900 max-h-64 overflow-y-auto">
          <h4 className="text-xs uppercase text-gray-400 mb-2">{translations[language].logs}</h4>
          {logs.length > 0 ? (
            <div className="space-y-1 text-xs font-mono">
              {logs.map((log, index) => (
                <div key={index} className="flex">
                  <span className="text-gray-500 mr-2">{log.timestamp}</span>
                  <span
                    className={`mr-2 ${
                      log.level === "ERROR"
                        ? "text-red-400"
                        : log.level === "WARNING"
                          ? "text-yellow-400"
                          : "text-lime-400"
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{translations[language].noLogs}</p>
          )}
        </div>
      )}
    </div>
  )
}
