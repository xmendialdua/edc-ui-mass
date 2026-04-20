'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Shield, RefreshCw } from 'lucide-react';

interface Policy {
  '@id': string;
  '@type': string;
  [key: string]: any;
}

interface Phase3ContentProps {
  onLog?: (message: string) => void;
}

const Phase3Content = forwardRef<any, Phase3ContentProps>(({ onLog }, ref) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const log = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  async function loadPolicies() {
    setLoading('list');
    console.log('[Phase3] Iniciando carga de políticas...');
    log('🔄 Cargando políticas...');
    try {
      const result = await api.phase3.listPolicies();
      console.log('[Phase3] Políticas recibidas:', result.policies);
      setPolicies(result.policies || []);
      log(`✅ ${result.policies?.length || 0} política(s) cargada(s)`);
    } catch (error) {
      console.error('[Phase3] Error al cargar políticas:', error);
      log(`❌ Error al cargar políticas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: loadPolicies
  }));

  const isPolicyType = (policy: Policy, type: string): boolean => {
    const policyId = policy['@id']?.toLowerCase() || '';
    return policyId.includes(type);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Layout: Lista de políticas (izquierda) + Panel de detalle (derecha) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: '20px'
      }}>
        {/* Left Panel: Políticas Disponibles */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#555',
            marginBottom: '8px',
            paddingLeft: '4px'
          }}>
            📋 Políticas Disponibles
          </div>

          {policies.length === 0 ? (
            <div style={{
              background: '#f8f9fa',
              border: '2px dashed #ddd',
              borderRadius: '6px',
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '12px'
            }}>
              <Shield size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div>No hay políticas</div>
            </div>
          ) : (
            policies.map((policy) => {
              const isAccessPolicy = isPolicyType(policy, 'access');
              const isContractPolicy = isPolicyType(policy, 'contract');
              const isSelected = selectedPolicy?.['@id'] === policy['@id'];
              
              return (
                <div
                  key={policy['@id']}
                  onClick={() => setSelectedPolicy(policy)}
                  style={{
                    background: isSelected ? '#e0e7ff' : (isAccessPolicy ? '#e0f7fa' : '#fce4ec'),
                    border: `2px solid ${isSelected ? '#667eea' : (isAccessPolicy ? '#00bcd4' : '#f093fb')}`,
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: 'white',
                        background: isAccessPolicy ? '#00bcd4' : '#f093fb'
                      }}>
                        {isAccessPolicy ? 'ACCESS' : 'CONTRACT'}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#333',
                      fontFamily: "'Courier New', monospace",
                      wordBreak: 'break-all'
                    }}>
                      {policy['@id']}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Panel: Detalle de la Política */}
        <div style={{
          background: '#fafafa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '20px',
          minHeight: '400px'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#667eea',
            marginBottom: '15px'
          }}>
            🔍 Detalle de la Política
          </div>

          {selectedPolicy ? (
            <div style={{
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '15px',
              maxHeight: '500px',
              overflowY: 'auto'
            }}>
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: '11px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(selectedPolicy, null, 2)}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: '#999',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              <Shield size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <div>Selecciona una política de la lista</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                para ver su detalle
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

Phase3Content.displayName = 'Phase3Content';

export default Phase3Content;

