'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { api } from '@/lib/api';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

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
              const borderColor = getCardBorderColor(negotiation.state);
              const backgroundColor = getCardBackground(negotiation.state);
              const isCollapsed = collapsedCards.has(negotiation.id);

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
                    marginBottom: isCollapsed ? '0' : '12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleCard(negotiation.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: '2px'
                      }}>
                        {negotiation.assetId}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {getTimeAgo(negotiation.createdAt)} ({formatDate(negotiation.createdAt)})
                      </div>
                    </div>
                    <div style={{ marginLeft: '12px' }}>
                      {isCollapsed ? <ChevronDown size={20} color="#6b7280" /> : <ChevronUp size={20} color="#6b7280" />}
                    </div>
                  </div>

                  {!isCollapsed && (<>
                    <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '12px' }}></div>

                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '3px' }}>
                    <strong>Negotiation ID:</strong> {negotiation.id}
                  </div>

                  {negotiation.contractAgreementId && (
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '3px' }}>
                      <strong>Agreement ID:</strong> {negotiation.contractAgreementId}
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '3px' }}>
                    <strong>Counter Party ID:</strong> BPNL00000000MASS
                  </div>

                  {canTransfer && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '8px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInitiateTransfer(negotiation.contractAgreementId!, negotiation.assetId);
                        }}
                        style={{
                          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        Init Transfer
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
