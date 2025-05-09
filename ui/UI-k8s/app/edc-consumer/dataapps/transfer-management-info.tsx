"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

export function TransferManagementInfo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-6 w-6 rounded-full p-0 text-emerald-600 hover:bg-emerald-50"
      >
        <Info className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-emerald-700">About Transfer Management</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm">
              The Transfer Management block shows active transfers that require additional actions or monitoring.
              Different types of assets have different management options:
            </p>

            <div className="space-y-3 text-sm">
              <div className="p-3 border rounded-md">
                <h3 className="font-medium text-emerald-700">FL-Service Transfers</h3>
                <p>
                  Federated Learning service deployments. Use the "Logs" button to view the Flower Client logs for
                  monitoring training progress.
                </p>
              </div>

              <div className="p-3 border rounded-md">
                <h3 className="font-medium text-emerald-700">Model Transfers</h3>
                <p>
                  ML model transfers that are tracked in MLflow. Use the "MLflow" button to open the MLflow interface
                  for the specific model.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-500 italic">
              Note: PUSH and PULL transfers are handled automatically and are not shown in this management block.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
