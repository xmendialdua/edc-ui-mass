'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { api } from '@/lib/api';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';

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
  onNegotiationComplete?: () => void;
}

const Phase5Content = forwardRef<{ refresh: () => void }, Phase5ContentProps>(({ onLog, onNegotiationComplete }, ref) => {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());

  const addLog = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  async function handleCatalogRequest() {
    setLoading(true);
    setExpandedDatasets(new Set());
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

  const toggleDatasetExpansion = (datasetId: string) => {
    setExpandedDatasets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(datasetId)) {
        newSet.delete(datasetId);
      } else {
        newSet.add(datasetId);
      }
      return newSet;
    });
    const datasetName = datasets.find(d => d['@id'] === datasetId)?.['@id'] || datasetId;
    addLog(`📦 Dataset ${expandedDatasets.has(datasetId) ? 'colapsado' : 'expandido'}: ${datasetName}`);
  };

  const getOffers = (dataset: Dataset): Offer[] => {
    const offersRaw = dataset['odrl:hasPolicy'] || [];
    return Array.isArray(offersRaw) ? offersRaw : [offersRaw];
  };

  const handleNegotiate = async (assetId: string, policy: any) => {
    addLog(`🤝 Iniciando negociación para asset: ${assetId}`);
    try {
      const result = await api.phase6.negotiate({
        assetId: assetId,
        policy: policy
      });
      
      if (result.logs) {
        result.logs.forEach(log => addLog(log));
      }
      
      if (result.success) {
        addLog(`✅ Negociación iniciada exitosamente para asset: ${assetId}`);
        
        // Refrescar el panel de negociaciones después de 2 segundos
        setTimeout(() => {
          if (onNegotiationComplete) {
            onNegotiationComplete();
          }
        }, 2000);
      } else {
        addLog(`⚠️ La negociación no se completó correctamente`);
      }
    } catch (error) {
      addLog(`❌ Error al negociar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
          <h3 className="text-base font-semibold" style={{ color: '#1f2937' }}>Datasets</h3>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {datasets.map((dataset, index) => {
              const datasetId = dataset['@id'] || `dataset-${index}`;
              const offers = getOffers(dataset);
              const isExpanded = expandedDatasets.has(datasetId);
              
              return (
                <div
                  key={datasetId}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Dataset Header - clickable */}
                  <div
                    onClick={() => toggleDatasetExpansion(datasetId)}
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e40af' }}>
                        {datasetId}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {offers.length === 0 || !offers[0] ? 'undefined offer(s)' : `${offers.length} offer(s)`}
                      </div>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" style={{ color: '#64748b' }} />
                      ) : (
                        <ChevronDown className="h-5 w-5" style={{ color: '#64748b' }} />
                      )}
                    </div>
                  </div>

                  {/* Dataset Detail - always shown when expanded */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #bfdbfe', padding: '12px 16px', background: 'white' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000', marginBottom: '8px' }}>
                        Dataset Detail
                      </div>
                      <pre style={{ 
                        background: '#f1f5f9', 
                        padding: '12px', 
                        borderRadius: '4px', 
                        fontSize: '10px', 
                        overflow: 'auto', 
                        maxHeight: '200px',
                        margin: 0
                      }}>
                        {JSON.stringify(dataset, null, 2)}
                      </pre>
                    </div>
                  )}
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

      {/* Assets from all datasets */}
      {!loading && datasets.length > 0 && (
        <div className="space-y-6 mt-6">
          {datasets.map((dataset, datasetIndex) => {
            const datasetId = dataset['@id'] || `dataset-${datasetIndex}`;
            const offers = getOffers(dataset);
            const datasetName = dataset['name'] || dataset['dct:title'] || dataset['@id'] || 'Dataset';
            
            if (offers.length === 0 || !offers[0]) {
              return null;
            }

            return (
              <div key={datasetId} className="space-y-3">
                <h3 className="text-base font-semibold" style={{ color: '#1f2937' }}>
                  Assets in {datasetName}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {offers.map((offer, index) => {
                    const offerId = offer['@id'] || `offer-${index}`;
                    const assetId = offer['odrl:target'] || datasetId;
                    const assetName = dataset['name'] || dataset['dct:title'] || dataset['@id'] || 'Asset';
                    const assetDescription = dataset['description'] || dataset['dct:description'] || 'Asset disponible en el catálogo';
                    
                    return (
                      <div 
                        key={offerId} 
                        style={{
                          background: '#f5f3ff',
                          borderRadius: '6px',
                          padding: '16px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                          border: '2px solid #7c3aed',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Content */}
                        <div style={{ flex: 1, marginBottom: '12px' }}>
                          <div style={{ marginBottom: 0 }}>
                            <div style={{ 
                              fontSize: '11px', 
                              marginBottom: '6px'
                            }}>
                              <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Asset ID: </span>
                              <span style={{ fontFamily: 'monospace', color: '#374151' }}>{assetId}</span>
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '6px',
                              lineHeight: '1.4'
                            }}>
                              <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Description: </span>
                              <span>{assetDescription}</span>
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
                        </div>
                        
                        {/* Button aligned to bottom right */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleNegotiate(assetId, offer)}
                            style={{
                              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              padding: '6px 14px',
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
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

Phase5Content.displayName = 'Phase5Content';

export default Phase5Content;
