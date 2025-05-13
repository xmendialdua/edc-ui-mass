"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function FlowerServerLogsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Simular la conexión y carga de logs
  useEffect(() => {
    if (open) {
      setIsLoading(true)

      // Simular tiempo de conexión
      const timer = setTimeout(() => {
        setIsConnected(true)
        setIsLoading(false)

        // Generar logs de ejemplo
        setLogs([
          "[2023-07-15 10:15:32] INFO: Flower server started",
          "[2023-07-15 10:15:35] INFO: Waiting for clients to connect",
          "[2023-07-15 10:16:02] INFO: Client 1 connected from 192.168.1.105",
          "[2023-07-15 10:16:15] INFO: Client 2 connected from 192.168.1.107",
          "[2023-07-15 10:16:30] INFO: Starting round 1",
          "[2023-07-15 10:17:45] INFO: Round 1 completed, global accuracy: 0.78",
          "[2023-07-15 10:17:50] INFO: Starting round 2",
          "[2023-07-15 10:19:05] INFO: Round 2 completed, global accuracy: 0.82",
          "[2023-07-15 10:19:10] INFO: Starting round 3",
          "[2023-07-15 10:20:25] INFO: Round 3 completed, global accuracy: 0.85",
        ])
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-indigo-600 flex items-center">Flower Server Logs</DialogTitle>
          <DialogDescription>View training logs from the Flower federated learning server</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
                <p className="text-gray-500">Connecting to Flower server...</p>
              </div>
            </div>
          ) : (
            <div className="bg-black rounded-md p-4 h-full overflow-auto">
              <pre className="text-green-400 font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
            Close
          </Button>
          {isConnected && <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">Download Logs</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
