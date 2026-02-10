// edc-config.ts

export const authConfig = {
  apiKey: "mass-api-key-change-in-production", // Default API key for MASS connector
}

// Configuración de conectores por defecto
export const connectorDefaults = {
  provider: "https://edc-mass-control.51.178.94.25.nip.io/management", 
  consumer: "https://edc-ikln-control.51.178.94.25.nip.io/management", 
}

// Configuración general de la aplicación
export const appConfig = {
  flDataAppEnabled: true, // Habilitar FL Data App por defecto
}

// Catálogo de conectores
export const connectorCatalog = [
  {
    name: "MondragonAssembly Connector",
    address: "https://edc-mass-control.51.178.94.25.nip.io/management",
    dspAddress: "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp",
    id: "BPNL00000000MASS",
    description: "Conector EDC de MondragonAssembly",
    type: "provider",
    apiKey: "mass-api-key-change-in-production",
  },
  {
    name: "Ikerlan Connector",
    address: "https://edc-ikln-control.51.178.94.25.nip.io/management",
    dspAddress: "https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp",
    id: "BPNL00000000IKLN",
    description: "Conector EDC de Ikerlan",
    type: "provider",
    apiKey: "ikln-api-key-change-in-production",
  },
  {
    name: "MondragonAssembly Connector",
    address: "https://edc-mass-control.51.178.94.25.nip.io/management",
    dspAddress: "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp",
    id: "BPNL00000000MASS",
    description: "Conector EDC de MondragonAssembly",
    type: "consumer",
    apiKey: "mass-api-key-change-in-production",
  },
  {
    name: "Ikerlan Connector",
    address: "https://edc-ikln-control.51.178.94.25.nip.io/management",
    dspAddress: "https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp",
    id: "BPNL00000000IKLN",
    description: "Conector EDC de Ikerlan",
    type: "consumer",
    apiKey: "ikln-api-key-change-in-production",
  },
  //{
  //  name: "Ikerlan Connector Black",
  //  address: "https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp",
  //  id: "BPNL000000000065",
  //  description: "Conector consumidor de FL-KIT",
  //  type: "consumer",
  //  apiKey: "TEST1", // Añadido apiKey específico
  //},
  //{
  //  name: "Provider FL",
  //  address: "http://provider-fl-controlplane:8082/api/dsp",
  //  id: "did:web:provider-fl%3A7083:provider",
  //  description: "Conector para servicios de Federated Learning",
  //  type: "provider",
  //  apiKey: "TEST1", // Añadido apiKey específico
  //},
  //{
  //  name: "Provider ML",
  //  address: "http://provider-ml-controlplane:8082/api/dsp",
  //  id: "did:web:provider-ml%3A7083:provider",
  //  description: "Conector para servicios de Machine Learning",
  //  type: "provider",
  //  apiKey: "TEST1", // Añadido apiKey específico
  //},
  //{
  //  name: "Consumer Default",
  //  address: "http://consumer-controlplane:8082/api/dsp",
  //  id: "did:web:consumer-identityhub%3A7083:consumer",
  //  description: "Conector de consumo por defecto",
  //  type: "consumer",
  //  apiKey: "TEST1", // Añadido apiKey específico
  //},
  //{
  //  name: "Ikerlan Connector Green",
  //  address: "https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp",
  //  id: "BPNL000000000065",
  //  description: "Conector de Ikerlan Dataspace para proveer servicios de federated learning",
  //  type: "provider",
  //  apiKey: "TEST1", // Clave específica para este conector
  //},
]

// Función para obtener conectores por tipo
export const getConnectorsByType = (type: string) => {
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

// Función para obtener el catálogo de conectores
export const getConnectorCatalog = () => {
  return connectorCatalog
}
