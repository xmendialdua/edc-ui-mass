"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

interface NegotiationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNegotiate: (policy: any) => Promise<void>
  assetId: string
  assetName: string
  policy: any
  counterPartyId: string
  counterPartyAddress: string
}

export function NegotiationDialog({
  open,
  onOpenChange,
  onNegotiate,
  assetId,
  assetName,
  policy,
  counterPartyId,
  counterPartyAddress,
}: NegotiationDialogProps) {
  const [policyJson, setPolicyJson] = useState("")
  const [allowModify, setAllowModify] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [originalPolicy, setOriginalPolicy] = useState<any>(null)

  // Inicializar el contenido de la política cuando cambia el asset seleccionado
  useEffect(() => {
    if (policy) {
      setOriginalPolicy(policy)
      setPolicyJson(getPolicyContent(policy))
    }
  }, [policy])

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setAllowModify(false)
      setError(null)
      if (originalPolicy) {
        setPolicyJson(getPolicyContent(originalPolicy))
      }
    }
    onOpenChange(newOpen)
  }

  // Modificar la función handleSubmit para construir el payload de negociación con el ID correcto
  const handleSubmit = async () => {
    try {
      setError(null)
      setIsSubmitting(true)

      // Parse the policy JSON
      let policyContent
      try {
        policyContent = JSON.parse(policyJson)
      } catch (err) {
        setError("Invalid JSON format in policy content")
        setIsSubmitting(false)
        return
      }

      // Construir el payload de negociación preservando la estructura original pero con el ID correcto
      const negotiationPolicy = {
        ...policyContent,
        "@id": originalPolicy["@id"], // Mantener el ID original
        "@type": originalPolicy["@type"] || "Offer", // Mantener el tipo original o usar "Offer" por defecto
        target: assetId,
        assigner: counterPartyId,
      }

      console.log(`Submitting negotiation for asset: ${assetId}`)
      console.log(`Counter party ID: ${counterPartyId}`)
      console.log(`Counter party address: ${counterPartyAddress}`)
      console.log("Original policy:", originalPolicy)
      console.log("Negotiation policy:", negotiationPolicy)

      await onNegotiate(negotiationPolicy)
      handleOpenChange(false)
    } catch (err: any) {
      console.error("Negotiation failed:", err)
      setError(`Negotiation failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Añadir un manejador de eventos de teclado para el diálogo
  // Añadir esta función después de la declaración de handleSubmit

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Función para extraer el contenido de la política sin los campos @id y @type
  function getPolicyContent(policy: any): string {
    if (!policy) return "{}"

    // Crear una copia de la política
    const policyClone = { ...policy }

    // Eliminar los campos que no queremos mostrar
    delete policyClone["@id"]
    delete policyClone["@type"]
    delete policyClone.target
    delete policyClone.assigner

    // Devolver el resto de la política como JSON
    return JSON.stringify(policyClone, null, 2)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Modificar el DialogContent para añadir el manejador de eventos onKeyDown */}
      <DialogContent className="sm:max-w-[700px] border-lime-200" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-lime-700">Negotiate Asset: {assetName || assetId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">This is the policy assigned to the asset you want to negotiate.</p>

            <div className="flex items-center space-x-2 my-4">
              <Checkbox
                id="allow-modify"
                checked={allowModify}
                onCheckedChange={(checked) => setAllowModify(checked === true)}
              />
              <Label htmlFor="allow-modify" className="text-sm font-medium">
                I would like to modify the policy terms
              </Label>
            </div>

            <div className="w-full max-w-full">
              <Textarea
                value={policyJson}
                onChange={(e) => setPolicyJson(e.target.value)}
                disabled={!allowModify}
                className="font-mono text-sm h-80 focus-visible:ring-lime-500 w-full resize-none"
                style={{
                  overflowX: "auto",
                  whiteSpace: "pre",
                  wordWrap: "normal",
                }}
              />
            </div>

            <div className="text-xs text-gray-500 mt-2 break-words">
              <p className="break-all">Asset ID: {assetId}</p>
              <p className="break-all">Policy ID: {originalPolicy?.["@id"] || "N/A"}</p>
              <p className="break-all">Counter Party ID: {counterPartyId}</p>
              <p className="break-all">Counter Party Address: {counterPartyAddress}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-lime-600 hover:bg-lime-700 text-white"
          >
            {isSubmitting ? "Negotiating..." : "I agree with the policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
