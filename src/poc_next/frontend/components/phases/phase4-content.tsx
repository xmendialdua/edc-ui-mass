'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { FileText, RefreshCw, Trash2 } from 'lucide-react';
import { getAvailablePartners, getPartnerName } from '@/lib/partners';

interface ContractDefinition {
  '@id': string;
  '@type': string;
  accessPolicyId?: string;
  contractPolicyId?: string;
  assetsSelector?: any[];
}

interface Phase4ContentProps {
  onLog?: (message: string) => void;
  filter?: string;
}

const Phase4Content = forwardRef<any, Phase4ContentProps>(({ onLog, filter = 'all' }, ref) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractDefinition[]>([]);

  const log = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  async function loadContracts() {
    setLoading('list');
    console.log('[Phase4] Iniciando carga de contratos...');
    log('🔄 Cargando contratos...');
    try {
      const result = await api.phase4.listContractDefinitions();
      console.log('[Phase4] Contratos recibidos:', result.contracts);
      setContracts(result.contracts || []);
      log(`✅ ${result.contracts?.length || 0} contrato(s) cargado(s)`);
    } catch (error) {
      console.error('[Phase4] Error al cargar contratos:', error);
      log(`❌ Error al cargar contratos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteContract(contractId: string) {
    if (!confirm(`¿Estás seguro de eliminar el contrato "${contractId}"?`)) {
      return;
    }

    setLoading('delete');
    log(`🗑️ Eliminando contrato: ${contractId}`);
    try {
      await api.phase4.deleteContractDefinition(contractId);
      log(`✅ Contrato eliminado: ${contractId}`);
      setTimeout(() => loadContracts(), 1000);
    } catch (error) {
      log(`❌ Error al eliminar contrato: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: loadContracts
  }));

  // Extract partner BPN from contract data
  const extractPartnerBPN = (contract: ContractDefinition): string => {
    // Convert entire contract to JSON string and search for BPN
    const contractJson = JSON.stringify(contract);
    const availablePartners = getAvailablePartners();
    
    // Search for BPN or partner name in the contract JSON
    for (const partner of availablePartners) {
      if (contractJson.includes(partner.bpn) || 
          contractJson.toLowerCase().includes(partner.name.toLowerCase())) {
        return partner.bpn;
      }
    }
    
    return 'Unknown';
  };

  const getPartnerBadgeColor = (bpn: string): string => {
    if (bpn.includes('IKLN')) return '#667eea';
    if (bpn.includes('MASS')) return '#f093fb';
    if (bpn.includes('PTR1')) return '#48bb78';
    if (bpn.includes('PTR2')) return '#ed8936';
    if (bpn.includes('PTR3')) return '#f687b3';
    return '#999';
  };

  // Filter contracts based on filter prop
  const filteredContracts = contracts.filter(contract => {
    if (filter === 'all') return true;
    const partnerBPN = extractPartnerBPN(contract);
    return partnerBPN === filter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Contracts Grid - 2 columns */}
      {filteredContracts.length === 0 && !loading ? (
        <div style={{
          background: '#f8f9fa',
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div>No hay contratos publicados</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          {filteredContracts.map((contract) => {
            const partnerBPN = extractPartnerBPN(contract);
            const partnerName = getPartnerName(partnerBPN);
            const badgeColor = getPartnerBadgeColor(partnerBPN);
            
            // Extract asset ID from contract
            const assetId = contract.assetsSelector?.[0]?.['@id'] || 'Unknown asset';
            
            return (
              <div
                key={contract['@id']}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#11998e';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(17, 153, 142, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Card Header */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '12px 15px',
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contract['@id']}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: 'white',
                      background: badgeColor,
                      flexShrink: 0
                    }}>
                      {partnerName}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteContract(contract['@id'])}
                    disabled={loading !== null}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Card Body */}
                <div style={{ padding: '15px' }}>
                  <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div>
                      <strong>Asset:</strong> {assetId}
                    </div>
                    <div>
                      <strong>Partner BPN:</strong> {partnerBPN}
                    </div>
                    {contract.accessPolicyId && (
                      <div>
                        <strong>Access Policy:</strong> {contract.accessPolicyId}
                      </div>
                    )}
                    {contract.contractPolicyId && (
                      <div>
                        <strong>Contract Policy:</strong> {contract.contractPolicyId}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

Phase4Content.displayName = 'Phase4Content';
export default Phase4Content;

