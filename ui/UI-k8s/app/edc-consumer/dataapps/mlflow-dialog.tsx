"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, BarChart2, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface MLflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  modelId?: string
}

export function MLflowDialog({ open, onOpenChange, assetId, modelId = "default-model" }: MLflowDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [modelData, setModelData] = useState<any>(null)

  useEffect(() => {
    if (open) {
      // Simulate loading time for MLflow interface
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
        // Simulate model data
        setModelData({
          name: modelId,
          version: "1.2.0",
          created: new Date().toLocaleString(),
          framework: "PyTorch 2.0",
          metrics: {
            accuracy: 0.923,
            precision: 0.912,
            recall: 0.895,
            f1Score: 0.903,
          },
          parameters: {
            learningRate: 0.001,
            batchSize: 64,
            epochs: 50,
            optimizer: "Adam",
            lossFunction: "CrossEntropy",
            dropout: 0.2,
          },
        })
      }, 1500)

      return () => {
        clearTimeout(timer)
        setIsLoading(true)
      }
    }
  }, [open, modelId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-indigo-700 flex items-center">
            <BarChart2 className="h-5 w-5 mr-2 text-indigo-600" />
            MLflow - Model {modelId} (Asset {assetId})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow relative" style={{ height: "70vh" }}>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="ml-2 text-indigo-600">Loading MLflow interface...</span>
            </div>
          ) : (
            <div className="h-full overflow-auto p-4">
              {/* Model information panel */}
              <div className="border rounded-md p-4 bg-indigo-50 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-indigo-700">Model Information</h3>
                  <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-100">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in MLflow
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border rounded-md p-3 bg-white">
                    <h4 className="font-medium mb-2 text-indigo-700">Model Details</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Name:</span> {modelData?.name}
                      </p>
                      <p>
                        <span className="font-medium">Version:</span> {modelData?.version}
                      </p>
                      <p>
                        <span className="font-medium">Created:</span> {modelData?.created}
                      </p>
                      <p>
                        <span className="font-medium">Framework:</span> {modelData?.framework}
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-md p-3 bg-white">
                    <h4 className="font-medium mb-2 text-indigo-700">Performance Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Accuracy:</span> {modelData?.metrics.accuracy}
                      </p>
                      <p>
                        <span className="font-medium">Precision:</span> {modelData?.metrics.precision}
                      </p>
                      <p>
                        <span className="font-medium">Recall:</span> {modelData?.metrics.recall}
                      </p>
                      <p>
                        <span className="font-medium">F1 Score:</span> {modelData?.metrics.f1Score}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-3 bg-white mb-6">
                  <h4 className="font-medium mb-2 text-indigo-700">Model Parameters</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <p>
                      <span className="font-medium">Learning Rate:</span> {modelData?.parameters.learningRate}
                    </p>
                    <p>
                      <span className="font-medium">Batch Size:</span> {modelData?.parameters.batchSize}
                    </p>
                    <p>
                      <span className="font-medium">Epochs:</span> {modelData?.parameters.epochs}
                    </p>
                    <p>
                      <span className="font-medium">Optimizer:</span> {modelData?.parameters.optimizer}
                    </p>
                    <p>
                      <span className="font-medium">Loss Function:</span> {modelData?.parameters.lossFunction}
                    </p>
                    <p>
                      <span className="font-medium">Dropout:</span> {modelData?.parameters.dropout}
                    </p>
                  </div>
                </div>

                <div className="border rounded-md p-3 bg-white">
                  <h4 className="font-medium mb-2 text-indigo-700">Training History</h4>
                  <div className="h-40 bg-indigo-100 rounded-md flex items-center justify-center">
                    <div className="text-center">
                      <BarChart2 className="h-10 w-10 mx-auto text-indigo-300 mb-2" />
                      <p className="text-indigo-500 text-sm">Training loss and accuracy charts</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment section */}
              <div className="border rounded-md p-4 bg-white">
                <h3 className="text-lg font-medium text-indigo-700 mb-4">Model Deployment</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-md p-3 bg-indigo-50">
                    <h4 className="font-medium mb-2">Deployment Status</h4>
                    <div className="flex items-center text-sm">
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      <span>Deployed and active</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Last deployed: {new Date().toLocaleString()}</p>
                  </div>

                  <div className="border rounded-md p-3 bg-indigo-50">
                    <h4 className="font-medium mb-2">Inference Endpoint</h4>
                    <div className="text-sm">
                      <p className="font-mono bg-white p-1 rounded border border-indigo-100 text-xs">
                        http://mlflow-server:5000/invocations/{modelId}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Use this endpoint to make predictions with the model</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Manage Deployment</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
