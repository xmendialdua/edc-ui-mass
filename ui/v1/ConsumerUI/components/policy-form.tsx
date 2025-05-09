"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Policy = {
  id?: string
  name: string
  policyJson: string
  constraints?: string
}

interface PolicyFormProps {
  onAddPolicy: (policy: Policy) => void
}

// Update the policy form with loading state and better JSON handling
export function PolicyFormDialog({ onAddPolicy }: PolicyFormProps) {
  const [open, setOpen] = useState(false)
  const [policyId, setPolicyId] = useState("")
  const [name, setName] = useState("")
  const [policyJson, setPolicyJson] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateJson = (json: string): boolean => {
    if (!json.trim()) return true

    try {
      JSON.parse(json)
      setJsonError(null)
      return true
    } catch (e) {
      setJsonError("Invalid JSON format")
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateJson(policyJson)) {
      return
    }

    if (name.trim()) {
      setIsSubmitting(true)
      try {
        // Extract constraints from the policy JSON if possible
        let constraints = "Custom policy"

        try {
          const policy = JSON.parse(policyJson)
          if (policy["odrl:permission"] && policy["odrl:permission"]["odrl:constraint"]) {
            const constraint = policy["odrl:permission"]["odrl:constraint"]
            constraints = `${constraint["odrl:leftOperand"]["@id"]} ${constraint["odrl:operator"]["@id"]} ${constraint["odrl:rightOperand"]}`
          }
        } catch (e) {
          // Use default constraints text
        }

        await onAddPolicy({
          id: policyId.trim() || undefined,
          name,
          policyJson,
          constraints,
        })
        resetForm()
        setOpen(false)
      } catch (error) {
        console.error("Error submitting policy form:", error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const resetForm = () => {
    setPolicyId("")
    setName("")
    setPolicyJson("")
    setJsonError(null)
  }

  const samplePolicyJson = `{
  "@context": {
    "odrl": "http://www.w3.org/ns/odrl/2/"
  },
  "@type": "Set",
  "permission": [
    {
      "action": "use",
      "constraint": {
        "leftOperand": "MembershipCredential",
        "operator": "eq",
        "rightOperand": "active"
      }
    }
  ]
}`

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="text-lime-600 hover:text-lime-700 hover:bg-lime-50 border-lime-300"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-lime-200 sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-lime-700">Add New Policy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="policy-id">Policy ID</Label>
            <Input
              id="policy-id"
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              placeholder="Enter policy ID (optional)"
              className="focus-visible:ring-lime-500"
            />
            <p className="text-xs text-gray-500">If left empty, a kebab-case version of the name will be used as ID</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-name">Policy Name</Label>
            <Input
              id="policy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter policy name"
              required
              className="focus-visible:ring-lime-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="policy-json">Policy JSON</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-lime-700"
                onClick={() => setPolicyJson(samplePolicyJson)}
              >
                Insert Sample
              </Button>
            </div>
            <Textarea
              id="policy-json"
              value={policyJson}
              onChange={(e) => {
                setPolicyJson(e.target.value)
                validateJson(e.target.value)
              }}
              placeholder="Enter policy JSON"
              rows={10}
              className="font-mono text-sm focus-visible:ring-lime-500"
            />
            {jsonError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{jsonError}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-gray-500">Enter the policy definition in JSON format</p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-lime-600 hover:bg-lime-700 text-white"
              disabled={isSubmitting || !!jsonError}
            >
              {isSubmitting ? "Adding..." : "Add Policy"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

