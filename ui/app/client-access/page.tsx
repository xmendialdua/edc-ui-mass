"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Check, AlertCircle, FileText, Download, User, RefreshCw } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Importar el storage compartido
import { getDocumentsForCompany, type Company } from "@/lib/documents-storage"

// Tipos de datos
type Document = {
  id: string
  name: string
  sharedWith: Company | null
  dateCreated: string
  lastModified: string
}

export default function ClientAccessPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [email, setEmail] = useState("dataspace@ikerlan.es")
  const [password, setPassword] = useState("CX-dataspace@2026")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])

  // Cargar documentos cuando el usuario se loguea
  useEffect(() => {
    if (isLoggedIn && company) {
      const docs = getDocumentsForCompany(company)
      setDocuments(docs)
    }
  }, [isLoggedIn, company])

  // Listener para cambios en localStorage desde otras pestañas (sincronización en tiempo real)
  useEffect(() => {
    if (!isLoggedIn || !company) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "catena-x-documents" && e.newValue) {
        // Recargar documentos cuando cambia el storage
        const docs = getDocumentsForCompany(company)
        setDocuments(docs)
        setSuccessMessage("Documents updated")
        setTimeout(() => setSuccessMessage(null), 2000)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [isLoggedIn, company])

  // Función para recargar documentos manualmente
  const refreshDocuments = () => {
    if (company) {
      const docs = getDocumentsForCompany(company)
      setDocuments(docs)
      setSuccessMessage("Documents refreshed")
      setTimeout(() => setSuccessMessage(null), 2000)
    }
  }

  // Función para manejar el login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validación de credenciales específicas para Ikerlan
    if (email.toLowerCase() === "dataspace@ikerlan.es" && password === "CX-dataspace@2026") {
      setCompany("Ikerlan")
      setIsLoggedIn(true)
      setSuccessMessage("Welcome, Ikerlan!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError("Invalid email or password. Please check your credentials.")
    }
  }

  // Función para manejar el logout
  const handleLogout = () => {
    setIsLoggedIn(false)
    setCompany(null)
    setEmail("dataspace@ikerlan.es")
    setPassword("CX-dataspace@2026")
  }

  // Función para login rápido por empresa
  const handleQuickLogin = (selectedCompany: Company) => {
    setCompany(selectedCompany)
    setIsLoggedIn(true)
    setSuccessMessage(`Welcome, ${selectedCompany}!`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Función para descargar un documento (mock)
  const handleDownload = (docName: string) => {
    setSuccessMessage(`Downloading ${docName}...`)
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white p-4 flex items-center justify-between border-b-2 border-lime-500">
        {/* Logo Mondragon Assembly - izquierda */}
        <Link
          href="https://www.mondragon-assembly.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-transform duration-300 hover:scale-110"
        >
          <div className="h-12 w-48 relative">
            <Image
              src="https://www.mondragon-assembly.com/wp-content/themes/ma2019/assets/layout/img/header-logo-mondragonassembly-40-v3.png"
              alt="Mondragon Assembly Logo"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </Link>

        {/* Título centrado */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-2xl font-bold text-white">Mondragon Assembly Data Space</h1>
        </div>

        {/* Usuario logueado - derecha */}
        <div className="flex items-center gap-4">
          {isLoggedIn && company ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-lime-500">{company}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
              <div className="h-12 w-12 rounded-full bg-lime-600 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>
          ) : (
            <Link
              href="https://www.ikerlan.es/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform duration-300 hover:scale-110"
            >
              <div className="h-12 w-36 relative">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ikerlan_BRTA_V2-kEfpkdzKLTDdzKZuFRUfTexpzGyQMk.png"
                  alt="Ikerlan Logo"
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 pt-24 pb-20">
        {/* Botones de login rápido - superior derecha */}
        {!isLoggedIn && (
          <div className="fixed top-20 right-6 z-40 flex flex-col gap-2 w-48">
            <Button
              onClick={() => handleQuickLogin("Ikerlan")}
              size="sm"
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              Log In as Ikerlan
            </Button>
            <Button
              onClick={() => handleQuickLogin("Ederlan")}
              size="sm"
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              Log In as Ederlan
            </Button>
            <Button
              onClick={() => handleQuickLogin("Gestamp")}
              size="sm"
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              Log In as Gestamp
            </Button>
            <Button
              onClick={() => handleQuickLogin("Bexen")}
              size="sm"
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              Log In as Bexen
            </Button>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-lime-50 border border-lime-200 text-lime-700 rounded-md flex items-center">
            <Check className="w-5 h-5 mr-2 text-lime-500" />
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            {error}
          </div>
        )}

        {!isLoggedIn ? (
          // Login Form
          <div className="max-w-md mx-auto mt-20">
            <Card className="border-t-4 border-t-lime-500">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Sign In</CardTitle>
                <CardDescription className="text-center">
                  Enter your Mondragon Assembly Data Space credentials to access your shared documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="focus-visible:ring-lime-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="focus-visible:ring-lime-500"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-lime-600 hover:bg-lime-700 text-white">
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Documents View
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 border rounded-lg p-6 bg-gray-50 border-t-2 border-t-lime-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium text-lime-700">Shared Documents</h2>
                <Button
                  onClick={refreshDocuments}
                  variant="outline"
                  className="flex items-center gap-2 border-lime-600 text-lime-700 hover:bg-lime-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-lime-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">{doc.name}</p>
                        <p className="text-sm text-gray-500">
                          Shared by Mondragon Assembly • {doc.dateCreated}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(doc.name)}
                      className="bg-lime-600 hover:bg-lime-700 text-white flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No documents shared with you yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
