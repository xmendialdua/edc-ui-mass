"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, AlertCircle, ChevronDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Policy = {
  id?: string
  name: string
  policyJson: string
  constraints?: string
}

interface PolicyFormProps {
  onAddPolicy: (policy: Policy) => void
}

// Policy examples
const POLICY_EXAMPLES = {
  membership: `{
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
}`,
  dataProcessor: `{
  "@type": "Set",
  "obligation": [
      {
          "action": "use",
          "constraint": {
              "leftOperand": "DataAccess.level",
              "operator": "eq",
              "rightOperand": "processing"
          }
      }
  ]
}`,
  temporal: `{
  "@context": "http://www.w3.org/ns/odrl.jsonld",
  "@type": "Set",
  "permission": [
      {
          "action": "use",
          "constraint": {
              "@type": "AtomicConstraint",
              "leftOperand": "dateTime",
              "operator": {
                  "@id": "odrl:gteq"
              },
              "rightOperand": {
                  "@value": "2023-01-01T00:00:00Z",
                  "@type": "xsd:dateTime"
              }
          }
      }
  ],
  "prohibition": [],
  "obligation": []
}`,
  region: `{
  "@context": "http://www.w3.org/ns/odrl.jsonld",
  "@type": "Set",
  "permission": [
      {
          "action": "use",
          "constraint": {
              "@type": "AtomicConstraint",
              "leftOperand": "location",
              "operator": {
                  "@id": "odrl:eq"
              },
              "rightOperand": "eu"
          }
      }
  ],
  "prohibition": [],
  "obligation": []
}`,
  empty: `{
  "@type": "Set",
  "odrl:permission": [],
  "odrl:prohibition": [],
  "odrl:obligation": []
}`,
}

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

  const insertPolicyExample = (type: keyof typeof POLICY_EXAMPLES) => {
    setPolicyJson(POLICY_EXAMPLES[type])
    validateJson(POLICY_EXAMPLES[type])
  }

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-lime-700 flex items-center">
                    Insert Example <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => insertPolicyExample("membership")}>Membership</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertPolicyExample("dataProcessor")}>
                    DataProcessor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertPolicyExample("temporal")}>Temporal</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertPolicyExample("region")}>Region</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertPolicyExample("empty")}>Empty</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
