"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, ArrowLeft, ArrowRight, Check } from "lucide-react"
import Image from "next/image"

// Create array of step information for the guide
const guideSteps = [
  {
    title: "Explicación del Caso de Uso",
    description: (
      <>
        <p>
        Este entorno proporciona una interfaz de usuario diseñada para facilitar el uso de un espacio de datos orientado al Federated Learning. 
        Para ello, se ha diseñado un escenario en el que se combinan conectores EDC, modelos federados y restricciones de acceso mediante políticas.
        </p>
      </>
    ),
    image: "/guide/images/image1.png",
  },
  {
    title: "Arquitectura del Sistema",
    description: (
      <>
        <p>En la imagen se muestra un esquema general del entorno. En el lado izquierdo, encontramos un Proveedor, 
          encargado de gestionar un Servidor Agregador para los modelos federados y de almacenar los modelos generados. 
          Este proveedor utiliza un conector EDC para exponer, a través de una API personalizada, dos tipos de Assets:</p>
        <ul className="list-disc pl-5">
          <li>Un asset para aquellos interesados en participar en el entrenamiento federado.</li>
          <li>Un asset destinado a exponer los modelos entrenados y almacenados en un Servidor MLflow.</li>
        </ul>
      </>
    ),
    image: "/guide/images/image2.png",
  },
  {
    title: "Consumidores del Espacio de Datos",
    description: (
      <>
        <p>En el lado derecho, se encuentran los consumidores, quienes, a través de sus propios conectores EDC, pueden consumir los assets que más les interesen. Pueden elegir entre:</p>
        <ul className="list-disc pl-5">
          <li>Assets de modelos ya entrenados</li>
          <li>Assets que permiten participar en el entrenamiento federado</li>
        </ul>
      </>
    ),
    image: "/guide/images/image3.png",
  },
  {
    title: "Objetivo del Caso de Uso",
    description: (
      <>
        <p>
          El objetivo principal es permitir que nuevos clientes aporten sus datos y participen en el entrenamiento federado de los modelos disponibles en el espacio de datos, logrando así mejorar los resultados mediante Federated Learning.
        </p>
      </>
    ),
    image: "/guide/images/image4.png",
  },
  {
    title: "Proceso de Conexión Cliente-Servidor",
    description: (
      <>
        <p>
          Para facilitar este proceso, el proveedor expone un JSON en el espacio de datos que contiene la configuración privada y necesaria para que un consumidor pueda conectarse con el Servidor Agregador. El consumidor, mediante la API desplegada junto a su conector, puede consumir este asset y, de manera automática, se desplegará un Flower Client listo para comunicarse con el Flower Server y entrenar los modelos con los datos del consumidor.
        </p>
      </>
    ),
    image: "/guide/images/image5.png",
  },
  {
    title: "Control de Acceso y Uso mediante Políticas",
    description: (
      <>
        <p>
          El acceso y consumo de los assets puede estar sujeto a restricciones definidas mediante políticas y contratos. Este desarrollo ofrece 5 tipos de políticas predefinidas:
        </p>
        <ul className="list-disc pl-5">
          <li>Membership</li>
          <li>DataProcessor</li>
          <li>Temporal</li>
          <li>Por región</li>
          <li>Vacía</li>
        </ul>
        <p>
          Además, dependiendo de las capacidades de los conectores EDC, es posible definir cualquier otro tipo de política personalizada.
        </p>
      </>
    ),
    image: "/guide/images/image6.png",
  },
  {
    title: "Federated Learning en los Espacios de Datos",
    description: (
      <>
        <p>
          Este desarrollo presenta una DEMO que muestra cómo se pueden implementar técnicas de Federated Learning dentro de un Espacio de Datos. Se logra fusionar la eficiencia de estos modelos con los valores de seguridad, soberanía y fiabilidad que aportan los Espacios de Datos.
        </p>
      </>
    ),
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
