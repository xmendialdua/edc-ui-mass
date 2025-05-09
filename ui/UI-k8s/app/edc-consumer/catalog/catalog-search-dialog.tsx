"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, AlertCircle, Server } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getConnectorsByType } from "@/edc-config"

interface CatalogSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearch: (counterPartyId: string, counterPartyAddress: string) => void
  defaultCounterPartyId?: string
  defaultCounterPartyAddress?: string
}

export function CatalogSearchDialog({
  open,
  onOpenChange,
  onSearch,
  defaultCounterPartyId = "did:web:provider-identityhub%3A7083:provider",
  defaultCounterPartyAddress = "http://provider-qna-controlplane:8082/api/dsp",
}: CatalogSearchDialogProps) {
  const [counterPartyId, setCounterPartyId] = useState(defaultCounterPartyId)
  const [counterPartyAddress, setCounterPartyAddress] = useState(defaultCounterPartyAddress)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedConnector, setSelectedConnector] = useState<string>("")

  // Obtener los conectores de tipo provider y ordenarlos por nombre
  const providerConnectors = getConnectorsByType("provider").sort((a, b) => a.name.localeCompare(b.name))

  const handleConnectorSelect = (connectorName: string) => {
    // Actualizar el valor seleccionado
    setSelectedConnector(connectorName)

    // Buscar el conector correspondiente y actualizar los valores
    const connector = providerConnectors.find((c) => c.name === connectorName)
    if (connector) {
      setCounterPartyId(connector.id)
      setCounterPartyAddress(connector.address)
    }
  }

  const handleSubmit = async () => {
    if (!counterPartyId.trim() || !counterPartyAddress.trim()) {
      setError("Both Counter Party ID and Address are required")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      console.log(
        `Submitting catalog search with counterPartyId: ${counterPartyId}, counterPartyAddress: ${counterPartyAddress}`,
      )
      await onSearch(counterPartyId, counterPartyAddress)
      onOpenChange(false)
    } catch (err: any) {
      console.error("Catalog search failed:", err)
      setError(`Search failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isSubmitting && counterPartyId.trim() && counterPartyAddress.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-lime-200" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-lime-700 flex items-center">
            <Search className="h-5 w-5 mr-2 text-lime-600" />
            Search Provider Catalog
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Selector de conectores integrado con el fondo */}
          <div className="space-y-2">
            <Label htmlFor="connectorSelect" className="text-sm font-medium flex items-center">
              <Server className="h-4 w-4 mr-1" /> Provider Connector
            </Label>
            <Select value={selectedConnector} onValueChange={handleConnectorSelect}>
              <SelectTrigger
                id="connectorSelect"
                className="bg-transparent border-gray-300 hover:border-lime-300 focus:border-lime-500 focus-visible:ring-lime-500 focus-visible:ring-opacity-30"
              >
                <SelectValue placeholder="Select a provider connector" />
              </SelectTrigger>
              <SelectContent className="bg-white border-lime-100">
                {providerConnectors.map((connector) => (
                  <SelectItem
                    key={connector.name}
                    value={connector.name}
                    className="hover:bg-lime-50 focus:bg-lime-50 data-[highlighted]:bg-lime-50 data-[highlighted]:text-lime-700"
                  >
                    {connector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="counterPartyId">Counter Party ID</Label>
            <Input
              id="counterPartyId"
              value={counterPartyId}
              onChange={(e) => setCounterPartyId(e.target.value)}
              placeholder="Enter counter party ID"
              className="focus-visible:ring-lime-500 focus-visible:border-lime-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="counterPartyAddress">Counter Party Address</Label>
            <Input
              id="counterPartyAddress"
              value={counterPartyAddress}
              onChange={(e) => setCounterPartyAddress(e.target.value)}
              placeholder="Enter counter party address"
              className="focus-visible:ring-lime-500 focus-visible:border-lime-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-lime-600 hover:bg-lime-700 text-white"
          >
            {isSubmitting ? "Searching..." : "Search Catalog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
