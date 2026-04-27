"use client";

import { useState } from "react";
import { RefreshCw, FolderOpen, File, Download, AlertCircle, Check, XCircle, Info } from "lucide-react";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest } from "@/lib/authConfig";
import { api } from "@/lib/api";

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  lastModified?: string;
  isFolder: boolean;
  folder?: { childCount: number };
}

export default function SharePointDataPage() {
  const { instance, accounts } = useMsal();
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected" | "error" | "authenticating">("disconnected");

  // SharePoint Site URL from environment
  const siteUrl = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL || "";

  // Simple login with popup (exactly like the POC)
  const loginUser = async () => {
    try {
      console.log('=== INICIO LOGIN ===');
      console.log('instance:', instance);
      console.log('loginRequest:', loginRequest);
      console.log('clientId configurado:', process.env.NEXT_PUBLIC_AZURE_CLIENT_ID);
      console.log('tenantId configurado:', process.env.NEXT_PUBLIC_AZURE_TENANT_ID);
      console.log('redirectUri configurado:', process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI);
      
      console.log('Llamando a instance.loginPopup...');
      const result = await instance.loginPopup(loginRequest);
      console.log('Login exitoso:', result);
      
      // After successful login, fetch files using the account from login result
      await fetchFiles(result.account);
    } catch (err: any) {
      console.error('[ERROR] Login failed:', err);
      console.error('[ERROR] Error code:', err.errorCode);
      console.error('[ERROR] Error message:', err.errorMessage);
      setConnectionStatus("error");
      
      if (err.errorCode === "user_cancelled") {
        setError("Autenticación cancelada por el usuario");
      } else {
        setError(`Error de autenticación: ${err.errorMessage || err.message}`);
        setDetailedError(`Código: ${err.errorCode || 'desconocido'}`);
      }
    }
  };

  // Fetch files from SharePoint
  const fetchFiles = async (account?: any) => {
    // Use provided account or get from accounts array
    const activeAccount = account || accounts[0];
    
    if (!activeAccount) {
      setError("Por favor, inicia sesión primero");
      return;
    }

    setLoading(true);
    setError(null);
    setDetailedError(null);
    setConnectionStatus("connected");

    try {
      // Get access token
      const request = {
        ...loginRequest,
        account: activeAccount,
      };

      let tokenResponse;
      try {
        tokenResponse = await instance.acquireTokenSilent(request);
      } catch (silentError: any) {
        if (silentError instanceof InteractionRequiredAuthError) {
          console.log("Silent token acquisition failed, trying popup...");
          tokenResponse = await instance.acquireTokenPopup(request);
        } else {
          throw silentError;
        }
      }

      const token = tokenResponse.accessToken;
      setAccessToken(token);

      // Load files from root folder
      const response = await api.sharepoint.listFilesBySiteUrl(
        token,
        siteUrl
      );

      setFiles(response.items);
      setConnectionStatus("connected");
    } catch (err: any) {
      console.error("Error fetching files:", err);
      setConnectionStatus("error");
      setError(`Error al cargar archivos: ${err.message}`);
      
      if (err.message.includes("401")) {
        setDetailedError("Token no autorizado. Verifica que la aplicación Azure AD tenga los permisos correctos y admin consent.");
      } else if (err.message.includes("403")) {
        setDetailedError("Acceso denegado. El usuario no tiene permisos para este sitio de SharePoint.");
      } else if (err.message.includes("404")) {
        setDetailedError(`Sitio no encontrado: ${siteUrl}`);
      } else {
        setDetailedError(err.message);
      }
      
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFilesWithToken = async (token: string) => {
    if (!siteUrl) {
      setError("URL de SharePoint no configurada");
      setDetailedError("La variable NEXT_PUBLIC_SHAREPOINT_SITE_URL no está definida en .env.local");
      return;
    }

    try {
      const currentPath = folderPath.join('/');
      const response = await api.sharepoint.listFilesBySiteUrl(
        token,
        siteUrl,
        currentPath || undefined
      );

      setFiles(response.items);
      setError(null);
      setDetailedError(null);
    } catch (err: any) {
      console.error("Error loading files:", err);
      setError(`Error al cargar archivos: ${err.message}`);
      
      // Extract more detailed error info
      if (err.message.includes("401")) {
        setDetailedError("Token no autorizado. Verifica que:\n1. La aplicación Azure AD tiene los permisos correctos (Sites.Read.All, Files.Read.All)\n2. El administrador ha otorgado consentimiento (Admin Consent)\n3. El token no ha expirado");
      } else if (err.message.includes("403")) {
        setDetailedError("Acceso denegado. El usuario no tiene permisos para acceder a este sitio de SharePoint.");
      } else if (err.message.includes("404")) {
        setDetailedError(`Sitio de SharePoint no encontrado.\nURL: ${siteUrl}\n\nVerifica que la URL sea correcta y que el sitio exista.`);
      } else {
        setDetailedError(`Detalles técnicos:\n${err.message}`);
      }
      
      setFiles([]);
    }
  };

  const refreshFiles = async () => {
    await fetchFiles();
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES');
  };

  const openFolder = async (folder: SharePointFile) => {
    // TODO: Implement folder navigation with item_id instead of path
    console.log('Folder navigation not yet implemented:', folder.name);
    return;
  };

  const goToParentFolder = async () => {
    // TODO: Implement folder navigation
    console.log('Parent folder navigation not yet implemented');
    return;
  };

  const downloadFile = async (file: SharePointFile) => {
    if (file.isFolder) return;

    try {
      setLoading(true);
      const { blob, filename } = await api.sharepoint.downloadFile(
        accessToken,
        file.id
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(`Error al descargar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    instance.logoutPopup();
    setAccessToken("");
    setFiles([]);
    setConnectionStatus("disconnected");
    setError(null);
    setDetailedError(null);
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: "#f5f7fa",
      minHeight: "100vh",
      padding: "20px"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "40px",
        borderRadius: "12px",
        marginBottom: "30px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "600" }}>
          📁 SharePoint Data Browser
        </h1>
        <p style={{ margin: "10px 0 0 0", opacity: 0.9, fontSize: "16px" }}>
          Explora y descarga archivos de SharePoint: {siteUrl || "No configurado"}
        </p>
      </div>

      {/* Configuration Panel */}
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        marginBottom: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
      }}>
        <h2 style={{ marginTop: 0, fontSize: "20px", color: "#2d3748" }}>
          Configuración de Acceso
        </h2>

        {/* Connection Status */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          padding: "12px",
          background: connectionStatus === 'connected' ? '#f0fdf4' : 
                      connectionStatus === 'error' ? '#fef2f2' : 
                      connectionStatus === 'authenticating' ? '#fef3c7' : '#f9fafb',
          borderRadius: "8px",
          border: `1px solid ${connectionStatus === 'connected' ? '#86efac' : 
                                 connectionStatus === 'error' ? '#fca5a5' : 
                                 connectionStatus === 'authenticating' ? '#fcd34d' : '#e5e7eb'}`
        }}>
          {connectionStatus === 'connected' && <Check size={20} color="#16a34a" />}
          {connectionStatus === 'error' && <XCircle size={20} color="#dc2626" />}
          {connectionStatus === 'authenticating' && <RefreshCw size={20} color="#f59e0b" className="animate-spin" />}
          {connectionStatus === 'disconnected' && <AlertCircle size={20} color="#6b7280" />}
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: "500", color: "#374151", display: "block" }}>
              Estado: {connectionStatus === 'connected' ? 'Conectado' : 
                      connectionStatus === 'error' ? 'Error de conexión' : 
                      connectionStatus === 'authenticating' ? 'Autenticando...' :
                      'No conectado'}
            </span>
            {accounts.length > 0 && (
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                Usuario: {accounts[0].username}
              </span>
            )}
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            {accounts.length === 0 ? (
              <button
                onClick={loginUser}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: loading ? 0.5 : 1
                }}
              >
                Iniciar Sesión
              </button>
            ) : (
              <>
                <button
                  onClick={refreshFiles}
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    opacity: loading ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <RefreshCw size={16} />
                  Recargar
                </button>
                <button
                  onClick={logout}
                  style={{
                    padding: "8px 16px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Cerrar Sesión
                </button>
              </>
            )}
          </div>
        </div>

        {/* Configuration Info */}
        <div style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: error ? "15px" : "0"
        }}>
          <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
            <Info size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "13px", color: "#1e40af" }}>
              <strong>Configuración Actual:</strong><br />
              Client ID: {process.env.NEXT_PUBLIC_AZURE_CLIENT_ID?.substring(0, 8)}...<br />
              Tenant ID: {process.env.NEXT_PUBLIC_AZURE_TENANT_ID?.substring(0, 8)}...<br />
              Redirect URI: {process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI}<br />
              SharePoint Site: {siteUrl || "❌ No configurado"}
            </div>
          </div>
        </div>
      </div>

      {/* Error Panel */}
      {error && (
        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          border: "2px solid #fca5a5"
        }}>
          <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
            <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#dc2626", fontSize: "18px" }}>
                Error
              </h3>
              <p style={{ margin: "0 0 10px 0", color: "#374151", fontWeight: "500" }}>
                {error}
              </p>
              {detailedError && (
                <div style={{
                  background: "#fef2f2",
                  padding: "12px",
                  borderRadius: "6px",
                  marginTop: "10px"
                }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#7f1d1d", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                    {detailedError}
                  </p>
                </div>
              )}
              <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    setError(null);
                    setDetailedError(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cerrar
                </button>
                {accounts.length === 0 && (
                  <button
                    onClick={loginUser}
                    style={{
                      padding: "8px 16px",
                      background: "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    Reintentar Autenticación
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      {connectionStatus === 'connected' && !error && (
        <div style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", color: "#2d3748" }}>
              Archivos y Carpetas ({files.length})
            </h2>
            {folderPath.length > 0 && (
              <button
                onClick={goToParentFolder}
                style={{
                  padding: "8px 16px",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                ← Volver
              </button>
            )}
          </div>

          {/* Breadcrumb */}
          {folderPath.length > 0 && (
            <div style={{ marginBottom: "15px", fontSize: "14px", color: "#6b7280" }}>
              <span>📂 Ruta: / {folderPath.join(' / ')}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 10px" }} />
              <p>Cargando archivos...</p>
            </div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <FolderOpen size={48} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
              <p>No hay archivos en esta carpeta</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontWeight: "600" }}>Nombre</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontWeight: "600" }}>Tamaño</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontWeight: "600" }}>Modificado</th>
                    <th style={{ padding: "12px", textAlign: "right", color: "#6b7280", fontWeight: "600" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        cursor: file.isFolder ? "pointer" : "default"
                      }}
                      onClick={() => file.isFolder && openFolder(file)}
                    >
                      <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                        {file.isFolder ? <FolderOpen size={20} color="#667eea" /> : <File size={20} color="#6b7280" />}
                        <span style={{ color: "#374151", fontWeight: file.isFolder ? "500" : "normal" }}>
                          {file.name}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: "#6b7280" }}>
                        {formatFileSize(file.size)}
                      </td>
                      <td style={{ padding: "12px", color: "#6b7280", fontSize: "14px" }}>
                        {formatDate(file.lastModified)}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {!file.isFolder && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                            style={{
                              padding: "6px 12px",
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Download size={14} />
                            Descargar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
