"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, AlertCircle, Server } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { connectorCatalog, getConnectorsByType } from "@/edc-config"

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
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null)

  // Obtener los conectores de tipo provider
  const providerConnectors = getConnectorsByType("provider")

  // Efecto para establecer el conector seleccionado inicialmente si coincide con los valores por defecto
  useEffect(() => {
    if (open) {
      // Buscar si hay un conector que coincida con los valores por defecto
      const matchingConnector = providerConnectors.find(
        (c) => c.id === defaultCounterPartyId && c.address === defaultCounterPartyAddress,
      )

      if (matchingConnector) {
        setSelectedConnector(matchingConnector.name)
      } else {
        setSelectedConnector(null)
      }
    }
  }, [open, defaultCounterPartyId, defaultCounterPartyAddress, providerConnectors])

  const handleConnectorSelect = (connectorName: string) => {
    const connector = connectorCatalog.find((c) => c.name === connectorName)
    if (connector) {
      setSelectedConnector(connectorName)
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
      await onSearch(counterPartyId, counterPartyAddress)
      onOpenChange(false)
    } catch (err: any) {
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

          {/* Selector de conectores - Ahora más prominente en la parte superior */}
          <div className="space-y-2 border p-3 rounded-md bg-gray-50">
            <Label htmlFor="connectorSelect" className="text-sm font-medium">
              <Server className="h-4 w-4 inline mr-1" /> Select Provider Connector
            </Label>
            <Select onValueChange={handleConnectorSelect} value={selectedConnector || undefined}>
              <SelectTrigger className="focus-visible:ring-lime-500">
                <SelectValue placeholder="Select a provider connector" />
              </SelectTrigger>
              <SelectContent>
                {providerConnectors.map((connector) => (
                  <SelectItem key={connector.name} value={connector.name}>
                    <div className="flex flex-col">
                      <span className="font-medium">{connector.name}</span>
                      {connector.description && <span className="text-xs text-gray-500">{connector.description}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Select a provider from the list or manually enter the details below</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="counterPartyId">Counter Party ID</Label>
            <Input
              id="counterPartyId"
              value={counterPartyId}
              onChange={(e) => setCounterPartyId(e.target.value)}
              placeholder="Enter counter party ID"
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">Example: did:web:provider-identityhub%3A7083:provider</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="counterPartyAddress">Counter Party Address</Label>
            <Input
              id="counterPartyAddress"
              value={counterPartyAddress}
              onChange={(e) => setCounterPartyAddress(e.target.value)}
              placeholder="Enter counter party address"
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">Example: http://provider-qna-controlplane:8082/api/dsp</p>
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
