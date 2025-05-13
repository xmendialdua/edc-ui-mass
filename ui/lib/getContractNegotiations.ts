// Función para mejorar los datos de negociaciones con información de counterPartyId
export async function enhanceNegotiationsWithCounterPartyInfo(negotiations: any[]): Promise<any[]> {
  return Promise.all(
    negotiations.map(async (negotiation) => {
      // Si ya tiene counterPartyId, lo dejamos como está
      if (negotiation.counterPartyId) {
        return negotiation
      }

      // Si no tiene counterPartyId pero tiene counterPartyAddress, intentamos extraerlo
      if (negotiation.counterPartyAddress) {
        // Extraer el ID del conector de la dirección (simulado)
        const counterPartyId = extractCounterPartyIdFromAddress(negotiation.counterPartyAddress)
        return {
          ...negotiation,
          counterPartyId: counterPartyId,
        }
      }

      // Si no tiene ninguno de los dos, asignamos un valor por defecto
      return {
        ...negotiation,
        counterPartyId: "UNKNOWN_COUNTERPARTY",
      }
    }),
  )
}

// Función auxiliar para extraer el ID del conector de la dirección
function extractCounterPartyIdFromAddress(address: string): string {
  // Simulamos la extracción basada en patrones comunes en las direcciones
  if (address.includes("connector1")) {
    return "BPNL000000000065"
  } else if (address.includes("connector2")) {
    return "BPNL000000000066"
  } else if (address.includes("connector3")) {
    return "BPNL000000000067"
  } else if (address.includes("connector4")) {
    return "BPNL000000000068"
  } else if (address.includes("connector5")) {
    return "BPNL000000000069"
  } else {
    return "BPNL000000000000" // ID por defecto
  }
}
