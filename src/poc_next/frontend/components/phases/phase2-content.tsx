'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Package, Plus, RefreshCw, Trash2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Asset {
  '@id': string;
  properties?: {
    name?: string;
    description?: string;
    contenttype?: string;
    [key: string]: any;
  };
  dataAddress?: any;
}

interface Phase2ContentProps {
  onLog?: (message: string) => void;
}

const Phase2Content = forwardRef<any, Phase2ContentProps>(({ onLog }, ref) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAssetId, setNewAssetId] = useState('');

  const log = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  async function loadAssets() {
    setLoading('list');
    console.log('[Phase2] Iniciando carga de assets...');
    log('🔄 Cargando assets...');
    try {
      const result = await api.phase2.listAssets();
      console.log('[Phase2] Assets recibidos:', result.assets);
      setAssets(result.assets || []);
      log(`✅ ${result.assets?.length || 0} asset(s) cargado(s)`);
    } catch (error) {
      console.error('[Phase2] Error al cargar assets:', error);
      log(`❌ Error al cargar assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleCreateAsset() {
    if (!newAssetId.trim()) {
      alert('Por favor ingresa un Asset ID');
      return;
    }

    setLoading('create');
    log(`🔨 Creando asset: ${newAssetId}`);
    try {
      await api.phase2.createAsset(newAssetId);
      log(`✅ Asset creado: ${newAssetId}`);
      setShowCreateDialog(false);
      setNewAssetId('');
      setTimeout(() => loadAssets(), 1000);
    } catch (error) {
      log(`❌ Error al crear asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteAsset(assetId: string) {
    if (!confirm(`¿Estás seguro de eliminar el asset "${assetId}"?`)) {
      return;
    }

    setLoading('delete');
    log(`🗑️ Eliminando asset: ${assetId}`);
    try {
      await api.phase2.deleteAsset(assetId);
      log(`✅ Asset eliminado: ${assetId}`);
      setTimeout(() => loadAssets(), 1000);
    } catch (error) {
      log(`❌ Error al eliminar asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  async function handlePublishSelected() {
    if (selectedAssets.size === 0) {
      alert('Selecciona al menos un asset para publicar');
      return;
    }

    setLoading('publish');
    const assetList = Array.from(selectedAssets).join(', ');
    log(`📤 Publicando ${selectedAssets.size} asset(s) seleccionado(s): ${assetList}`);
    
    // Simular publicación
    setTimeout(() => {
      log(`✅ Assets publicados correctamente`);
      setSelectedAssets(new Set());
      setLoading(null);
    }, 2000);
  }

  function toggleAssetSelection(assetId: string) {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  }

  function toggleAssetExpansion(assetId: string) {
    setExpandedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  }

  useEffect(() => {
    loadAssets();
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: loadAssets
  }));

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };

  const greenButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: 'white',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Actions Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        paddingBottom: '20px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={loading !== null}
          style={greenButtonStyle}
        >
          <Plus size={16} />
          Crear Nuevo Asset
        </button>
        <button
          onClick={handlePublishSelected}
          disabled={loading !== null || selectedAssets.size === 0}
          style={primaryButtonStyle}
        >
          <Upload size={16} />
          {loading === 'publish' ? 'Publicando...' : `Publicar Seleccionados (${selectedAssets.size})`}
        </button>
      </div>

      {/* Assets Grid - 4 columns */}
      {assets.length === 0 && !loading ? (
        <div style={{
          background: '#f8f9fa',
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div>No hay assets publicados</div>
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            Haz clic en &quot;Crear Nuevo Asset&quot; para comenzar
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {assets.map((asset) => {
            const isSelected = selectedAssets.has(asset['@id']);
            const isExpanded = expandedAssets.has(asset['@id']);
            
            return (
              <div
                key={asset['@id']}
                style={{
                  background: isSelected ? '#e0e7ff' : '#f8f9fa',
                  border: `2px solid ${isSelected ? '#667eea' : '#ddd'}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Asset Card Content */}
                <div style={{ padding: '15px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: "'Courier New', monospace",
                        marginBottom: '6px',
                        wordBreak: 'break-word'
                      }}>
                        {asset['@id']}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                      {/* Expand/Collapse Icon */}
                      <button
                        onClick={() => toggleAssetExpansion(asset['@id'])}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#667eea',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#5568d3';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#667eea';
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAssetSelection(asset['@id'])}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#667eea'
                        }}
                      />
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteAsset(asset['@id'])}
                        disabled={loading !== null}
                        style={{
                          background: 'transparent',
                          color: '#dc3545',
                          padding: '2px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#c82333';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#dc3545';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {asset.properties?.description && (
                    <div style={{
                      fontSize: '10px',
                      color: '#666',
                      marginBottom: '4px',
                      lineHeight: '1.3'
                    }}>
                      {asset.properties.description}
                    </div>
                  )}
                </div>

                {/* Expanded Panel - Data Address */}
                {isExpanded && (
                  <div style={{
                    background: '#fafafa',
                    borderTop: '1px solid #e0e0e0',
                    padding: '12px'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#667eea',
                      marginBottom: '8px'
                    }}>
                      📊 Data Address
                    </div>
                    <div style={{
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '9px',
                      fontFamily: "'Courier New', monospace",
                      maxHeight: '150px',
                      overflowY: 'auto',
                      wordBreak: 'break-all'
                    }}>
                      {asset.dataAddress ? (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(asset.dataAddress, null, 2)}
                        </pre>
                      ) : (
                        <div style={{ color: '#999' }}>
                          {JSON.stringify(asset, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Asset Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Asset</DialogTitle>
            <DialogDescription>
              Ingresa el ID del asset a crear. Se creará con metadata predeterminada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assetId">Asset ID</Label>
              <Input
                id="assetId"
                placeholder="pdf-dummy-mass-ikln"
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateAsset();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAsset} disabled={loading !== null}>
              {loading === 'create' ? 'Creando...' : 'Crear Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Phase2Content.displayName = 'Phase2Content';
export default Phase2Content;

