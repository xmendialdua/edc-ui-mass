'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { api } from '@/lib/api';
import { Search } from 'lucide-react';

interface Transfer {
  id: string;
  assetId: string;
  state: 'REQUESTED' | 'STARTED' | 'COMPLETED' | 'SUSPENDED' | 'TERMINATED';
  createdAt?: string;
  stateTimestamp?: string;
  edrAvailable: boolean;
  edrEndpoint?: string;
  edrToken?: string;
}

interface TransfersContentProps {
  onLog?: (message: string) => void;
}

const TransfersContent = forwardRef<{ refresh: () => void }, TransfersContentProps>(
  ({ onLog }, ref) => {
    const [loading, setLoading] = useState(false);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [autoRefreshCount, setAutoRefreshCount] = useState(0);

    const addLog = (message: string) => {
      if (onLog) {
        onLog(message);
      }
    };

    async function fetchTransfers() {
      setLoading(true);
      addLog('🔍 Consultando transferencias...');
      try {
        const result = await api.phase6.listTransfers();
        setTransfers(result.transfers || []);
        if (result.logs) {
          result.logs.forEach(log => addLog(log));
        }
        addLog(`✅ ${result.transfers?.length || 0} transferencia(s) encontrada(s)`);
      } catch (error) {
        addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTransfers([]);
      } finally {
        setLoading(false);
      }
    }

    useImperativeHandle(ref, () => ({
      refresh: () => {
        fetchTransfers();
        setAutoRefreshCount(0); // Reset counter on manual refresh
      }
    }));

    useEffect(() => {
      fetchTransfers();
    }, []);

    // Auto-refresh effect: refresh every 5 seconds if there are transfers without EDR (max 10 times)
    useEffect(() => {
      const hasTransfersWithoutEdr = transfers.some(
        t => (t.state === 'STARTED' || t.state === 'REQUESTED') && !t.edrAvailable
      );

      if (hasTransfersWithoutEdr && autoRefreshCount < 10) {
        const timer = setTimeout(() => {
          addLog('🔄 Auto-refrescando para verificar EDRs...');
          fetchTransfers();
          setAutoRefreshCount(prev => prev + 1);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }, [transfers, autoRefreshCount]);

    const getStateBadgeColor = (state: string, edrAvailable: boolean) => {
      // Show FINALIZED when transfer is STARTED/COMPLETED and EDR is available
      if ((state === 'STARTED' || state === 'COMPLETED') && edrAvailable) {
        return { bg: '#3b82f6', color: 'white', label: 'FINALIZED' };
      }
      
      switch (state) {
        case 'STARTED':
          return { bg: '#f59e0b', color: 'white', label: 'EN PROGRESO' };
        case 'COMPLETED':
          return { bg: '#3b82f6', color: 'white', label: 'COMPLETADA' };
        case 'REQUESTED':
          return { bg: '#8b5cf6', color: 'white', label: 'SOLICITADA' };
        case 'SUSPENDED':
        case 'TERMINATED':
          return { bg: '#ef4444', color: 'white', label: state };
        default:
          return { bg: '#6b7280', color: 'white', label: state };
      }
    };

    const getCardBorderColor = (state: string, edrAvailable: boolean) => {
      if ((state === 'STARTED' || state === 'COMPLETED') && edrAvailable) {
        return '#3b82f6'; // Blue for finalized
      }
      
      switch (state) {
        case 'STARTED':
          return '#f59e0b'; // Orange for in progress
        case 'COMPLETED':
          return '#3b82f6';
        case 'REQUESTED':
          return '#8b5cf6'; // Purple for requested
        case 'SUSPENDED':
        case 'TERMINATED':
          return '#ef4444';
        default:
          return '#d1d5db';
      }
    };

    const getCardBackground = (state: string, edrAvailable: boolean) => {
      if ((state === 'STARTED' || state === 'COMPLETED') && edrAvailable) {
        return '#eff6ff'; // Blue background for finalized
      }
      
      switch (state) {
        case 'STARTED':
          return '#fffbeb'; // Yellow background for in progress
        case 'COMPLETED':
          return '#eff6ff';
        case 'REQUESTED':
          return '#faf5ff'; // Purple background for requested
        case 'SUSPENDED':
        case 'TERMINATED':
          return '#fef2f2';
        default:
          return '#ffffff';
      }
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleString('es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch {
        return dateString;
      }
    };

    const handleDebugTransfer = (transferId: string) => {
      addLog(`🔍 Depurando transferencia: ${transferId}`);
      alert(`Debug de transferencia: ${transferId}\nEsta funcionalidad mostrará detalles técnicos de la transferencia.`);
    };

    const handleDownloadData = async (transferId: string, edrEndpoint?: string, edrToken?: string) => {
      addLog(`📥 Descargando datos de transferencia: ${transferId}`);
      
      let endpoint = edrEndpoint;
      let token = edrToken;
      
      // If no EDR available, try to fetch it on-demand
      if (!endpoint || !token) {
        addLog(`⏳ EDR no disponible, obteniéndolo bajo demanda...`);
        try {
          const result = await api.phase6.getTransferEdr(transferId);
          if (result.success && result.edr) {
            endpoint = result.edr.endpoint;
            token = result.edr.authorization;
            addLog(`✅ EDR obtenido ${result.cached ? '(caché)' : '(consulta)'}`);
          } else {
            addLog(`❌ No se pudo obtener el EDR para esta transferencia`);
            return;
          }
        } catch (error) {
          addLog(`❌ Error al obtener EDR: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }
      
      if (!endpoint || !token) {
        addLog(`❌ No hay endpoint o token EDR disponible`);
        return;
      }

      addLog(`Endpoint: ${endpoint}`);
      
      try {
        // Llamar al backend para descargar el archivo (actúa como proxy para evitar CORS)
        const blob = await api.phase6.downloadFile({
          transferId: transferId,
          endpoint: endpoint,
          token: token
        });

        // Crear un URL temporal para el blob
        const url = window.URL.createObjectURL(blob);
        
        // Crear un enlace temporal y hacer click automáticamente
        const link = document.createElement('a');
        link.href = url;
        link.download = `data-${transferId}.csv`; // Puedes ajustar la extensión según el tipo de archivo
        document.body.appendChild(link);
        link.click();
        
        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        addLog(`✅ Archivo descargado exitosamente`);
      } catch (error) {
        addLog(`❌ Error al descargar: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Sort transfers by date (most recent first)
    const sortedTransfers = [...transfers].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.stateTimestamp || 0).getTime();
      const dateB = new Date(b.createdAt || b.stateTimestamp || 0).getTime();
      return dateB - dateA; // Descending order (most recent first)
    });

    return (
      <div style={{ minHeight: '200px' }}>
        {loading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '40px' 
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e5e7eb',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Consultando transferencias...</p>
            </div>
          </div>
        )}

        {!loading && transfers.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
              <div>Aún no hay transferencias. Inicia una transferencia desde una negociación finalizada.</div>
            </div>
          </div>
        )}

        {!loading && sortedTransfers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedTransfers.map((transfer) => {
              const badgeColor = getStateBadgeColor(transfer.state, transfer.edrAvailable);
              const borderColor = getCardBorderColor(transfer.state, transfer.edrAvailable);
              const backgroundColor = getCardBackground(transfer.state, transfer.edrAvailable);

              return (
                <div
                  key={transfer.id}
                  style={{
                    background: backgroundColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Transferencia</span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background: badgeColor.bg,
                      color: badgeColor.color
                    }}>
                      {badgeColor.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <strong>ID:</strong> {transfer.id}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <strong>Asset:</strong> {transfer.assetId}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    <strong>Creada:</strong> {formatDate(transfer.createdAt)}
                  </div>
                  {transfer.stateTimestamp && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      <strong>Actualizada:</strong> {formatDate(transfer.stateTimestamp)}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                    <strong>EDR Disponible:</strong> {transfer.edrAvailable ? ' ✅ Sí' : ' ❌ No'}
                  </div>

                  {(transfer.state === 'COMPLETED' || transfer.state === 'STARTED') ? (
                    <button
                      onClick={() => handleDownloadData(transfer.id, transfer.edrEndpoint, transfer.edrToken)}
                      disabled={!transfer.edrAvailable}
                      style={{
                        width: '100%',
                        background: transfer.edrAvailable 
                          ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' 
                          : '#9ca3af',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: transfer.edrAvailable ? 'pointer' : 'not-allowed',
                        opacity: transfer.edrAvailable ? 1 : 0.6,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (transfer.edrAvailable) {
                          e.currentTarget.style.opacity = '0.9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (transfer.edrAvailable) {
                          e.currentTarget.style.opacity = '1';
                        }
                      }}
                    >
                      📥 Descargar Datos {!transfer.edrAvailable && '(EDR no disponible)'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDebugTransfer(transfer.id)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      <Search size={14} />
                      Debug
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
);

TransfersContent.displayName = 'TransfersContent';

export default TransfersContent;
