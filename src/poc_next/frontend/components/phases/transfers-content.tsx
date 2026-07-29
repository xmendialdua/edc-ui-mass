'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { api } from '@/lib/api';
import { Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

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
  edrError?: string | null;  // 'refresh_failed' | 'config_error' | 'unavailable' | null
  edrSource?: string | null;
  edrExpiresAt?: string | null;
  edrExpiresAtSource?: string | null;
  edrId?: string | null;
  contractAgreementId?: string;
}

interface TransfersContentProps {
  onLog?: (message: string) => void;
  sharePointConnected?: boolean;
  sharePointUser?: string | null;
  onAuthenticateSharePoint?: () => void;
  partnerDetails?: {
    bpn: string;
    management_url: string;
  } | null;
}

const TransfersContent = forwardRef<{ refresh: () => void }, TransfersContentProps>(
  ({ onLog, sharePointConnected = false, sharePointUser = null, onAuthenticateSharePoint, partnerDetails }, ref) => {
    const [loading, setLoading] = useState(false);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [autoRefreshCount, setAutoRefreshCount] = useState(0);
    const [showOnlyActiveTransfers, setShowOnlyActiveTransfers] = useState(true);
    const [pollingTransfers, setPollingTransfers] = useState<Set<string>>(new Set());
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
    const [now, setNow] = useState(Date.now());
    const previousTransferIdsRef = useRef<Set<string>>(new Set());

    const toggleCard = (id: string) => {
      setCollapsedCards(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    const addLog = (message: string) => {
      if (onLog) {
        onLog(message);
      }
    };

    useEffect(() => {
      const timer = setInterval(() => setNow(Date.now()), 5000);
      return () => clearInterval(timer);
    }, []);

    // Actualización selectiva de transferencias
    const updateTransfersSelectively = async () => {
      try {
        // Only fetch CONSUMER type transfers (initiated by this partner)
        const result = await api.phase6.listTransfers(
          partnerDetails?.management_url,
          'consumer'
        );
        if (!result.success) {
          addLog(`❌ Error listando transferencias: ${(result as any).error || 'sin detalle'}`);
          return;
        }
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
              existingTransfer.edrError !== newData.edrError ||
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
      addLog('🔍 Consultando transferencias de tipo CONSUMER...');
      try {
        // Only fetch CONSUMER type transfers (initiated by this partner)
        const result = await api.phase6.listTransfers(
          partnerDetails?.management_url,
          'consumer'
        );
        if (!result.success) {
          addLog(`❌ Error listando transferencias: ${(result as any).error || 'sin detalle'}`);
          setTransfers([]);
          previousTransferIdsRef.current = new Set();
          return;
        }
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
          const result = await api.phase6.getTransferStatus(transferId, partnerDetails?.management_url);
          
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
      // Clear previous data and fetch new data when partner changes
      if (partnerDetails?.management_url) {
        setTransfers([]); // Clear old data
        previousTransferIdsRef.current = new Set();
        setLoading(true);
        fetchTransfers();
      } else {
        // No partner details yet, clear data
        setTransfers([]);
        previousTransferIdsRef.current = new Set();
      }
    }, [partnerDetails?.management_url]);

    // Auto-refresh periódico con actualización selectiva
    useEffect(() => {
      // Only trigger auto-refresh for transfers actively waiting (not already failed)
      const hasTransfersWithoutEdr = transfers.some(
        t => (t.stateCode === 600 || t.stateCode === 500) && !t.edrAvailable && !t.edrError
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

    const isTransferActive = (transfer: Transfer) => {
      const code = transfer.stateCode;
      const hasFatalEdrError = ['refresh_failed', 'config_error', 'invalid_token'].includes(transfer.edrError || '');
      if (hasFatalEdrError) return false;

      // Final/non-active states.
      if (code === 700 || code === 800 || code === 850) return false;

      if (code === 500) return true; // REQUESTED

      if (code === 600) {
        // STARTED can still be expired; use effective expiration to classify.
        const expirationData = estimateExpirationFromTransfer(transfer);
        if (!expirationData.expiresAt) {
          // If no expiration info exists, only treat as active when EDR is available.
          return !!transfer.edrAvailable;
        }

        const exp = new Date(expirationData.expiresAt).getTime();
        if (Number.isNaN(exp)) {
          return !!transfer.edrAvailable;
        }

        return exp > now;
      }

      return false;
    };

    const getStateBadgeColor = (stateCode: number | undefined, edrAvailable: boolean) => {
      // Usar código numérico para determinar el estado
      switch (stateCode) {
        case 500: // REQUESTED
          return { bg: '#8b5cf6', color: 'white', label: 'REQUESTED' };
        
        case 600: // STARTED
          return { bg: '#22c55e', color: 'white', label: 'STARTED' };
        
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

    const getCardBorderColor = (active: boolean) => {
      return active ? '#22c55e' : '#9ca3af';
    };

    const getCardBackground = (active: boolean) => {
      return active ? '#f0fdf4' : '#f3f4f6';
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

    const getTimeAgo = (dateString?: string) => {
      if (!dateString) return 'Unknown time';
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
          return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
          return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else {
          return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
        }
      } catch {
        return 'Unknown time';
      }
    };

    const formatTimeRemaining = (dateString?: string) => {
      if (!dateString) return null;

      try {
        const expiry = new Date(dateString).getTime();
        if (Number.isNaN(expiry)) return null;

        const diffMs = expiry - now;
        if (diffMs <= 0) return null;

        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          return `Expira en ${diffDays}d ${diffHours % 24}h`;
        }

        if (diffHours > 0) {
          return `Expira en ${diffHours}h ${diffMins % 60}m`;
        }

        if (diffMins > 0) {
          return `Expira en ${diffMins}m ${diffSecs % 60}s`;
        }

        return `Expira en ${diffSecs}s`;
      } catch {
        return null;
      }
    };

    const estimateExpirationFromTransfer = (transfer: Transfer): { expiresAt: string | null; source: string | null } => {
      if (transfer.edrExpiresAt) {
        return { expiresAt: transfer.edrExpiresAt, source: transfer.edrExpiresAtSource || 'token' };
      }

      const refValue = transfer.stateTimestamp || transfer.createdAt;
      if (!refValue) {
        return { expiresAt: null, source: null };
      }

      let parsed: Date | null = null;
      if (typeof refValue === 'string') {
        const direct = new Date(refValue);
        if (!Number.isNaN(direct.getTime())) {
          parsed = direct;
        } else if (/^\d+$/.test(refValue)) {
          const asNum = Number(refValue);
          const millis = asNum > 1e12 ? asNum : asNum * 1000;
          const fromEpoch = new Date(millis);
          if (!Number.isNaN(fromEpoch.getTime())) {
            parsed = fromEpoch;
          }
        }
      } else {
        const fromAny = new Date(refValue as any);
        if (!Number.isNaN(fromAny.getTime())) {
          parsed = fromAny;
        }
      }

      if (!parsed) {
        return { expiresAt: null, source: null };
      }

      const estimated = new Date(parsed.getTime() + 5 * 60 * 1000).toISOString();
      return { expiresAt: estimated, source: 'estimated_from_transfer_timestamp' };
    };

    const handleRefreshTransferValidity = async (transfer: Transfer) => {
      addLog(`🔄 Solicitando refresh de validez para transfer ${transfer.id}...`);
      try {
        const result = await api.phase6.getFreshToken(transfer.id, true, partnerDetails?.management_url);

        if (!result.success) {
          addLog(`❌ No se pudo refrescar la validez: ${result.error || 'sin detalle'}`);
          return;
        }

        const ttl = result.tokenDiagnostics?.timing?.secondsToExpiration;
        addLog(`✅ Validez refrescada para ${transfer.id} (ttl=${typeof ttl === 'number' ? ttl : 'n/a'})`);
        setTimeout(() => updateTransfersSelectively(), 1000);
      } catch (error) {
        addLog(`❌ Excepción refrescando validez: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    const handleReinitiateTransfer = async (transfer: Transfer) => {
      if (!transfer.contractAgreementId || !transfer.assetId) {
        addLog(`❌ No se puede re-iniciar: faltan contractAgreementId o assetId`);
        return;
      }
      addLog(`🔄 Re-iniciando transferencia para el asset ${transfer.assetId}...`);
      try {
        const result = await api.phase6.initiateTransfer({
          contractAgreementId: transfer.contractAgreementId,
          assetId: transfer.assetId,
          consumerManagementUrl: partnerDetails?.management_url,
        });
        if (result.success) {
          addLog(`✅ Nueva transferencia iniciada correctamente`);
          setTimeout(() => updateTransfersSelectively(), 2000);
        } else {
          const errMsg = result.logs?.join(', ') || JSON.stringify(result);
          addLog(`❌ Error al re-iniciar la transferencia: ${errMsg}`);
        }
      } catch (error) {
        addLog(`❌ Excepción re-iniciando: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    const handleDebugTransfer = (transferId: string) => {
      addLog(`🔍 Depurando transferencia: ${transferId}`);
      alert(`Debug de transferencia: ${transferId}\nEsta funcionalidad mostrará detalles técnicos de la transferencia.`);
    };

    const handleDownloadData = async (transferId: string, edrEndpoint?: string, edrToken?: string) => {
      addLog(`📥 Descargando datos de transferencia: ${transferId}`);
      
      try {
        // Obtener el EDR endpoint si no lo tenemos
        let endpoint = edrEndpoint;
        if (!endpoint) {
          addLog(`   ⏳ Obteniendo EDR endpoint...`);
          try {
            const result = await api.phase6.getTransferEdr(transferId, partnerDetails?.management_url);
            if (result.success && result.edr) {
              endpoint = result.edr.endpoint;
              addLog(`   ✅ EDR obtenido`);
            } else {
              addLog(`   ❌ No se pudo obtener el EDR`);
              addLog(`   ℹ️ El EDR se genera automáticamente cuando el transfer entra en estado STARTED`);
              addLog(`   ℹ️ Por favor espera unos segundos y vuelve a intentar`);
              return;
            }
          } catch (error) {
            addLog(`   ❌ Error al obtener EDR: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return;
          }
        }
        
        if (!endpoint) {
          addLog(`   ❌ No hay endpoint EDR disponible`);
          addLog(`   ℹ️ Esto es necesario para cumplir con el protocolo DSP de Tractus-X`);
          return;
        }
        
        addLog(`   🔐 Descargando vía EDR (cumpliendo protocolo DSP)...`);
        addLog(`   📡 Endpoint: ${endpoint.substring(0, 50)}...`);
        
        const { blob, contentType, filename } = await api.phase6.downloadFile({
          transferId: transferId,
          endpoint: endpoint,
          token: edrToken || '',
          consumerManagementUrl: partnerDetails?.management_url,
        });

        addLog(`   📄 Tipo de archivo: ${contentType}`);
        addLog(`   📝 Nombre del archivo: ${filename}`);

        // Crear un URL temporal para el blob
        const url = window.URL.createObjectURL(blob);
        
        // Crear un enlace temporal y hacer click automáticamente
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        addLog(`   ✅ Archivo descargado exitosamente vía EDR`);

        // Iniciar polling individual para esta transferencia
        if (!pollingTransfers.has(transferId)) {
          addLog(`🔄 Iniciando monitoreo del estado de transferencia ${transferId}...`);
          setPollingTransfers(prev => new Set(prev).add(transferId));
          pollTransferState(transferId);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`   ❌ Error al descargar: ${errorMessage}`);
      }
    };

    // Ordenar por fecha (más recientes primero)
    const sortedTransfers = [...transfers].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.stateTimestamp || 0).getTime();
      const dateB = new Date(b.createdAt || b.stateTimestamp || 0).getTime();
      return dateB - dateA;
    });

    const visibleTransfers = showOnlyActiveTransfers
      ? sortedTransfers.filter(isTransferActive)
      : sortedTransfers;

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

        {!loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            fontSize: '12px',
            color: '#374151'
          }}>
            <input
              id="show-only-active-transfers"
              type="checkbox"
              checked={showOnlyActiveTransfers}
              onChange={(e) => setShowOnlyActiveTransfers(e.target.checked)}
            />
            <label htmlFor="show-only-active-transfers" style={{ cursor: 'pointer', userSelect: 'none' }}>
              Show only active transfers
            </label>
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

        {!loading && visibleTransfers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleTransfers.map((transfer) => {
              const isActiveCard = isTransferActive(transfer);
              const badgeColor = getStateBadgeColor(transfer.stateCode, transfer.edrAvailable);
              const borderColor = getCardBorderColor(isActiveCard);
              const backgroundColor = getCardBackground(isActiveCard);
              const isPolling = pollingTransfers.has(transfer.id);
              const isCollapsed = collapsedCards.has(transfer.id);
              const isFinalState = transfer.stateCode === 800 || transfer.stateCode === 850;
              const isEdrRefreshFailed = !transfer.edrAvailable && !!transfer.edrError && transfer.stateCode === 600;
              const isWaitingEdrState = (transfer.stateCode === 500 || transfer.stateCode === 600) && !transfer.edrAvailable && !transfer.edrError;
              const expirationData = estimateExpirationFromTransfer(transfer);
              const timeRemaining = isActiveCard ? formatTimeRemaining(expirationData.expiresAt || undefined) : null;

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
                  {isPolling && !isCollapsed && (
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
                    marginBottom: (isCollapsed || !isActiveCard) ? '0' : '12px',
                    cursor: isActiveCard ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (isActiveCard) toggleCard(transfer.id);
                  }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '2px'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold',
                          color: '#1f2937'
                        }}>
                          {transfer.assetId}
                        </div>
                        {isActiveCard && (
                          <button
                            type="button"
                            title="Solicitar refresh de validez"
                            aria-label="Solicitar refresh de validez"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshTransferValidity(transfer);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '22px',
                              height: '22px',
                              padding: 0,
                              border: '1px solid #86efac',
                              borderRadius: '6px',
                              background: '#ecfdf5',
                              color: '#16a34a',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <RefreshCw size={11} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {getTimeAgo(transfer.stateTimestamp || transfer.createdAt)} ({formatDate(transfer.stateTimestamp || transfer.createdAt)})
                      </div>
                      {timeRemaining && (
                        <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', fontWeight: 600 }}>
                          {timeRemaining}
                        </div>
                      )}
                    </div>
                    {isActiveCard && (
                      <div style={{ marginLeft: '12px' }}>
                        {isCollapsed ? <ChevronDown size={20} color="#6b7280" /> : <ChevronUp size={20} color="#6b7280" />}
                      </div>
                    )}
                  </div>

                  {!isActiveCard && (
                    <div style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid #d1d5db',
                      fontSize: '12px',
                      color: '#4b5563'
                    }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Transfer ID:</strong> {transfer.id}
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Agreement ID:</strong> {transfer.contractAgreementId || 'N/A'}
                      </div>
                    </div>
                  )}

                  {isActiveCard && !isCollapsed && (<>
                    <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '12px' }}></div>

                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '3px' }}>
                    <strong>Transfer ID:</strong> {transfer.id}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '3px' }}>
                    <strong>Agreement ID:</strong> {transfer.contractAgreementId || 'N/A'}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', background: transfer.edrAvailable ? '#f0fdf4' : '#fef3c7', padding: '8px', borderRadius: '4px', border: transfer.edrAvailable ? '1px solid #86efac' : '1px solid #fcd34d' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Download Method:</strong>
                    </div>
                    {transfer.edrAvailable ? (
                      <div style={{ fontSize: '11px', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ✅ <strong>EDR Available</strong> - Ready to download
                        </div>
                        <div style={{ fontSize: '10px', color: '#047857', marginLeft: '20px' }}>
                          Using DSP protocol (Tractus-X compliant)
                        </div>
                      </div>
                    ) : isFinalState ? (
                      <div style={{ fontSize: '11px', color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⛔ <strong>No EDR Available</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#7f1d1d', marginLeft: '20px' }}>
                          Transfer finished in {transfer.state} without EDR.
                          Create a new transfer to generate a fresh EDR.
                        </div>
                      </div>
                    ) : isEdrRefreshFailed ? (
                      <div style={{ fontSize: '11px', color: '#92400e', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⚠️ <strong>EDR Refresh Failed</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#78350f', marginLeft: '20px' }}>
                          {transfer.edrError === 'config_error'
                            ? 'Configuration error: JWS algorithm mismatch between EDC and STS. Contact administrator.'
                            : 'The STS service could not renew the EDR token. Re-initiate the transfer to get a fresh EDR.'}
                        </div>
                      </div>
                    ) : isWaitingEdrState ? (
                      <div style={{ fontSize: '11px', color: '#92400e', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⏳ <strong>Waiting for EDR</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#78716c', marginLeft: '20px' }}>
                          EDR token is being generated...<br/>
                          Auto-monitoring active (refresh in ~5s)
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#92400e', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ℹ️ <strong>EDR not available yet</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#78716c', marginLeft: '20px' }}>
                          Refresh transfer status to continue diagnosis.
                        </div>
                      </div>
                    )}
                  </div>

                  {(transfer.stateCode === 800 || transfer.stateCode === 600) ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      marginTop: '8px'
                    }}>
                      {isEdrRefreshFailed && transfer.edrError !== 'config_error' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReinitiateTransfer(transfer);
                          }}
                          style={{
                            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                        >
                          🔄 Re-initiate Transfer
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadData(transfer.id, transfer.edrEndpoint, transfer.edrToken);
                        }}
                        disabled={!transfer.edrAvailable}
                        style={{
                          background: transfer.edrAvailable 
                            ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' 
                            : 'linear-gradient(90deg, #9ca3af 0%, #6b7280 100%)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: transfer.edrAvailable ? 'pointer' : 'not-allowed',
                          opacity: transfer.edrAvailable ? 1 : 0.6,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
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
                        📥 Download
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '8px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDebugTransfer(transfer.id);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        <Search size={12} />
                        Debug
                      </button>
                    </div>
                  )}
                  </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && transfers.length > 0 && visibleTransfers.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '13px',
            border: '1px dashed #d1d5db',
            borderRadius: '8px',
            background: '#f9fafb'
          }}>
            No active transfers available with current filter.
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
