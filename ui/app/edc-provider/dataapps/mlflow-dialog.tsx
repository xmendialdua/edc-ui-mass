"use client"

import { useState, useEffect } from "react"
import { Loader2, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function MLflowDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [experiments, setExperiments] = useState<any[]>([])

  // Simular la carga de datos de MLflow
  useEffect(() => {
    if (open) {
      setIsLoading(true)

      // Simular tiempo de conexión
      const timer = setTimeout(() => {
        setIsLoading(false)

        // Datos de ejemplo de experimentos
        setExperiments([
          {
            id: "1",
            name: "Federated CNN Model",
            status: "FINISHED",
            startTime: "2023-07-15 09:30:22",
            endTime: "2023-07-15 10:45:15",
            metrics: {
              accuracy: 0.85,
              loss: 0.32,
              f1Score: 0.83,
            },
          },
          {
            id: "2",
            name: "Federated LSTM Model",
            status: "RUNNING",
            startTime: "2023-07-15 11:15:40",
            endTime: null,
            metrics: {
              accuracy: 0.79,
              loss: 0.41,
              f1Score: 0.77,
            },
          },
          {
            id: "3",
            name: "Centralized Baseline",
            status: "FINISHED",
            startTime: "2023-07-14 14:22:10",
            endTime: "2023-07-14 15:30:45",
            metrics: {
              accuracy: 0.81,
              loss: 0.38,
              f1Score: 0.8,
            },
          },
        ])
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-emerald-600 flex items-center">MLflow Experiments</DialogTitle>
          <DialogDescription>View and manage machine learning experiments and models</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
                <p className="text-gray-500">Connecting to MLflow server...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Métricas generales */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-emerald-700 mb-2">Overall Metrics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Best Accuracy</p>
                      <p className="text-xl font-bold text-emerald-700">85%</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Active Runs</p>
                      <p className="text-xl font-bold text-emerald-700">1</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Total Experiments</p>
                      <p className="text-xl font-bold text-emerald-700">3</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Registered Models</p>
                      <p className="text-xl font-bold text-emerald-700">2</p>
                    </div>
                  </div>
                </div>

                {/* Gráfico simulado */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="text-lg font-medium text-emerald-700 mb-2">Performance Comparison</h3>
                  <div className="w-full h-40 bg-gray-100 rounded-md flex items-center justify-center">
                    <BarChart2 className="h-16 w-16 text-emerald-300" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Accuracy comparison across experiments</p>
                </div>
              </div>

              {/* Lista de experimentos */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <h3 className="text-lg font-medium text-emerald-700 p-4 border-b border-gray-200">Experiments</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Accuracy
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loss
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {experiments.map((exp) => (
                        <tr key={exp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{exp.name}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                exp.status === "RUNNING" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                              }`}
                            >
                              {exp.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{exp.startTime}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(exp.metrics.accuracy * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {exp.metrics.loss.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
            Close
          </Button>
          {!isLoading && <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">View Details</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
