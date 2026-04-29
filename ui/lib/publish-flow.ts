// Flujo completo de publicación de documentos: Asset + Policy + Contract Definition
// Basado en la documentación de Tractus-X EDC

import { createAsset, createPolicy, createContractDefinition, getPolicies } from "@/app/edc-provider/lib/api"
import type { Company } from "./documents-storage"

// URL de PDF de ejemplo de acceso público
export const PUBLIC_PDF_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

// Log entry type
export type LogEntry = {
  timestamp: Date
  type: "info" | "success" | "error" | "warning"
  message: string
}

// Callback para enviar logs a la UI
export type LogCallback = (entry: LogEntry) => void

// Mapeo de empresas a BPNs (Business Partner Numbers) - IDs de partners en Tractus-X
const COMPANY_BPN_MAP: Record<Company, string> = {
  Ikerlan: "BPNL00000001IKLN",
  Ederlan: "BPNL00000000EDER",
  Gestamp: "BPNL00000000GEST",
  Bexen: "BPNL00000000BEXN",
}

/**
 * Función para crear un asset de documento PDF en el conector EDC
 */
export async function createDocumentAsset(
  documentName: string,
  documentUrl: string,
  logCallback: LogCallback
): Promise<string> {
  const assetId = `asset-${documentName.replace(/\s+/g, "-").toLowerCase()}`

  logCallback({
    timestamp: new Date(),
    type: "info",
    message: `Creando asset '${documentName}' con ID: ${assetId}...`,
  })

  try {
    const assetPayload = {
      id: assetId,
      name: documentName,
      description: `PDF document: ${documentName}`,
      baseUrl: documentUrl,
      contentType: "application/pdf",
    }

    await createAsset(assetPayload)

    logCallback({
      timestamp: new Date(),
      type: "success",
      message: `✓ Asset '${documentName}' creado exitosamente`,
    })

    return assetId
  } catch (error: any) {
    logCallback({
      timestamp: new Date(),
      type: "error",
      message: `✗ Error al crear asset: ${error.message}`,
    })
    throw error
  }
}

/**
 * Función para crear una política ODRL para un partner específico
 * La política permite el acceso solo al BPN del partner especificado
 */
export async function createOrGetPolicyForPartner(
  partnerCompany: Company,
  logCallback: LogCallback
): Promise<string> {
  const partnerBPN = COMPANY_BPN_MAP[partnerCompany]
  const policyId = `policy-${partnerCompany.toLowerCase()}`

  logCallback({
    timestamp: new Date(),
    type: "info",
    message: `Verificando política para ${partnerCompany} (${partnerBPN})...`,
  })

  try {
    // Verificar si ya existe una política para este partner
    const existingPolicies = await getPolicies()
    const existingPolicy = existingPolicies.find((p) => p.id === policyId)

    if (existingPolicy) {
      logCallback({
        timestamp: new Date(),
        type: "info",
        message: `✓ Política existente encontrada para ${partnerCompany}`,
      })
      return policyId
    }

    // Crear nueva política ODRL con restricción BPN
    logCallback({
      timestamp: new Date(),
      type: "info",
      message: `Creando nueva política ODRL para ${partnerCompany}...`,
    })

    // Política ODRL que restringe el acceso solo al BPN del partner
    const odrlPolicy = {
      "@context": {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
        odrl: "http://www.w3.org/ns/odrl/2/",
      },
      "@type": "PolicyDefinition",
      "@id": policyId,
      policy: {
        "@type": "odrl:Set",
        "odrl:permission": {
          "odrl:action": {
            "@type": "odrl:Action",
            "@id": "odrl:use",
          },
          "odrl:constraint": {
            "@type": "odrl:LogicalConstraint",
            "odrl:leftOperand": "BusinessPartnerNumber",
            "odrl:operator": {
              "@id": "odrl:eq",
            },
            "odrl:rightOperand": partnerBPN,
          },
        },
      },
    }

    const policyPayload = {
      id: policyId,
      name: `Access Policy for ${partnerCompany}`,
      policyJson: JSON.stringify(odrlPolicy.policy),
    }

    await createPolicy(policyPayload)

    logCallback({
      timestamp: new Date(),
      type: "success",
      message: `✓ Política ODRL creada para ${partnerCompany}`,
    })

    return policyId
  } catch (error: any) {
    logCallback({
      timestamp: new Date(),
      type: "error",
      message: `✗ Error al crear/obtener política: ${error.message}`,
    })
    throw error
  }
}

/**
 * Función para crear una Contract Definition que vincula el asset con la política
 */
export async function createContractDefinitionForAsset(
  assetId: string,
  policyId: string,
  documentName: string,
  partnerCompany: Company,
  logCallback: LogCallback
): Promise<string> {
  const contractId = `contract-${documentName.replace(/\s+/g, "-").toLowerCase()}-${partnerCompany.toLowerCase()}`

  logCallback({
    timestamp: new Date(),
    type: "info",
    message: `Creando contrato para ${documentName} → ${partnerCompany}...`,
  })

  try {
    const contractPayload = {
      id: contractId,
      name: `Contract: ${documentName} for ${partnerCompany}`,
      accessPolicyId: policyId,
      contractPolicyId: policyId, // Usar la misma política para ambos
      assetIds: [assetId],
    }

    await createContractDefinition(contractPayload)

    logCallback({
      timestamp: new Date(),
      type: "success",
      message: `✓ Contrato creado exitosamente para ${partnerCompany}`,
    })

    return contractId
  } catch (error: any) {
    logCallback({
      timestamp: new Date(),
      type: "error",
      message: `✗ Error al crear contrato: ${error.message}`,
    })
    throw error
  }
}

/**
 * Flujo completo: Publicar documento, crear política y contrato
 */
export async function publishDocumentToPartner(
  documentName: string,
  documentUrl: string,
  partnerCompany: Company,
  logCallback: LogCallback
): Promise<{
  assetId: string
  policyId: string
  contractId: string
}> {
  logCallback({
    timestamp: new Date(),
    type: "info",
    message: `========================================`,
  })
  logCallback({
    timestamp: new Date(),
    type: "info",
    message: `Iniciando publicación: ${documentName} → ${partnerCompany}`,
  })
  logCallback({
    timestamp: new Date(),
    type: "info",
    message: `========================================`,
  })

  try {
    // Paso 1: Crear el asset (si no existe ya)
    let assetId: string
    try {
      assetId = await createDocumentAsset(documentName, documentUrl, logCallback)
    } catch (error: any) {
      // Si el asset ya existe, continuar con el ID
      if (error.message.includes("already exists")) {
        assetId = `asset-${documentName.replace(/\s+/g, "-").toLowerCase()}`
        logCallback({
          timestamp: new Date(),
          type: "warning",
          message: `Asset ya existe, usando ID: ${assetId}`,
        })
      } else {
        throw error
      }
    }

    // Paso 2: Crear o obtener política para el partner
    const policyId = await createOrGetPolicyForPartner(partnerCompany, logCallback)

    // Paso 3: Crear Contract Definition
    const contractId = await createContractDefinitionForAsset(
      assetId,
      policyId,
      documentName,
      partnerCompany,
      logCallback
    )

    logCallback({
      timestamp: new Date(),
      type: "success",
      message: `========================================`,
    })
    logCallback({
      timestamp: new Date(),
      type: "success",
      message: `✓ PUBLICACIÓN COMPLETADA EXITOSAMENTE`,
    })
    logCallback({
      timestamp: new Date(),
      type: "success",
      message: `========================================`,
    })

    return { assetId, policyId, contractId }
  } catch (error: any) {
    logCallback({
      timestamp: new Date(),
      type: "error",
      message: `========================================`,
    })
    logCallback({
      timestamp: new Date(),
      type: "error",
      message: `✗ ERROR EN LA PUBLICACIÓN: ${error.message}`,
    })
    logCallback({
      timestamp: new Date(),
      type: "error",
      message: `========================================`,
    })
    throw error
  }
}
