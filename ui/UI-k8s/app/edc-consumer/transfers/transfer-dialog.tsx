"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, FolderOpen, Server, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSettings } from "@/contexts/app-settings-context"
import { setFlowerDataSource, setupMlflowServer } from "@/lib/dataapp-api"
import { getConnectorAddress } from "@/lib/api"

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransfer: (
    assetId: string,
    contractId: string,
    counterPartyId: string,
    counterPartyAddress: string,
    transferType: string,
    serverAddress?: string,
    additionalOptions?: any,
  ) => Promise<void>
  assetId: string
  contractId: string
  counterPartyId: string
  counterPartyAddress: string
}

export function TransferDialog({
  open,
  onOpenChange,
  onTransfer,
  assetId,
  contractId,
  counterPartyId,
  counterPartyAddress,
}: TransferDialogProps) {
  const { isFlDataAppEnabled } = useAppSettings()

  // Determine asset type based on assetId
  const isFlService = assetId.toLowerCase().includes("fl-") || assetId.toLowerCase().includes("flower")
  const isModel = assetId.toLowerCase().includes("model")

  // Construir el listener URL a partir del Connector Address
  const getDefaultListenerUrl = () => {
    const connectorAddress = getConnectorAddress()
    let listenerUrl = connectorAddress

    // Reemplazar "/management" por "/listener" si existe
    if (listenerUrl.includes("/management")) {
      listenerUrl = listenerUrl.replace("/management", "/listener")
    }
    // Si no contiene "/management" pero termina con "/api", reemplazar "/api" por "/listener"
    else if (listenerUrl.endsWith("/api")) {
      listenerUrl = listenerUrl.substring(0, listenerUrl.length - 4) + "/listener"
    }
    // Si no contiene ninguno de los anteriores, añadir "/listener" al final
    else if (!listenerUrl.endsWith("/listener")) {
      // Asegurarse de que no hay una barra al final antes de añadir "/listener"
      if (listenerUrl.endsWith("/")) {
        listenerUrl = listenerUrl.substring(0, listenerUrl.length - 1)
      }
      listenerUrl += "/listener"
    }

    return listenerUrl
  }

  // Función para obtener la URL del listener a partir del Connector Address
  const getListenerUrl = () => {
    const connectorAddress = getConnectorAddress()
    return connectorAddress.replace("/management", "/listener")
  }

  // Modificar el estado inicial para que seleccione la opción adecuada según el tipo de asset
  const [transferType, setTransferType] = useState<"PUSH" | "PULL" | "FL-DataApp" | "Model-DataApp">(
    isFlService ? "FL-DataApp" : isModel ? "Model-DataApp" : "PULL",
  )
  const [serverAddress, setServerAddress] = useState(getDefaultListenerUrl())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processingStep, setProcessingStep] = useState<string | null>(null)

  // FL-Service specific state
  const [dataSource, setDataSource] = useState<"local" | "remote" | "library">("local")
  const [localDataPath, setLocalDataPath] = useState("")
  const [remoteDataPath, setRemoteDataPath] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deploymentMode, setDeploymentMode] = useState<"kubernetes" | "remote" | "local">("local")
  const [clusterName, setClusterName] = useState("")
  const [remoteIp, setRemoteIp] = useState("")

  // Model specific state
  const [hasMLflowServer, setHasMLflowServer] = useState<"yes" | "no">("no")
  const [mlflowServerAddress, setMlflowServerAddress] = useState("http://localhost:localhost:5000")

  // Determine if form is valid for submission
  const [isFormValid, setIsFormValid] = useState(false)

  // Actualizar la dirección del servidor cuando cambia el Connector Address
  useEffect(() => {
    setServerAddress(getDefaultListenerUrl())
  }, [open])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Reset state based on asset type
      if (isFlService) {
        setTransferType("FL-DataApp")
      } else if (isModel) {
        setTransferType("Model-DataApp")
      } else {
        setTransferType("PULL")
      }

      // Reset other state
      setServerAddress(getDefaultListenerUrl())
      setError(null)
      setDataSource("local")
      setLocalDataPath("")
      setRemoteDataPath("")
      setSelectedFile(null)
      setDeploymentMode("local")
      setClusterName("")
      setRemoteIp("")
      setHasMLflowServer("no")
      setMlflowServerAddress("http://localhost:5000")
      setProcessingStep(null)

      console.log(`Dialog opened for asset: ${assetId}, isFlService: ${isFlService}, isModel: ${isModel}`)
    }
  }, [open, assetId, isFlService, isModel])

  // Validate form based on selected options
  useEffect(() => {
    if (transferType === "PUSH") {
      setIsFormValid(!!serverAddress.trim())
    } else if (transferType === "PULL") {
      setIsFormValid(true)
    } else if (transferType === "FL-DataApp") {
      if (dataSource === "local") {
        setIsFormValid(!!selectedFile)
      } else if (dataSource === "remote") {
        setIsFormValid(!!remoteDataPath.trim())
      } else if (dataSource === "library") {
        setIsFormValid(true)
      }
    } else if (transferType === "Model-DataApp") {
      if (hasMLflowServer === "yes") {
        setIsFormValid(!!mlflowServerAddress.trim())
      } else {
        setIsFormValid(true)
      }
    }
  }, [
    transferType,
    serverAddress,
    dataSource,
    localDataPath,
    remoteDataPath,
    selectedFile,
    hasMLflowServer,
    mlflowServerAddress,
  ])

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setTransferType(isFlService ? "FL-DataApp" : isModel ? "Model-DataApp" : "PULL")
      setServerAddress(getDefaultListenerUrl())
      setError(null)
      setDataSource("local")
      setLocalDataPath("")
      setRemoteDataPath("")
      setSelectedFile(null)
      setDeploymentMode("local")
      setClusterName("")
      setRemoteIp("")
      setHasMLflowServer("no")
      setMlflowServerAddress("http://localhost:5000")
      setProcessingStep(null)
    }
    onOpenChange(newOpen)
  }

  // Modificar la función handleFileSelect para abrir el explorador de archivos
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = () => {
    // Activar el input de tipo file oculto
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setLocalDataPath(file.name)
      setSelectedFile(file)
      console.log("Archivo seleccionado:", file)
    }
  }

  // Reemplazar la función handleTransfer completa con esta versión mejorada:
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      console.log(`Iniciando transferencia para asset: ${assetId}, contrato: ${contractId}`)
      console.log(`Counter Party ID: ${counterPartyId}`)
      console.log(`Counter Party Address: ${counterPartyAddress}`)
      console.log(`Tipo de transferencia seleccionado: ${transferType}`)

      // Determinar el tipo de transferencia basado en la selección del usuario
      let apiTransferType = ""
      let apiServerAddress = ""

      if (transferType === "PULL") {
        apiTransferType = "HttpData-PULL"
        console.log(`Usando transferencia PULL`)
      } else if (transferType === "PUSH") {
        apiTransferType = "HttpData-PUSH"
        apiServerAddress = serverAddress || getListenerUrl()
        console.log(`Usando transferencia PUSH con servidor: ${apiServerAddress}`)
      } else if (transferType === "FL-DataApp") {
        // Primero configurar el Flower client
        setProcessingStep("Configurando fuente de datos para Flower...")

        let dataSourceResult
        let dataSourceType = dataSource

        // Si el tipo de fuente de datos es "library", usamos "flower" para la API
        if (dataSource === "library") {
          dataSourceType = "flower"
        }

        try {
          if (dataSource === "local") {
            if (!selectedFile) {
              throw new Error("No se ha seleccionado ningún archivo")
            }
            console.log(`Configurando fuente de datos local con archivo: ${selectedFile.name}`)
            dataSourceResult = await setFlowerDataSource("local", selectedFile)
          } else if (dataSource === "remote") {
            console.log(`Configurando fuente de datos remota con URL: ${remoteDataPath}`)
            dataSourceResult = await setFlowerDataSource("remote", undefined, remoteDataPath)
          } else {
            console.log("Configurando fuente de datos de biblioteca Flower")
            dataSourceResult = await setFlowerDataSource("flower")
          }

          console.log("Resultado de configuración de fuente de datos:", dataSourceResult)

          if (!dataSourceResult || !dataSourceResult.success) {
            throw new Error(
              `Error al configurar la fuente de datos: ${dataSourceResult?.message || "Error desconocido"}`,
            )
          }
        } catch (error: any) {
          console.error("Error al configurar la fuente de datos:", error)
          throw new Error(`Error al configurar la fuente de datos: ${error.message}`)
        }

        // Luego preparar la transferencia
        setProcessingStep("Preparando cliente Flower...")

        // Construir la URL del listener para Flower
        const connectorAddress = getConnectorAddress()
        let baseUrl = connectorAddress.replace("/management", "")

        // Asegurarse de que no hay una barra al final
        if (baseUrl.endsWith("/")) {
          baseUrl = baseUrl.substring(0, baseUrl.length - 1)
        }

        // Construir la URL del listener
        apiServerAddress = `${baseUrl}/dataapp/flower/listener/${assetId}`
        apiTransferType = "HttpData-PUSH"

        console.log(`Usando transferencia FL-DataApp con listener: ${apiServerAddress}`)
      } else if (transferType === "Model-DataApp") {
        // Primero configurar MLflow
        setProcessingStep("Configurando servidor MLflow...")

        try {
          const mlflowSetupResult = await setupMlflowServer(
            hasMLflowServer === "yes",
            hasMLflowServer === "yes" ? mlflowServerAddress : undefined,
          )

          console.log("Resultado de configuración de MLflow:", mlflowSetupResult)

          if (!mlflowSetupResult || !mlflowSetupResult.success) {
            throw new Error(`Error al configurar MLflow: ${mlflowSetupResult?.message || "Error desconocido"}`)
          }
        } catch (error: any) {
          console.error("Error al configurar MLflow:", error)
          throw new Error(`Error al configurar MLflow: ${error.message}`)
        }

        // Luego preparar la transferencia
        setProcessingStep("Preparando transferencia de modelo...")

        // Construir la URL del listener para MLflow
        const connectorAddress = getConnectorAddress()
        let baseUrl = connectorAddress.replace("/management", "")

        // Asegurarse de que no hay una barra al final
        if (baseUrl.endsWith("/")) {
          baseUrl = baseUrl.substring(0, baseUrl.length - 1)
        }

        // Construir la URL del listener
        apiServerAddress = `${baseUrl}/dataapp/mlflow/listener/${assetId}`
        apiTransferType = "HttpData-PUSH"

        console.log(`Usando transferencia Model-DataApp con listener: ${apiServerAddress}`)
      }

      // Ejecutar la transferencia con los parámetros correctos
      setProcessingStep("Iniciando transferencia de datos...")
      console.log(`Ejecutando transferencia con tipo: ${apiTransferType}, servidor: ${apiServerAddress || "N/A"}`)

      // Asegurar que se pase el counterPartyId correcto
      await onTransfer(assetId, contractId, counterPartyId, counterPartyAddress, apiTransferType, apiServerAddress)

      handleOpenChange(false)
    } catch (error: any) {
      console.error("Error en la transferencia:", error)
      setError(`Error en la transferencia: ${error.message}`)
    } finally {
      setIsSubmitting(false)
      setProcessingStep(null)
    }
  }

  // Añadir un manejador de eventos de teclado para el diálogo
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isSubmitting && isFormValid) {
      e.preventDefault()
      handleTransfer(e as unknown as React.FormEvent)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Cambiar los colores de emerald a lime para unificar el estilo */}
      <DialogContent className="sm:max-w-[600px] border-lime-200" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-lime-700">Transfer Data</DialogTitle>
          <DialogDescription>Select how you want to transfer the data for this asset.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSubmitting && processingStep && (
            <div className="p-4 bg-lime-50 border border-lime-200 rounded-md flex items-center">
              <Loader2 className="h-5 w-5 mr-2 text-lime-600 animate-spin" />
              <p className="text-lime-700">{processingStep}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-base">Select Transfer Type</Label>
              <RadioGroup
                value={transferType}
                onValueChange={(value) => setTransferType(value as any)}
                className="mt-2 space-y-2"
              >
                {/* PULL Option - Siempre visible */}
                <div className="flex items-start space-x-2 p-2 border rounded-md">
                  <RadioGroupItem value="PULL" id="pull" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="pull" className="text-sm font-medium">
                      PULL: El consumidor recupera los datos directamente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Los datos se recuperarán directamente en el terminal
                    </p>
                  </div>
                </div>

                {/* PUSH Option - Siempre visible */}
                <div className="flex items-start space-x-2 p-2 border rounded-md">
                  <RadioGroupItem value="PUSH" id="push" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="push" className="text-sm font-medium">
                      PUSH: El consumidor envía los datos a un servidor de escucha
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Los datos se enviarán a un servidor que especifiques
                    </p>
                  </div>
                </div>

                {/* FL-Service Data App Option - Solo visible para assets de tipo FL */}
                {isFlDataAppEnabled && isFlService && (
                  <div className="flex items-start space-x-2 p-2 border rounded-md border-lime-300 bg-lime-50">
                    <RadioGroupItem value="FL-DataApp" id="fl-dataapp" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="fl-dataapp" className="text-sm font-medium text-lime-700">
                        Data App para FL-Service: Desplegar un cliente de Federated Learning
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Configurar y desplegar un cliente Flower para participar en federated learning
                      </p>
                    </div>
                  </div>
                )}

                {/* Model Data App Option - Solo visible para assets de tipo Model */}
                {isFlDataAppEnabled && isModel && (
                  <div className="flex items-start space-x-2 p-2 border rounded-md border-lime-300 bg-lime-50">
                    <RadioGroupItem value="Model-DataApp" id="model-dataapp" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="model-dataapp" className="text-sm font-medium text-lime-700">
                        Data App para Model: Desplegar con MLflow
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Configurar MLflow para gestionar y desplegar el modelo
                      </p>
                    </div>
                  </div>
                )}
              </RadioGroup>
            </div>

            {transferType === "PUSH" && (
              <div className="space-y-2">
                <Label htmlFor="server-address">Server Address</Label>
                <Input
                  id="server-address"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder={getListenerUrl()}
                  className="focus-visible:ring-lime-500"
                />
                <p className="text-xs text-gray-500">Example: {getDefaultListenerUrl()}</p>
              </div>
            )}

            {transferType === "FL-DataApp" && (
              <div className="space-y-4 p-3 border rounded-md border-lime-200 bg-lime-50">
                <h3 className="font-medium text-lime-700">FL-Service Configuration</h3>

                {/* Texto informativo sobre el propósito del Data App */}
                <div className="p-3 bg-lime-100 rounded-md text-sm text-lime-800 mb-4">
                  <p>
                    This Data App provides customization options for the FL-Client that will be deployed. After
                    configuration, it will perform a PUSH transfer to a specific endpoint that manages consumption and
                    automatically deploys the appropriate FL Client for connection with the federated aggregator.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="data-source" className="text-sm">
                      Training Data Source
                    </Label>
                    <Select value={dataSource} onValueChange={(value) => setDataSource(value as any)}>
                      <SelectTrigger className="w-full mt-1 focus-visible:ring-lime-500">
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local File</SelectItem>
                        <SelectItem value="remote">Remote Directory</SelectItem>
                        <SelectItem value="library">Flower Library (Test Dataset)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dataSource === "local" && (
                    <div className="space-y-2">
                      <Label htmlFor="local-path" className="text-sm">
                        Local Dataset File
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="local-path"
                          value={localDataPath}
                          onChange={(e) => setLocalDataPath(e.target.value)}
                          placeholder="Select a dataset file"
                          className="focus-visible:ring-lime-500"
                          readOnly
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleFileSelect}
                          className="border-lime-300"
                        >
                          <FolderOpen className="h-4 w-4 text-lime-600" />
                        </Button>
                        {/* Input de archivo oculto */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          style={{ display: "none" }}
                          accept=".csv,.xls,.xlsx,.json,.txt,.parquet,.yaml,.yml"
                        />
                      </div>
                      <p className="text-xs text-lime-600">Supported formats: CSV, Excel, JSON, TXT, Parquet, YAML</p>
                    </div>
                  )}

                  {dataSource === "remote" && (
                    <div className="space-y-2">
                      <Label htmlFor="remote-path" className="text-sm">
                        Remote Dataset Path
                      </Label>
                      <Input
                        id="remote-path"
                        value={remoteDataPath}
                        onChange={(e) => setRemoteDataPath(e.target.value)}
                        placeholder="Path to remote dataset (e.g., s3://bucket/path)"
                        className="focus-visible:ring-lime-500"
                      />
                    </div>
                  )}

                  {dataSource === "library" && (
                    <div className="p-2 bg-lime-100 rounded text-sm text-lime-800">
                      Using Flower library test dataset for training. No additional configuration needed.
                    </div>
                  )}
                </div>
              </div>
            )}

            {transferType === "Model-DataApp" && (
              <div className="space-y-4 p-3 border rounded-md border-lime-200 bg-lime-50">
                <h3 className="font-medium text-lime-700">Model Deployment Configuration</h3>

                {/* Texto informativo sobre el propósito del Data App */}
                <div className="p-3 bg-lime-100 rounded-md text-sm text-lime-800 mb-4">
                  <p>
                    This Data App provides options for deploying and managing ML models with MLflow. You can either
                    connect to an existing MLflow server or let the system create a new one for you.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Do you have an existing MLflow server?</Label>
                    <RadioGroup
                      value={hasMLflowServer}
                      onValueChange={(value) => setHasMLflowServer(value as "yes" | "no")}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="has-mlflow-yes" />
                        <Label htmlFor="has-mlflow-yes" className="text-sm">
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="has-mlflow-no" />
                        <Label htmlFor="has-mlflow-no" className="text-sm">
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {hasMLflowServer === "yes" && (
                    <div className="space-y-2">
                      <Label htmlFor="mlflow-server" className="text-sm">
                        MLflow Server Address
                      </Label>
                      <Input
                        id="mlflow-server"
                        value={mlflowServerAddress}
                        onChange={(e) => setMlflowServerAddress(e.target.value)}
                        placeholder="http://localhost:5000"
                        className="focus-visible:ring-lime-500"
                      />
                    </div>
                  )}

                  {hasMLflowServer === "no" && (
                    <div className="p-2 bg-lime-100 rounded text-sm text-lime-800">
                      <Server className="h-4 w-4 inline-block mr-1" />A new MLflow server will be automatically deployed
                      for you.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded-md">
              <p>Asset ID: {assetId}</p>
              <p>Contract ID: {contractId}</p>
              <p>Counter Party ID: {counterPartyId}</p>
              <p>Counter Party Address: {counterPartyAddress}</p>
              <p>Transfer Type: {transferType}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleTransfer}
            disabled={isSubmitting || !isFormValid}
            className="bg-lime-600 hover:bg-lime-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </div>
            ) : (
              "Start Transfer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
