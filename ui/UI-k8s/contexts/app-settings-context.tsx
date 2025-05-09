"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type AppSettingsContextType = {
  isFlDataAppEnabled: boolean
  setIsFlDataAppEnabled: (enabled: boolean) => void
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  // Inicializar con true (activado por defecto)
  const [isFlDataAppEnabled, setIsFlDataAppEnabled] = useState(true)

  // Cargar la configuración desde localStorage al iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSetting = localStorage.getItem("flDataAppEnabled")
      // Si existe un valor guardado, usarlo; de lo contrario, mantener el valor predeterminado (true)
      if (savedSetting !== null) {
        setIsFlDataAppEnabled(savedSetting === "true")
      }
    }
  }, [])

  // Guardar la configuración en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("flDataAppEnabled", isFlDataAppEnabled.toString())
    }
  }, [isFlDataAppEnabled])

  return (
    <AppSettingsContext.Provider value={{ isFlDataAppEnabled, setIsFlDataAppEnabled }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (context === undefined) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider")
  }
  return context
}
