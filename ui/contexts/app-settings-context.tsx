"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { appConfig } from "@/edc-config"

type AppSettingsContextType = {
  isFlDataAppEnabled: boolean
  setIsFlDataAppEnabled: (enabled: boolean) => void
  isKubernetesEnabled: boolean
  setIsKubernetesEnabled: (enabled: boolean) => void
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  // Estado para FL Data App
  const [isFlDataAppEnabled, setIsFlDataAppEnabledState] = useState<boolean>(appConfig.flDataAppEnabled)

  // Estado para Kubernetes
  const [isKubernetesEnabled, setIsKubernetesEnabledState] = useState<boolean>(appConfig.kubernetesEnabled)

  // Cargar configuración desde localStorage al iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Cargar configuración de FL Data App
      const savedFlDataApp = localStorage.getItem("flDataAppEnabled")
      if (savedFlDataApp !== null) {
        setIsFlDataAppEnabledState(savedFlDataApp === "true")
      }

      // Cargar configuración de Kubernetes
      const savedKubernetes = localStorage.getItem("kubernetesEnabled")
      if (savedKubernetes !== null) {
        setIsKubernetesEnabledState(savedKubernetes === "true")
      }
    }
  }, [])

  // Función para actualizar FL Data App
  const setIsFlDataAppEnabled = (enabled: boolean) => {
    setIsFlDataAppEnabledState(enabled)
    if (typeof window !== "undefined") {
      localStorage.setItem("flDataAppEnabled", enabled.toString())
    }
  }

  // Función para actualizar Kubernetes
  const setIsKubernetesEnabled = (enabled: boolean) => {
    setIsKubernetesEnabledState(enabled)
    if (typeof window !== "undefined") {
      localStorage.setItem("kubernetesEnabled", enabled.toString())
    }
  }

  return (
    <AppSettingsContext.Provider
      value={{
        isFlDataAppEnabled,
        setIsFlDataAppEnabled,
        isKubernetesEnabled,
        setIsKubernetesEnabled,
      }}
    >
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
