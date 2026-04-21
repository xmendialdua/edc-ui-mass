'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface Negotiation {
  id: string;
  assetId: string;
  state: 'REQUESTED' | 'AGREED' | 'FINALIZED' | 'FAILED';
  contractAgreementId?: string;
  createdAt?: string;
  stateTimestamp?: string;
}

interface NegotiationsContentProps {
  onLog?: (message: string) => void;
  onInitiateTransfer?: (contractId: string, assetId: string) => void;
}

const NegotiationsContent = forwardRef<{ refresh: () => void }, NegotiationsContentProps>(
  ({ onLog, onInitiateTransfer }, ref) => {
    const [loading, setLoading] = useState(false);
    const [negotiations, setNegotiations] = useState<Negotiation[]>([]);

    const addLog = (message: string) => {
      if (onLog) {
        onLog(message);
      }
    };

    async function fetchNegotiations() {
      setLoading(true);
      addLog('🔍 Consultando negociaciones...');
      try {
        const result = await api.phase6.listNegotiations();
        setNegotiations(result.negotiations || []);
        if (result.logs) {
          result.logs.forEach(log => addLog(log));
        }
        addLog(`✅ ${result.negotiations?.length || 0} negociación(es) encontrada(s)`);
      } catch (error) {
        addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setNegotiations([]);
      } finally {
        setLoading(false);
      }
    }

    useImperativeHandle(ref, () => ({
      refresh: fetchNegotiations
    }));

    useEffect(() => {
      fetchNegotiations();
    }, []);

    const getStateBadgeColor = (state: string) => {
      switch (state) {
        case 'FINALIZED':
        case 'AGREED':
          return { bg: '#22c55e', color: 'white' };
        case 'REQUESTED':
          return { bg: '#3b82f6', color: 'white' };
        case 'FAILED':
          return { bg: '#ef4444', color: 'white' };
        default:
          return { bg: '#6b7280', color: 'white' };
      }
    };

    const getCardBorderColor = (state: string) => {
      switch (state) {
        case 'FINALIZED':
        case 'AGREED':
          return '#22c55e';
        case 'REQUESTED':
          return '#3b82f6';
        case 'FAILED':
          return '#ef4444';
        default:
          return '#d1d5db';
      }
    };

    const getCardBackground = (state: string) => {
      switch (state) {
        case 'FINALIZED':
        case 'AGREED':
          return '#f0fdf4';
        case 'REQUESTED':
          return '#eff6ff';
        case 'FAILED':
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

    const handleInitiateTransfer = (contractId: string, assetId: string) => {
      addLog(`📥 Iniciando transferencia para contrato: ${contractId}`);
      if (onInitiateTransfer) {
        onInitiateTransfer(contractId, assetId);
      }
    };

    // Sort negotiations by date (most recent first)
    const sortedNegotiations = [...negotiations].sort((a, b) => {
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
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Consultando negociaciones...</p>
            </div>
          </div>
        )}

        {!loading && negotiations.length === 0 && (
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              <div>Aún no hay negociaciones. Negocia un asset para comenzar.</div>
            </div>
          </div>
        )}

        {!loading && sortedNegotiations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedNegotiations.map((negotiation) => {
              const canTransfer = 
                (negotiation.state === 'FINALIZED' || negotiation.state === 'AGREED') && 
                negotiation.contractAgreementId;
              const badgeColor = getStateBadgeColor(negotiation.state);
              const borderColor = getCardBorderColor(negotiation.state);
              const backgroundColor = getCardBackground(negotiation.state);

              return (
                <div
                  key={negotiation.id}
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
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Negociación</span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background: badgeColor.bg,
                      color: badgeColor.color
                    }}>
                      {negotiation.state}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <strong>ID:</strong> {negotiation.id}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <strong>Asset:</strong> {negotiation.assetId}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    <strong>Creada:</strong> {formatDate(negotiation.createdAt)}
                  </div>

                  {negotiation.contractAgreementId && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      <strong>Contrato:</strong> {negotiation.contractAgreementId}
                    </div>
                  )}

                  {canTransfer && (
                    <button
                      onClick={() => handleInitiateTransfer(negotiation.contractAgreementId!, negotiation.assetId)}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
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
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      <Download size={16} />
                      Iniciar Transferencia
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

NegotiationsContent.displayName = 'NegotiationsContent';

export default NegotiationsContent;
