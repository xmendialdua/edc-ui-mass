'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { api } from '@/lib/api';
import { Search, Package, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface Dataset {
  '@id': string;
  '@type': string;
  'odrl:hasPolicy'?: any;
  'dcat:distribution'?: any[];
  offers?: any[];
  name?: string;
  'dct:title'?: string;
  description?: string;
  'dct:description'?: string;
}

interface Offer {
  '@id'?: string;
  'odrl:target'?: string;
  [key: string]: any;
}

interface Phase5ContentProps {
  onLog?: (message: string) => void;
}

const Phase5Content = forwardRef<{ refresh: () => void }, Phase5ContentProps>(({ onLog }, ref) => {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isDetailExpanded, setIsDetailExpanded] = useState(true);

  const addLog = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  async function handleCatalogRequest() {
    setLoading(true);
    setSelectedDataset(null);
    addLog('🔍 Consultando catálogo de MASS...');
    try {
      const result = await api.phase5.catalogRequest();
      setDatasets(result.datasets || []);
      if (result.logs) {
        result.logs.forEach(log => addLog(log));
      }
      if (result.datasets && result.datasets.length > 0) {
        addLog(`✅ ${result.datasets.length} dataset(s) encontrado(s)`);
      } else {
        addLog('⚠️ No se encontraron datasets en el catálogo');
      }
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsDetailExpanded(true);
    const datasetId = dataset['@id'] || 'unknown';
    addLog(`📦 Dataset seleccionado: ${datasetId}`);
    const offers = getOffers(dataset);
    addLog(`📦 ${offers.length} asset(s) disponibles`);
  };

  const getOffers = (dataset: Dataset): Offer[] => {
    const offersRaw = dataset['odrl:hasPolicy'] || [];
    return Array.isArray(offersRaw) ? offersRaw : [offersRaw];
  };

  const handleNegotiate = async (assetId: string, policy: any) => {
    addLog(`🤝 Iniciando negociación para asset: ${assetId}`);
    console.log('Negociando asset:', assetId, policy);
    // TODO: Implement negotiation logic
    alert(`Negociación iniciada para asset: ${assetId}`);
  };

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: handleCatalogRequest
  }));

  // Auto-load catalog on mount
  useEffect(() => {
    handleCatalogRequest();
  }, []);

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Consultando catálogo MASS...</p>
          </div>
        </div>
      )}

      {/* Datasets Cards */}
      {!loading && datasets.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-3">
            {datasets.map((dataset, index) => {
              const datasetId = dataset['@id'] || `dataset-${index}`;
              const offers = getOffers(dataset);
              const isSelected = selectedDataset?.['@id'] === dataset['@id'];
              
              return (
                <div
                  key={datasetId}
                  onClick={() => handleSelectDataset(dataset)}
                  style={{
                    background: isSelected ? '#e0f2fe' : '#eff6ff',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 6px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e40af' }}>
                      {datasetId}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                      {offers.length === 0 || !offers[0] ? 'undefined offer(s)' : `${offers.length} offer(s)`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && datasets.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay datasets disponibles en el catálogo</p>
          </div>
        </div>
      )}

      {/* Assets in Dataset */}
      {selectedDataset && (
        <div className="space-y-4 mt-6">
          <h3 className="text-base font-semibold" style={{ color: '#1f2937' }}>Assets in Dataset</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {(() => {
              const offers = getOffers(selectedDataset);
              const datasetName = selectedDataset['name'] || selectedDataset['dct:title'] || selectedDataset['@id'] || 'Asset';
              const datasetDescription = selectedDataset['description'] || selectedDataset['dct:description'] || 'Asset disponible en el catálogo';
              const datasetId = selectedDataset['@id'] || 'unknown';
              
              if (offers.length === 0 || !offers[0]) {
                return (
                  <div className="text-center p-8 text-muted-foreground" style={{ gridColumn: '1 / -1' }}>
                    No hay assets en este dataset
                  </div>
                );
              }
              
              return offers.map((offer, index) => {
                const offerId = offer['@id'] || `offer-${index}`;
                const assetId = offer['odrl:target'] || datasetId;
                
                return (
                  <div 
                    key={offerId} 
                    style={{
                      background: 'white',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                      display: 'flex',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    {/* Left colored bar */}
                    <div style={{
                      width: '4px',
                      background: 'linear-gradient(180deg, #6366f1 0%, #a855f7 100%)',
                      flexShrink: 0
                    }}></div>
                    
                    {/* Icon area */}
                    <div style={{
                      width: '45px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #ddd6fe 0%, #e9d5ff 100%)',
                      flexShrink: 0,
                      padding: '8px 4px'
                    }}>
                      <FileText style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    </div>
                    
                    {/* Content */}
                    <div style={{ flex: 1, padding: '10px 12px' }}>
                      <h3 style={{ 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        marginTop: 0,
                        marginBottom: '3px',
                        color: '#1f2937',
                        lineHeight: '1.2'
                      }}>
                        {datasetName}
                      </h3>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#6b7280', 
                        marginBottom: '8px',
                        marginTop: 0,
                        lineHeight: '1.3'
                      }}>
                        {datasetDescription}
                      </p>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ 
                          fontSize: '11px', 
                          marginBottom: '2px'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#4b5563' }}>ID: </span>
                          <span style={{ fontFamily: 'monospace', color: '#374151' }}>{assetId}</span>
                        </div>
                        <div style={{ 
                          fontSize: '11px'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Contract ID: </span>
                          <span style={{ 
                            fontFamily: 'monospace', 
                            color: '#374151',
                            wordBreak: 'break-word',
                            lineHeight: '1.5',
                            display: 'inline'
                          }}>
                            {offerId}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleNegotiate(assetId, offer)}
                        style={{
                          background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          padding: '5px 12px',
                          borderRadius: '5px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(90deg, #059669 0%, #047857 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
                        }}
                      >
                        Negociar
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Dataset Detail */}
      {selectedDataset && (
        <div className="mt-4" style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div 
            style={{
              padding: '16px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: isDetailExpanded ? '1px solid #e5e7eb' : 'none'
            }}
            onClick={() => setIsDetailExpanded(!isDetailExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Dataset Detail</h3>
            {isDetailExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          {isDetailExpanded && (
            <div style={{ padding: '20px' }}>
              <pre style={{ 
                background: '#f1f5f9', 
                padding: '16px', 
                borderRadius: '6px', 
                fontSize: '11px', 
                overflow: 'auto', 
                maxHeight: '384px',
                margin: 0
              }}>
                {JSON.stringify(selectedDataset, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Phase5Content.displayName = 'Phase5Content';

export default Phase5Content;
