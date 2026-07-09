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
  partnerDetails?: {
    bpn: string;
    management_url: string;
  } | null;
}

const Phase5Content = forwardRef<{ refresh: () => void }, Phase5ContentProps>(({ onLog, onNegotiationComplete, partnerDetails }, ref) => {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

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
      const result = await api.phase6.catalogRequest(
        partnerDetails?.bpn,
        partnerDetails?.management_url
      );
      setDatasets(result.datasets || []);
      if (result.logs) {
        result.logs.forEach(log => addLog(log));
      }
      if (result.datasets && result.datasets.length > 0) {
        addLog(`✅ ${result.datasets.length} dataset(s) encontrado(s)`);
      }
      // When 0 datasets: the backend already emits diagnostic logs explaining why,
      // so we don't add a generic warning here — the details are already in result.logs
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

  const toggleAssetExpansion = (offerId: string) => {
    setExpandedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(offerId)) {
        newSet.delete(offerId);
      } else {
        newSet.add(offerId);
      }
      return newSet;
    });
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
        policy: policy,
        consumerBpn: partnerDetails?.bpn,
        consumerManagementUrl: partnerDetails?.management_url
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

  // Auto-load catalog when partnerDetails is available
  useEffect(() => {
    if (partnerDetails?.bpn && partnerDetails?.management_url) {
      setDatasets([]); // Clear old catalog data
      setLoading(true);
      handleCatalogRequest();
    } else {
      // No partner details yet, clear data
      setDatasets([]);
    }
  }, [partnerDetails?.bpn, partnerDetails?.management_url]);

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

      {/* Assets from all datasets - MOSTRADOS PRIMERO */}
      {!loading && datasets.length > 0 && (
        <div className="space-y-3">
          {datasets.map((dataset, datasetIndex) => {
            const datasetId = dataset['@id'] || `dataset-${datasetIndex}`;
            const offers = getOffers(dataset);
            const datasetName = dataset['name'] || dataset['dct:title'] || dataset['@id'] || 'Dataset';
            
            if (offers.length === 0 || !offers[0]) {
              return null;
            }

            return (
              <div key={datasetId} className="space-y-3">
                {offers.map((offer, index) => {
                  const offerId = offer['@id'] || `offer-${index}`;
                  const assetId = offer['odrl:target'] || datasetId;
                  const assetName = dataset['name'] || dataset['dct:title'] || dataset['@id'] || 'Asset';
                  const assetDescription = dataset['description'] || dataset['dct:description'] || '';
                  const isExpanded = expandedAssets.has(offerId);
                  
                  // Truncar descripción a 2 líneas (aproximadamente 120 caracteres)
                  const truncatedDescription = assetDescription.length > 120 
                    ? assetDescription.substring(0, 120) + '...' 
                    : assetDescription;
                  
                  return (
                    <div 
                      key={offerId} 
                      style={{
                        background: '#f5f3ff',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        border: '2px solid #7c3aed',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Header plegable - siempre visible */}
                      <div
                        style={{
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div 
                          onClick={() => toggleAssetExpansion(offerId)}
                          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                        >
                          <div style={{ 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#5b21b6',
                            marginBottom: '6px',
                            fontFamily: 'monospace',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}>
                            {assetId}
                          </div>
                          {!isExpanded && assetDescription && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280',
                              lineHeight: '1.4',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}>
                              {truncatedDescription}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNegotiate(assetId, offer);
                            }}
                            style={{
                              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '5px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(90deg, #059669 0%, #047857 100%)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
                            }}
                          >
                            🤝 Negotiate
                          </button>
                          <div 
                            onClick={() => toggleAssetExpansion(offerId)}
                            style={{ paddingTop: '2px', cursor: 'pointer' }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" style={{ color: '#7c3aed' }} />
                            ) : (
                              <ChevronDown className="h-5 w-5" style={{ color: '#7c3aed' }} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contenido expandido */}
                      {isExpanded && (
                        <div style={{ 
                          borderTop: '1px solid #e9d5ff', 
                          padding: '16px',
                          background: 'white'
                        }}>
                          <div style={{ marginBottom: '16px' }}>
                            {assetDescription && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#4b5563', 
                                marginBottom: '12px',
                                lineHeight: '1.5',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                              }}>
                                <span style={{ fontWeight: 'bold', color: '#374151' }}>Description: </span>
                                <span>{assetDescription}</span>
                              </div>
                            )}
                            <div style={{ 
                              fontSize: '11px',
                              marginBottom: '8px'
                            }}>
                              <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Contract ID: </span>
                              <span style={{ 
                                fontFamily: 'monospace', 
                                color: '#6b7280',
                                wordBreak: 'break-all',
                                lineHeight: '1.5'
                              }}>
                                {offerId}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Datasets Cards - MOSTRADOS DESPUÉS */}
      {!loading && datasets.length > 0 && (
        <div className="space-y-3 mt-8">
          <h3 className="text-base font-semibold" style={{ color: '#1f2937' }}>Datasets</h3>
          <div className="space-y-3">
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
    </div>
  );
});

Phase5Content.displayName = 'Phase5Content';

export default Phase5Content;
