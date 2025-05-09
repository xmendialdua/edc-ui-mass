"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

// Add language types and translations
type Language = "en" | "es"

type Translations = {
  [key in Language]: {
    title: string
    consumer: string
    refreshData: string
    checkApi: string
    switchToMock: string
    switchToLive: string
    language: string
    english: string
    spanish: string
    apiMode: string
    liveApi: string
    mockData: string
    connectorAddress: string
    changeConnector: string
    checking: string
    assets: string
    policies: string
    contractDefinitions: string
    noAssetsAvailable: string
    noPoliciesAvailable: string
    noContractsAvailable: string
    flowerServer: string
  }
}

const translations: Translations = {
  en: {
    title: "EDC - Provider",
    consumer: "EDC - Consumer",
    refreshData: "Refresh Data",
    checkApi: "Check API Connectivity",
    switchToMock: "Switch to Mock Data",
    switchToLive: "Switch to Live API",
    language: "Language",
    english: "English",
    spanish: "Spanish",
    apiMode: "API Mode:",
    liveApi: "Live API",
    mockData: "Mock Data",
    connectorAddress: "Connector Address:",
    changeConnector: "Change Connector",
    checking: "Checking...",
    assets: "Assets",
    policies: "Policies",
    contractDefinitions: "Contract Definitions",
    noAssetsAvailable: "No assets available",
    noPoliciesAvailable: "No policies available",
    noContractsAvailable: "No contract definitions available",
    flowerServer: "Flower Server (Aggregator)",
  },
  es: {
    title: "EDC - Proveedor",
    consumer: "EDC - Consumidor",
    refreshData: "Actualizar Datos",
    checkApi: "Verificar Conectividad API",
    switchToMock: "Cambiar a Datos Simulados",
    switchToLive: "Cambiar a API en Vivo",
    language: "Idioma",
    english: "Inglés",
    spanish: "Español",
    apiMode: "Modo API:",
    liveApi: "API en Vivo",
    mockData: "Datos Simulados",
    connectorAddress: "Dirección del Conector:",
    changeConnector: "Cambiar Conector",
    checking: "Verificando...",
    assets: "Activos",
    policies: "Políticas",
    contractDefinitions: "Definiciones de Contrato",
    noAssetsAvailable: "No hay activos disponibles",
    noPoliciesAvailable: "No hay políticas disponibles",
    noContractsAvailable: "No hay definiciones de contrato disponibles",
    flowerServer: "Servidor Flower (Agregador)",
  },
}

// Create language context
const LanguageContext = createContext<{
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof Translations["en"]) => string
}>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translations["en"][key],
})

// Language provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  // Translation function
  const t = (key: keyof Translations["en"]) => translations[language][key]

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

