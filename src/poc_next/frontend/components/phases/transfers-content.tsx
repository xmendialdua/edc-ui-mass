'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { api } from '@/lib/api';
import { Search } from 'lucide-react';

interface Transfer {
  id: string;
  assetId: string;
  state: 'REQUESTED' | 'STARTED' | 'COMPLETED' | 'SUSPENDED' | 'TERMINATED';
  stateCode?: number;
  rawState?: any;  // Estado original del conector EDC sin transformar
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
    const [pollingTransfers, setPollingTransfers] = useState<Set<string>>(new Set());
    const previousTransferIdsRef = useRef<Set<string>>(new Set());

    const addLog = (message: string) => {
      if (onLog) {
        onLog(message);
      }
    };

    // Actualización selectiva de transferencias
    const updateTransfersSelectively = async () => {
      try {
        const result = await api.phase6.listTransfers();
        const newTransfers = result.transfers || [];
        
        const newTransferIds = new Set(newTransfers.map((t: Transfer) => t.id));
        const previousTransferIds = previousTransferIdsRef.current;

        // Detectar cambios
        const addedIds = [...newTransferIds].filter(id => !previousTransferIds.has(id));
        const removedIds = [...previousTransferIds].filter(id => !newTransferIds.has(id));
        const existingIds = [...newTransferIds].filter(id => previousTransferIds.has(id));

        // Log de cambios detectados
        if (addedIds.length > 0) {
          addedIds.forEach(id => {
            const transfer = newTransfers.find((t: Transfer) => t.id === id);
            const code = transfer?.stateCode || '?';
            addLog(`➕ Nueva transferencia: ${id} - Estado: ${transfer?.state} (${code})`);
          });
        }
        if (removedIds.length > 0) {
          removedIds.forEach(id => addLog(`➖ Transferencia eliminada: ${id}`));
        }
        if (existingIds.length > 0 && (addedIds.length > 0 || removedIds.length > 0)) {
          // Log individual updates with state codes
          existingIds.forEach(id => {
            const transfer = newTransfers.find((t: Transfer) => t.id === id);
            const code = transfer?.stateCode || '?';
            addLog(`🔄 Actualizado: ${id} - Estado: ${transfer?.state} (${code})`);
          });
        }

        // Actualizar estado de manera quirúrgica
        setTransfers(prevTransfers => {
          // 1. Eliminar transferencias que ya no existen
          let updated = prevTransfers.filter(t => !removedIds.includes(t.id));
          
          // 2. Actualizar transferencias existentes (mantener misma referencia si no cambió)
          updated = updated.map(existingTransfer => {
            const newData = newTransfers.find((t: Transfer) => t.id === existingTransfer.id);
            if (!newData) return existingTransfer;
            
            // Solo actualizar si realmente cambió algo
            const hasChanged = 
              existingTransfer.state !== newData.state ||
              existingTransfer.edrAvailable !== newData.edrAvailable ||
              existingTransfer.stateTimestamp !== newData.stateTimestamp;
            
            return hasChanged ? newData : existingTransfer;
          });
          
          // 3. Añadir nuevas transferencias al principio (más recientes primero)
          const newTransfersToAdd = newTransfers.filter((t: Transfer) => 
            addedIds.includes(t.id)
          );
          
          return [...newTransfersToAdd, ...updated];
        });

        // Actualizar referencia de IDs
        previousTransferIdsRef.current = newTransferIds;

        if (result.logs) {
          result.logs.forEach(log => addLog(log));
        }

      } catch (error) {
        addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    async function fetchTransfers() {
      setLoading(true);
      addLog('🔍 Consultando transferencias...');
      try {
        const result = await api.phase6.listTransfers();
        setTransfers(result.transfers || []);
        previousTransferIdsRef.current = new Set(result.transfers?.map((t: Transfer) => t.id) || []);
        
        if (result.logs) {
          result.logs.forEach(log => addLog(log));
        }
        addLog(`✅ ${result.transfers?.length || 0} transferencia(s) encontrada(s)`);
      } catch (error) {
        addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTransfers([]);
        previousTransferIdsRef.current = new Set();
      } finally {
        setLoading(false);
      }
    }

    // Polling individual para una transferencia específica
    const pollTransferState = async (transferId: string) => {
      let attempts = 0;
      const maxAttempts = 30;
      
      const poll = async () => {
        if (attempts >= maxAttempts) {
          addLog(`⏹️ Polling detenido para transferencia ${transferId} (timeout)`);
          setPollingTransfers(prev => {
            const next = new Set(prev);
            next.delete(transferId);
            return next;
          });
          return;
        }

        try {
          const result = await api.phase6.getTransferStatus(transferId);
          
          if (result.success && result.transfer) {
            const newState = result.transfer.state;
            const stateCode = result.transfer.stateCode || '?';
            
            // Actualizar SOLO esta transferencia en el estado
            setTransfers(prevTransfers => 
              prevTransfers.map(t => 
                t.id === transferId ? result.transfer : t
              )
            );

            // Log solo en cambios de estado significativos
            if (attempts % 5 === 0 || stateCode === 800 || stateCode === 850) {
              addLog(`🔄 Transfer ${transferId}: ${newState} (${stateCode})`);
            }

            // Detener polling si llegó a estado final (800=COMPLETED, 850=TERMINATED)
            if (stateCode === 800 || stateCode === 850) {
              addLog(`✅ Transfer ${transferId} finalizada: ${newState} (${stateCode})`);
              setPollingTransfers(prev => {
                const next = new Set(prev);
                next.delete(transferId);
                return next;
              });
              return;
            }
          }

          attempts++;
          setTimeout(poll, 1000);
          
        } catch (error) {
          addLog(`❌ Error polling transfer ${transferId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setPollingTransfers(prev => {
            const next = new Set(prev);
            next.delete(transferId);
            return next;
          });
        }
      };

      poll();
    };

    useImperativeHandle(ref, () => ({
      refresh: () => {
        addLog('🔄 Refrescando transferencias...');
        updateTransfersSelectively();
        setAutoRefreshCount(0);
      }
    }));

    useEffect(() => {
      fetchTransfers();
    }, []);

    // Auto-refresh periódico con actualización selectiva
    useEffect(() => {
      const hasTransfersWithoutEdr = transfers.some(
        t => (t.stateCode === 600 || t.stateCode === 500) && !t.edrAvailable
      );

      if (hasTransfersWithoutEdr && autoRefreshCount < 10) {
        const timer = setTimeout(() => {
          // Log estados de transferencias sin EDR antes de refrescar
          transfers
            .filter(t => (t.stateCode === 600 || t.stateCode === 500) && !t.edrAvailable)
            .forEach(t => {
              const code = t.stateCode || '?';
              addLog(`🔄 Actualizando estado transferencia ${t.id}: ${t.state} (${code})`);
            });
          updateTransfersSelectively();
          setAutoRefreshCount(prev => prev + 1);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }, [transfers, autoRefreshCount]);

    const getStateBadgeColor = (stateCode: number | undefined, edrAvailable: boolean) => {
      // Usar código numérico para determinar el estado
      switch (stateCode) {
        case 500: // REQUESTED
          return { bg: '#8b5cf6', color: 'white', label: 'REQUESTED' };
        
        case 600: // STARTED
          if (edrAvailable) {
            return { bg: '#22c55e', color: 'white', label: 'STARTED' };
          } else {
            return { bg: '#f59e0b', color: 'white', label: 'UNAVAILABLE' };
          }
        
        case 700: // SUSPENDED
          return { bg: '#6b7280', color: 'white', label: 'SUSPENDED' };
        
        case 800: // COMPLETED
          return { bg: '#3b82f6', color: 'white', label: 'FINALIZED' };
        
        case 850: // TERMINATED
          return { bg: '#ef4444', color: 'white', label: 'FINALIZED' };
        
        default:
          return { bg: '#6b7280', color: 'white', label: `CODE ${stateCode || '?'}` };
      }
    };

    const getCardBorderColor = (stateCode: number | undefined, edrAvailable: boolean) => {
      switch (stateCode) {
        case 500: return '#8b5cf6'; // REQUESTED - purple
        case 600: return edrAvailable ? '#22c55e' : '#f59e0b'; // STARTED - green if EDR, orange if unavailable
        case 700: return '#6b7280'; // SUSPENDED - gray
        case 800: return '#3b82f6'; // COMPLETED - blue
        case 850: return '#ef4444'; // TERMINATED - red
        default: return '#d1d5db';
      }
    };

    const getCardBackground = (stateCode: number | undefined, edrAvailable: boolean) => {
      switch (stateCode) {
        case 500: return '#faf5ff'; // REQUESTED - purple background
        case 600: return edrAvailable ? '#f0fdf4' : '#fffbeb'; // STARTED - green if EDR, yellow if unavailable
        case 700: return '#f9fafb'; // SUSPENDED - gray background
        case 800: return '#eff6ff'; // COMPLETED - blue background
        case 850: return '#fef2f2'; // TERMINATED - red background
        default: return '#ffffff';
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

        // Iniciar polling individual para esta transferencia
        if (!pollingTransfers.has(transferId)) {
          addLog(`🔄 Iniciando monitoreo del estado de transferencia ${transferId}...`);
          setPollingTransfers(prev => new Set(prev).add(transferId));
          pollTransferState(transferId);
        }
        
      } catch (error) {
        addLog(`❌ Error al descargar: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Ordenar por fecha (más recientes primero)
    const sortedTransfers = [...transfers].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.stateTimestamp || 0).getTime();
      const dateB = new Date(b.createdAt || b.stateTimestamp || 0).getTime();
      return dateB - dateA;
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
              const badgeColor = getStateBadgeColor(transfer.stateCode, transfer.edrAvailable);
              const borderColor = getCardBorderColor(transfer.stateCode, transfer.edrAvailable);
              const backgroundColor = getCardBackground(transfer.stateCode, transfer.edrAvailable);
              const isPolling = pollingTransfers.has(transfer.id);

              return (
                <div
                  key={transfer.id}
                  style={{
                    background: backgroundColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}
                >
                  {isPolling && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#fef3c7',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: '#92400e'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#f59e0b',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}></div>
                      Monitoreando...
                    </div>
                  )}

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
                      {transfer.stateCode && (
                        <span style={{ marginRight: '6px', opacity: 0.8 }}>[{transfer.stateCode}]</span>
                      )}
                      {badgeColor.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <strong>ID:</strong> {transfer.id}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <strong>Asset:</strong> {transfer.assetId}
                  </div>
                  
                  {/* Mostrar los 3 campos de estado para debugging */}
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', background: '#f0f9ff', padding: '8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1e40af' }}>📊 Estados del Conector EDC:</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', lineHeight: '1.6' }}>
                      <div style={{ marginBottom: '2px' }}>
                        <strong style={{ color: '#1e3a8a' }}>rawState:</strong> {JSON.stringify(transfer.rawState)}
                      </div>
                      <div style={{ marginBottom: '2px' }}>
                        <strong style={{ color: '#1e3a8a' }}>state:</strong> {JSON.stringify(transfer.state)}
                      </div>
                      <div>
                        <strong style={{ color: '#1e3a8a' }}>stateCode:</strong> {JSON.stringify(transfer.stateCode)}
                      </div>
                    </div>
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

                  {(transfer.stateCode === 800 || transfer.stateCode === 600) ? (
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
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }
);

TransfersContent.displayName = 'TransfersContent';

export default TransfersContent;
