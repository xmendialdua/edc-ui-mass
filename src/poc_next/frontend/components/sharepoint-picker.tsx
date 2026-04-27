'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen, File, ChevronRight, Home, RefreshCw, AlertCircle } from 'lucide-react';
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest } from "@/lib/authConfig";
import { api } from "@/lib/api";
import { createPortal } from 'react-dom';

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  lastModified?: string;
  isFolder: boolean;
  folder?: { childCount: number };
}

interface SharePointPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'file' | 'folder';
  onSelect: (item: SharePointFile) => void;
}

export function SharePointPicker({ open, onOpenChange, mode, onSelect }: SharePointPickerProps) {
  const { instance, accounts } = useMsal();
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<SharePointFile | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we're mounted before rendering portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug log
  useEffect(() => {
    console.log('SharePointPicker mounted, open:', open, 'mode:', mode);
  }, [open, mode]);

  useEffect(() => {
    if (open && !accessToken) {
      console.log('Attempting login, accounts:', accounts.length);
      handleLogin();
    }
  }, [open, accessToken, accounts.length]);

  const handleLogin = async () => {
    console.log('handleLogin called, accounts:', accounts.length);
    if (accounts.length === 0) {
      console.log('No accounts, showing login popup...');
      try {
        const response = await instance.loginPopup(loginRequest);
        console.log('Login successful, got token');
        if (response.accessToken) {
          setAccessToken(response.accessToken);
          await loadFiles(response.accessToken);
        }
      } catch (error) {
        console.error('Login error:', error);
        setError('Error al iniciar sesión en Azure AD');
      }
    } else {
      console.log('Account exists, acquiring token silently...');
      const request = {
        ...loginRequest,
        account: accounts[0]
      };

      try {
        const response = await instance.acquireTokenSilent(request);
        console.log('Silent token acquisition successful');
        setAccessToken(response.accessToken);
        await loadFiles(response.accessToken);
      } catch (error) {
        console.log('Silent token failed, trying popup...');
        if (error instanceof InteractionRequiredAuthError) {
          try {
            const response = await instance.acquireTokenPopup(request);
            console.log('Popup token acquisition successful');
            setAccessToken(response.accessToken);
            await loadFiles(response.accessToken);
          } catch (popupError) {
            console.error('Popup error:', popupError);
            setError('Error al obtener token de acceso');
          }
        } else {
          console.error('Token error:', error);
          setError('Error al obtener token de acceso');
        }
      }
    }
  };

  const loadFiles = async (token: string, folderId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading files, folderId:', folderId);
      // Note: listFiles takes (accessToken, driveId, folderId)
      // We pass undefined for driveId to use the default one
      const result = await api.sharepoint.listFiles(token, undefined, folderId);
      
      console.log('API result:', result);
      
      if (result.items) {
        // Filtrar según el modo
        const filteredFiles = mode === 'folder' 
          ? result.items.filter((f: SharePointFile) => f.isFolder)
          : result.items;
        
        console.log('Filtered files:', filteredFiles.length);
        setFiles(filteredFiles);
      } else {
        setError('Error al cargar archivos');
      }
    } catch (err: any) {
      console.error('Error loading files:', err);
      setError(`Error al cargar archivos: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (file: SharePointFile) => {
    if (file.isFolder) {
      setFolderPath([...folderPath, file.name]);
      await loadFiles(accessToken, file.id);
    }
  };

  const handleBreadcrumbClick = async (index: number) => {
    const newPath = folderPath.slice(0, index);
    setFolderPath(newPath);
    
    if (index === 0) {
      await loadFiles(accessToken);
    }
  };

  const handleItemClick = (file: SharePointFile) => {
    if (mode === 'folder' && file.isFolder) {
      setSelectedItem(file);
    } else if (mode === 'file' && !file.isFolder) {
      setSelectedItem(file);
    }
  };

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onOpenChange(false);
      setSelectedItem(null);
      setFolderPath([]);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  console.log('SharePointPicker rendering, open:', open, 'mode:', mode);

  // Don't render on server or if not mounted
  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  const modalContent = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ 
        maxWidth: '800px', 
        maxHeight: '80vh', 
        display: 'flex', 
        flexDirection: 'column',
        zIndex: 10000,
        position: 'fixed'
      }}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'folder' ? '📁 Seleccionar Carpeta de SharePoint' : '📄 Seleccionar Archivo de SharePoint'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'folder' 
              ? 'Navega y selecciona una carpeta de SharePoint'
              : 'Navega y selecciona un archivo de SharePoint'}
          </DialogDescription>
        </DialogHeader>

        {/* Loading/Authentication State */}
        {!accessToken && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#f9fafb',
            borderRadius: '6px'
          }}>
            <RefreshCw size={32} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#6b7280', marginBottom: '8px' }}>Autenticando con Azure AD...</p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              Si aparece una ventana popup, por favor autoriza el acceso
            </p>
          </div>
        )}

        {/* Main content - only show when authenticated */}
        {accessToken && (
          <>
            {/* Breadcrumb */}
            <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '6px',
          fontSize: '14px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleBreadcrumbClick(0)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: folderPath.length === 0 ? '#3b82f6' : 'transparent',
              color: folderPath.length === 0 ? 'white' : '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Home size={16} />
            IKDataSpace
          </button>
          
          {folderPath.map((folder, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChevronRight size={16} color="#9ca3af" />
              <button
                onClick={() => handleBreadcrumbClick(index + 1)}
                style={{
                  padding: '4px 8px',
                  background: index === folderPath.length - 1 ? '#3b82f6' : 'transparent',
                  color: index === folderPath.length - 1 ? 'white' : '#3b82f6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {folder}
              </button>
            </div>
          ))}

          <button
            onClick={() => loadFiles(accessToken, folderPath.length > 0 ? files[0]?.id : undefined)}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={20} color="#dc2626" />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Files List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          minHeight: '300px'
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '300px',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <RefreshCw size={32} color="#3b82f6" className="animate-spin" />
              <p style={{ color: '#6b7280' }}>Cargando archivos...</p>
            </div>
          ) : files.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '300px',
              color: '#9ca3af'
            }}>
              <p>No hay {mode === 'folder' ? 'carpetas' : 'archivos'} disponibles</p>
            </div>
          ) : (
            <div style={{ padding: '8px' }}>
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => file.isFolder ? handleFolderClick(file) : handleItemClick(file)}
                  onDoubleClick={() => !file.isFolder && mode === 'file' && handleItemClick(file)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: selectedItem?.id === file.id ? '#eff6ff' : 'transparent',
                    border: selectedItem?.id === file.id ? '2px solid #3b82f6' : '2px solid transparent',
                    transition: 'all 0.2s',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedItem?.id !== file.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedItem?.id !== file.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {file.isFolder ? (
                    <FolderOpen size={24} color="#3b82f6" />
                  ) : (
                    <File size={24} color="#6b7280" />
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.name}
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      color: '#6b7280'
                    }}>
                      {file.isFolder 
                        ? `${file.folder?.childCount || 0} elementos` 
                        : formatFileSize(file.size)}
                    </p>
                  </div>

                  {file.isFolder && (
                    <ChevronRight size={20} color="#9ca3af" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Item Info */}
        {selectedItem && (
          <div style={{
            padding: '12px',
            background: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <p style={{ margin: 0, fontWeight: '600', color: '#1e40af' }}>
              Seleccionado: {selectedItem.name}
            </p>
          </div>
        )}
          </>
        )}

        {/* Footer Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px' }}>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedItem(null);
              setFolderPath([]);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedItem}
            style={{
              background: selectedItem ? '#3b82f6' : '#e5e7eb',
              color: selectedItem ? 'white' : '#9ca3af'
            }}
          >
            Seleccionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render using portal to attach to body directly
  return createPortal(modalContent, document.body);
}
