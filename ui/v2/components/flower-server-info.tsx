"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, ArrowLeft, ArrowRight, Check } from "lucide-react"
import Image from "next/image"

// Create array of step information for the guide
// This is the array you should modify to change the guide content
const guideSteps = [
  {
    title: "Use Case Explanation",
    description:
      "The Flower Server enables federated learning across multiple devices without sharing raw data. This first image shows the overall architecture of the system.",
    image: "/guide/images/image1.png",
  },
  {
    title: "Use Case Explanation",
    description:
      "Clients connect to the Flower Server and contribute to the training process while keeping their data private. This approach is ideal for sensitive data scenarios.",
    image: "/guide/images/image2.png",
  },
  {
    title: "Use Case Explanation",
    description:
      "The aggregation process combines model updates from multiple clients without exposing individual datasets, preserving privacy while improving the global model.",
    image: "/guide/images/image3.png",
  },
  {
    title: "Use Case Explanation",
    description:
      "Secure communication channels ensure that model updates are transmitted safely between clients and the server.",
    image: "/guide/images/image4.png",
  },
  {
    title: "Use Case Explanation",
    description:
      "The Flower Server dashboard allows you to monitor training progress and client connections in real-time.",
    image: "/guide/images/image5.png",
  },
  {
    title: "Use Case Explanation",
    description:
      "Performance metrics help you evaluate the effectiveness of your federated learning model across different clients.",
    image: "/guide/images/image6.png",
  },
  {
    title: "Use Case Explanation",
    description:
      "The final trained model incorporates knowledge from all participating clients while maintaining data privacy throughout the process.",
    image: "/guide/images/image7.png",
  },
]

export function FlowerServerInfoIcon({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`text-lime-600 hover:text-lime-700 hover:bg-lime-50 ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <Info className="h-5 w-5" />
      </Button>
      <FlowerServerGuide open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}

interface FlowerServerGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FlowerServerGuide({ open, onOpenChange }: FlowerServerGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(guideSteps.length - 1, prev + 1))
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset to first step when closing
    setTimeout(() => setCurrentStep(0), 300)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handlePrevious()
    } else if (e.key === "ArrowRight") {
      handleNext()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden" onKeyDown={handleKeyDown} tabIndex={0}>
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg text-lime-700">{guideSteps[currentStep].title}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div className="w-full h-[300px] relative bg-gray-100">
            <Image
              src={guideSteps[currentStep].image || "/placeholder.svg"}
              alt={`Guide step ${currentStep + 1}`}
              fill
              style={{ objectFit: "contain" }}
            />
          </div>

          <div className="p-6">
            <p className="text-gray-700 mb-6">{guideSteps[currentStep].description}</p>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="border-lime-200 text-lime-700 hover:bg-lime-50"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <div className="flex space-x-1">
                {guideSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full ${index === currentStep ? "bg-lime-500" : "bg-gray-200"}`}
                  />
                ))}
              </div>

              {currentStep < guideSteps.length - 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  className="border-lime-200 text-lime-700 hover:bg-lime-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="border-lime-300 bg-lime-50 text-lime-700 hover:bg-lime-100"
                >
                  Got It
                  <Check className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

