"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, FolderOpen, Server, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSettings } from "@/contexts/app-settings-context"
import { setFlowerDataSource, initiateFlowerTransfer } from "@/lib/dataapp-api"

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransfer: (transferType: string, serverAddress?: string, additionalOptions?: any) => Promise<void>
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

  // Modificar el estado inicial para que seleccione la opción adecuada según el tipo de asset
  const [transferType, setTransferType] = useState<"PUSH" | "PULL" | "FL-DataApp" | "Model-DataApp">(
    isFlService ? "FL-DataApp" : isModel ? "Model-DataApp" : "PULL",
  )
  const [serverAddress, setServerAddress] = useState("http://172.19.0.2:30381/listener")
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
  const [mlflowServerAddress, setMlflowServerAddress] = useState("http://localhost:5000")

  // Determine if form is valid for submission
  const [isFormValid, setIsFormValid] = useState(false)

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
      setServerAddress("http://172.19.0.2:30381/listener")
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

  // Función para configurar el servidor MLflow
  const setupMlflowServer = async (
    hasExistingServer: boolean,
    serverUrl?: string,
  ): Promise<{ success: boolean; message: string; mlflowUrl?: string }> => {
    try {
      console.log(`Setting up MLflow server. Has existing server: ${hasExistingServer}`)

      const API_URL = `${window.location.origin}/api-dataapp`
      let url = `${API_URL}/mlflow/set-mlflow-url`

      // Si hay un servidor existente, añadir la URL como parámetro
      if (hasExistingServer && serverUrl) {
        url += `?mlflow_url=${encodeURIComponent(serverUrl)}`
      }

      console.log(`Making request to: ${url}`)

      const response = await fetch(url, {
        method: "POST",
      })

      console.log(`MLflow setup response status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        let responseData
        try {
          const responseText = await response.text()
          console.log(`MLflow setup response: ${responseText || "empty"}`)

          if (responseText && responseText.trim()) {
            responseData = JSON.parse(responseText)
          } else {
            responseData = {
              success: true,
              message: hasExistingServer
                ? `Connected to MLflow server at ${serverUrl}`
                : "New MLflow server created successfully",
              mlflowUrl: hasExistingServer ? serverUrl : "http://172.19.0.2:30381/mlflow",
            }
          }
        } catch (e) {
          console.log("Response is not JSON, using default success message")
          responseData = {
            success: true,
            message: hasExistingServer
              ? `Connected to MLflow server at ${serverUrl}`
              : "New MLflow server created successfully",
            mlflowUrl: hasExistingServer ? serverUrl : "http://172.19.0.2:30381/mlflow",
          }
        }

        return {
          success: true,
          message: responseData.message || "MLflow server setup successfully",
          mlflowUrl: responseData.mlflowUrl || (hasExistingServer ? serverUrl : "http://172.19.0.2:30381/mlflow"),
        }
      }

      // Si la respuesta no es exitosa
      let errorText = ""
      try {
        errorText = await response.text()
      } catch (e) {
        errorText = "Unknown error"
      }

      throw new Error(`Failed to setup MLflow server: ${response.status} ${response.statusText} - ${errorText}`)
    } catch (error: any) {
      console.error("Error setting up MLflow server:", error)
      return {
        success: false,
        message: error.message || "Failed to setup MLflow server",
      }
    }
  }

  // Modificar la función handleSubmit para manejar mejor los resultados de la configuración de la fuente de datos
  const handleSubmit = async () => {
    try {
      setError(null)
      setIsSubmitting(true)

      if (transferType === "PUSH" && !serverAddress.trim()) {
        setError("Server address is required for PUSH transfers")
        setIsSubmitting(false)
        return
      }

      console.log(`Submitting transfer for contract: ${contractId}`)
      console.log(`Asset ID: ${assetId}`)
      console.log(`Counter party ID: ${counterPartyId}`)
      console.log(`Counter party address: ${counterPartyAddress}`)
      console.log(`Transfer type: ${transferType}`)

      let additionalOptions = {}

      if (transferType === "PUSH") {
        console.log(`Server address: ${serverAddress}`)
        await onTransfer("HttpData-PUSH", serverAddress)
      } else if (transferType === "PULL") {
        await onTransfer("HttpData-PULL")
      } else if (transferType === "FL-DataApp") {
        // Handle FL-DataApp specific logic
        try {
          // Step 1: Set the data source in the Data App
          setProcessingStep("Setting up data source...")

          let dataSourceResult
          let dataSourceType = dataSource

          // Si el tipo de fuente de datos es "library", usamos "flower" para la API
          if (dataSource === "library") {
            dataSourceType = "flower"
          }

          if (dataSource === "local") {
            if (!selectedFile) {
              throw new Error("No file selected")
            }
            console.log(`Setting up local data source with file: ${selectedFile.name}`)
            dataSourceResult = await setFlowerDataSource("local", selectedFile)
          } else if (dataSource === "remote") {
            console.log(`Setting up remote data source with URL: ${remoteDataPath}`)
            dataSourceResult = await setFlowerDataSource("remote", undefined, remoteDataPath)
          } else {
            // Cambiado de "library" a "flower"
            console.log("Setting up Flower library data source")
            dataSourceResult = await setFlowerDataSource("flower")
          }

          console.log("Data source setup result:", dataSourceResult)

          // Verificar si la configuración de la fuente de datos fue exitosa
          if (!dataSourceResult.success) {
            console.error("Data source setup failed:", dataSourceResult.message)
            throw new Error(`Failed to set data source: ${dataSourceResult.message}`)
          }

          console.log("Data source setup successful, proceeding to next step")

          // Step 2: Initiate the Flower transfer
          setProcessingStep("Preparing Flower client...")
          console.log("Initiating Flower transfer for asset:", assetId)
          const transferResult = await initiateFlowerTransfer(assetId)
          console.log("Flower transfer preparation result:", transferResult)

          if (!transferResult.success || !transferResult.transferUrl) {
            console.error("Flower transfer preparation failed:", transferResult.message)
            throw new Error(`Failed to initiate Flower transfer: ${transferResult.message}`)
          }

          console.log("Flower transfer preparation successful, proceeding to final step")

          // Step 3: Execute the transfer through the EDC connector
          setProcessingStep("Initiating data transfer...")

          // Prepare FL-Service specific options for the connector
          additionalOptions = {
            dataSource: {
              type: dataSourceType,
              path:
                dataSource === "local" ? localDataPath : dataSource === "remote" ? remoteDataPath : "flower-library",
            },
            deployment: {
              mode: "local",
              config: { local: true },
            },
          }

          console.log("FL-DataApp options:", additionalOptions)
          console.log("Transfer URL:", transferResult.transferUrl)

          // Execute the PUSH transfer with the specific listener URL
          await onTransfer("HttpData-PUSH", transferResult.transferUrl, additionalOptions)
        } catch (error: any) {
          console.error("FL-DataApp transfer error:", error)
          throw new Error(`FL-DataApp setup failed: ${error.message}`)
        }
      } else if (transferType === "Model-DataApp") {
        // Handle Model-DataApp specific logic
        try {
          // Step 1: Set up MLflow server
          setProcessingStep("Setting up MLflow server...")

          const mlflowSetupResult = await setupMlflowServer(
            hasMLflowServer === "yes",
            hasMLflowServer === "yes" ? mlflowServerAddress : undefined,
          )

          console.log("MLflow setup result:", mlflowSetupResult)

          if (!mlflowSetupResult.success) {
            console.error("MLflow setup failed:", mlflowSetupResult.message)
            throw new Error(`Failed to set up MLflow server: ${mlflowSetupResult.message}`)
          }

          console.log("MLflow setup successful, proceeding to next step")

          // Step 2: Prepare for transfer
          setProcessingStep("Preparing model transfer...")

          // Construct the listener URL for the PUSH transfer
          const transferUrl = `http://172.19.0.2:30381/mlflow/listener/${assetId}`
          console.log(`Using MLflow transfer URL: ${transferUrl}`)

          // Step 3: Execute the transfer through the EDC connector
          setProcessingStep("Initiating model transfer...")

          // Prepare Model specific options
          additionalOptions = {
            mlflow: {
              existingServer: hasMLflowServer === "yes",
              serverAddress: mlflowSetupResult.mlflowUrl || "http://172.19.0.2:30381/mlflow",
              deployNew: hasMLflowServer === "no",
            },
          }

          console.log("Model-DataApp options:", additionalOptions)

          // Execute the PUSH transfer with the specific listener URL
          await onTransfer("HttpData-PUSH", transferUrl, additionalOptions)
        } catch (error: any) {
          console.error("Model-DataApp transfer error:", error)
          throw new Error(`Model-DataApp setup failed: ${error.message}`)
        }
      }

      handleOpenChange(false)
    } catch (err: any) {
      console.error("Transfer failed:", err)
      setError(`Transfer failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
      setProcessingStep(null)
    }
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-emerald-200">
        <DialogHeader>
          <DialogTitle className="text-emerald-700">Transfer Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSubmitting && processingStep && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center">
              <Loader2 className="h-5 w-5 mr-2 text-emerald-600 animate-spin" />
              <p className="text-emerald-700">{processingStep}</p>
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
                {/* PULL Option */}
                <div className="flex items-start space-x-2 p-2 border rounded-md">
                  <RadioGroupItem value="PULL" id="pull" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="pull" className="text-sm font-medium">
                      PULL: The consumer retrieves the data directly
                    </Label>
                    <p className="text-xs text-muted-foreground">The data will be retrieved directly in the terminal</p>
                  </div>
                </div>

                {/* PUSH Option */}
                <div className="flex items-start space-x-2 p-2 border rounded-md">
                  <RadioGroupItem value="PUSH" id="push" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="push" className="text-sm font-medium">
                      PUSH: The consumer sends the data to a listening server
                    </Label>
                    <p className="text-xs text-muted-foreground">The data will be sent to a server that you specify</p>
                  </div>
                </div>

                {/* FL-Service Data App Option - Movida a la tercera posición */}
                {isFlDataAppEnabled && isFlService && (
                  <div className="flex items-start space-x-2 p-2 border rounded-md border-emerald-300 bg-emerald-50">
                    <RadioGroupItem value="FL-DataApp" id="fl-dataapp" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="fl-dataapp" className="text-sm font-medium text-emerald-700">
                        Data App for FL-Service: Deploy a Federated Learning client
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Configure and deploy a Flower client to participate in federated learning
                      </p>
                    </div>
                  </div>
                )}

                {/* Model Data App Option - Movida a la última posición */}
                {isFlDataAppEnabled && isModel && (
                  <div className="flex items-start space-x-2 p-2 border rounded-md border-emerald-300 bg-emerald-50">
                    <RadioGroupItem value="Model-DataApp" id="model-dataapp" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="model-dataapp" className="text-sm font-medium text-emerald-700">
                        Data App for Model: Deploy with MLflow
                      </Label>
                      <p className="text-xs text-muted-foreground">Configure MLflow to manage and deploy the model</p>
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
                  placeholder="Enter server address"
                  className="focus-visible:ring-emerald-500"
                />
                <p className="text-xs text-gray-500">Example: http://172.19.0.2:30381/listener</p>
              </div>
            )}

            {transferType === "FL-DataApp" && (
              <div className="space-y-4 p-3 border rounded-md border-emerald-200 bg-emerald-50">
                <h3 className="font-medium text-emerald-700">FL-Service Configuration</h3>

                {/* Texto informativo sobre el propósito del Data App */}
                <div className="p-3 bg-emerald-100 rounded-md text-sm text-emerald-800 mb-4">
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
                      <SelectTrigger className="w-full mt-1 focus-visible:ring-emerald-500">
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
                          className="focus-visible:ring-emerald-500"
                          readOnly
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleFileSelect}
                          className="border-emerald-300"
                        >
                          <FolderOpen className="h-4 w-4 text-emerald-600" />
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
                      <p className="text-xs text-emerald-600">
                        Supported formats: CSV, Excel, JSON, TXT, Parquet, YAML
                      </p>
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
                        className="focus-visible:ring-emerald-500"
                      />
                    </div>
                  )}

                  {dataSource === "library" && (
                    <div className="p-2 bg-emerald-100 rounded text-sm text-emerald-800">
                      Using Flower library test dataset for training. No additional configuration needed.
                    </div>
                  )}
                </div>
              </div>
            )}

            {transferType === "Model-DataApp" && (
              <div className="space-y-4 p-3 border rounded-md border-emerald-200 bg-emerald-50">
                <h3 className="font-medium text-emerald-700">Model Deployment Configuration</h3>

                {/* Texto informativo sobre el propósito del Data App */}
                <div className="p-3 bg-emerald-100 rounded-md text-sm text-emerald-800 mb-4">
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
                        className="focus-visible:ring-emerald-500"
                      />
                    </div>
                  )}

                  {hasMLflowServer === "no" && (
                    <div className="p-2 bg-emerald-100 rounded text-sm text-emerald-800">
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
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
