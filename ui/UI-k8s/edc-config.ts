/**
 * Configuración centralizada para EDC-UI
 */

// Configuración de autenticación
export const authConfig = {
  apiKey: "TEST1", // Cambiado de "TEST1" a "password" que es el valor por defecto para muchos conectores EDC
}

// Configuración de conectores por defecto
export const connectorDefaults = {
  provider: "https://control-plane-connector1.dataspace-ikerlan.es/management", // Dirección por defecto para Provider Mode
  consumer: "https://control-plane-connector4.dataspace-ikerlan.es/management", // Dirección por defecto para Consumer Mode
}

// Catálogo de conectores disponibles
export interface ConnectorEntry {
  name: string // Nombre amigable del conector
  address: string // Dirección del conector
  id: string // Identificador del conector (counterPartyId)
  description?: string // Descripción opcional
  type: "provider" | "consumer" // Tipo de conector
  apiKey?: string // Clave de API específica para este conector (opcional)
}

// Catálogo de conectores disponibles
export const connectorCatalog: ConnectorEntry[] = [
  {
    name: "Ikerlan Connector Black",
    address: "https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp",
    id: "BPNL000000000065",
    description: "Conector consumidor de FL-KIT",
    type: "consumer",
    apiKey: "TEST1", // Añadido apiKey específico
  },
  {
    name: "Provider FL",
    address: "http://provider-fl-controlplane:8082/api/dsp",
    id: "did:web:provider-fl%3A7083:provider",
    description: "Conector para servicios de Federated Learning",
    type: "provider",
    apiKey: "TEST1", // Añadido apiKey específico
  },
  {
    name: "Provider ML",
    address: "http://provider-ml-controlplane:8082/api/dsp",
    id: "did:web:provider-ml%3A7083:provider",
    description: "Conector para servicios de Machine Learning",
    type: "provider",
    apiKey: "TEST1", // Añadido apiKey específico
  },
  {
    name: "Consumer Default",
    address: "http://consumer-controlplane:8082/api/dsp",
    id: "did:web:consumer-identityhub%3A7083:consumer",
    description: "Conector de consumo por defecto",
    type: "consumer",
    apiKey: "TEST1", // Añadido apiKey específico
  },
  {
    name: "Ikerlan Connector Green",
    address: "https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp",
    id: "BPNL000000000065",
    description: "Conector de Ikerlan Dataspace para proveer servicios de federated learning",
    type: "provider",
    apiKey: "TEST1", // Clave específica para este conector
  },
]

// Función para obtener conectores por tipo
export const getConnectorsByType = (type: "provider" | "consumer"): ConnectorEntry[] => {
  return connectorCatalog.filter((connector) => connector.type === type)
}

// Función para obtener la clave de API para un conector específico
export const getApiKeyForConnector = (connectorAddress: string): string => {
  // Buscar el conector en el catálogo
  const connector = connectorCatalog.find(
    (c) => c.address === connectorAddress || connectorAddress.startsWith(c.address),
  )

  // Si se encuentra y tiene una clave específica, devolverla
  if (connector && connector.apiKey) {
    console.log(`Found API key for connector ${connectorAddress}: ${connector.apiKey}`)
    return connector.apiKey
  }

  // De lo contrario, devolver la clave por defecto
  console.log(`Using default API key for connector ${connectorAddress}: ${authConfig.apiKey}`)
  return authConfig.apiKey
}
