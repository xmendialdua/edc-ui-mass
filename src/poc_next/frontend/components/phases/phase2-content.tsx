'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Package, Plus, RefreshCw, Trash2, Upload, ChevronDown, ChevronUp, FolderOpen, File, ChevronRight, Home } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest } from "@/lib/authConfig";

interface Asset {
  '@id': string;
  properties?: {
    name?: string;
    description?: string;
    contenttype?: string;
    [key: string]: any;
  };
  dataAddress?: any;
}

interface Phase2ContentProps {
  onLog?: (message: string) => void;
  phase4Ref?: any;  // Referencia a Phase4 para refrescar contratos
}

const Phase2Content = forwardRef<any, Phase2ContentProps>(({ onLog, phase4Ref }, ref) => {
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAssetId, setNewAssetId] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetUrlType, setAssetUrlType] = useState<'pdf' | 'csv' | 'custom' | 'sharepoint-file' | 'sharepoint-folder'>('pdf');
  const [customUrl, setCustomUrl] = useState('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());
  const [policies, setPolicies] = useState<any[]>([]);
  const [showSharePointPicker, setShowSharePointPicker] = useState(false);
  const [sharePointUrl, setSharePointUrl] = useState('');
  const [sharePointItemName, setSharePointItemName] = useState('');
  
  // SharePoint states
  const [sharePointAccessToken, setSharePointAccessToken] = useState('');
  const [sharePointFiles, setSharePointFiles] = useState<any[]>([]);
  const [sharePointLoading, setSharePointLoading] = useState(false);
  const [sharePointError, setSharePointError] = useState<string | null>(null);
  const [sharePointFolderPath, setSharePointFolderPath] = useState<string[]>([]);
  const [sharePointFolderIds, setSharePointFolderIds] = useState<string[]>([]);
  
  // SharePoint site URL
  const SHAREPOINT_SITE_URL = 'https://ikerlan.sharepoint.com/sites/IKDataSpace';

  // Lista de partners disponibles (hardcoded)
  function getAvailablePartners() {
    return [
      {
        bpn: "BPNL00000002IKLN",
        name: "Ikerlan",
        description: "IKERLAN Technology Centre"
      },
      {
        bpn: "BPNL00000000MASS",
        name: "MondragonAssembly",
        description: "Mondragon Assembly"
      },
      {
        bpn: "BPNL00000001PTR1",
        name: "Partner1",
        description: "Partner 1"
      },
      {
        bpn: "BPNL00000001PTR2",
        name: "Partner2",
        description: "Partner 2"
      },
      {
        bpn: "BPNL00000001PTR3",
        name: "Partner3",
        description: "Partner 3"
      }
    ];
  }

  const log = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  // ==================== SharePoint Functions ====================
  
  const handleSharePointLogin = async () => {
    if (accounts.length === 0) {
      try {
        const response = await instance.loginPopup(loginRequest);
        if (response.accessToken) {
          setSharePointAccessToken(response.accessToken);
          await loadSharePointFiles(response.accessToken);
        }
      } catch (error) {
        console.error('Login error:', error);
        setSharePointError('Error al iniciar sesión en Azure AD');
      }
    } else {
      const request = {
        ...loginRequest,
        account: accounts[0]
      };

      try {
        const response = await instance.acquireTokenSilent(request);
        setSharePointAccessToken(response.accessToken);
        await loadSharePointFiles(response.accessToken);
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          try {
            const response = await instance.acquireTokenPopup(request);
            setSharePointAccessToken(response.accessToken);
            await loadSharePointFiles(response.accessToken);
          } catch (popupError) {
            console.error('Popup error:', popupError);
            setSharePointError('Error al obtener token de acceso');
          }
        } else {
          console.error('Token error:', error);
          setSharePointError('Error al obtener token de acceso');
        }
      }
    }
  };

  const loadSharePointFiles = async (token: string, folderId?: string) => {
    setSharePointLoading(true);
    setSharePointError(null);
    
    try {
      const result = await api.sharepoint.listFilesBySiteUrl(
        token,
        SHAREPOINT_SITE_URL,
        folderId
      );
      
      if (result.items) {
        const mode = assetUrlType === 'sharepoint-folder' ? 'folder' : 'file';
        const filteredFiles = mode === 'folder' 
          ? result.items.filter((f: any) => f.isFolder)
          : result.items;
        
        setSharePointFiles(filteredFiles);
      } else {
        setSharePointError('Error al cargar archivos');
      }
    } catch (err: any) {
      console.error('Error loading files:', err);
      setSharePointError(`Error al cargar archivos: ${err.message || 'Error desconocido'}`);
    } finally {
      setSharePointLoading(false);
    }
  };

  const handleSharePointFolderClick = async (folder: any) => {
    if (folder.isFolder) {
      setSharePointFolderPath([...sharePointFolderPath, folder.name]);
      setSharePointFolderIds([...sharePointFolderIds, folder.id]);
      
      // Extract item_id from composite format "drive_id|item_id"
      const itemId = folder.id.includes('|') ? folder.id.split('|')[1] : folder.id;
      await loadSharePointFiles(sharePointAccessToken, itemId);
    }
  };

  const handleSharePointBreadcrumbClick = async (index: number) => {
    const newPath = sharePointFolderPath.slice(0, index);
    const newIds = sharePointFolderIds.slice(0, index);
    setSharePointFolderPath(newPath);
    setSharePointFolderIds(newIds);
    
    if (index === 0) {
      await loadSharePointFiles(sharePointAccessToken);
    } else {
      const folderId = newIds[newIds.length - 1];
      // Extract item_id from composite format
      const itemId = folderId.includes('|') ? folderId.split('|')[1] : folderId;
      await loadSharePointFiles(sharePointAccessToken, itemId);
    }
  };

  const handleSharePointItemSelect = (item: any) => {
    setSharePointUrl(item.webUrl);
    setSharePointItemName(item.name);
    setShowSharePointPicker(false);
    setSharePointFiles([]);
    setSharePointFolderPath([]);
    setSharePointFolderIds([]);
  };

  const handleSharePointToggle = () => {
    if (!showSharePointPicker) {
      setShowSharePointPicker(true);
      if (!sharePointAccessToken) {
        handleSharePointLogin();
      } else {
        loadSharePointFiles(sharePointAccessToken);
      }
    } else {
      setShowSharePointPicker(false);
      setSharePointFiles([]);
      setSharePointFolderPath([]);
      setSharePointFolderIds([]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ==============================================

  async function loadAssets() {
    setLoading('list');
    log('🔄 Cargando assets...');
    try {
      const result = await api.phase2.listAssets();
      setAssets(result.assets || []);
      log(`✅ ${result.assets?.length || 0} asset(s) cargado(s)`);
    } catch (error) {
      log(`❌ Error al cargar assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  async function loadPolicies() {
    try {
      const result = await api.phase3.listPolicies();
      setPolicies(result.policies || []);
    } catch (error) {
      console.error('Error cargando políticas:', error);
    }
  }

  function findPolicyById(policyId: string): boolean {
    return policies.some(policy => policy['@id'] === policyId);
  }

  async function ensureContractPolicyGeneral(): Promise<{ success: boolean; error?: string }> {
    // Check if already exists
    if (findPolicyById('contract-policy-general')) {
      log('ℹ️  Contract Policy General ya existe');
      return { success: true };
    }

    log('📜 Creando Contract Policy General...');
    
    try {
      const result = await api.phase3.createContractPolicy();
      
      if (result.success || (result as any).error === 'POLICY_EXISTS') {
        await loadPolicies();  // Reload to get the new policy
        log('✅ Contract Policy General disponible: contract-policy-general');
        return { success: true };
      } else {
        const errorMsg = (result as any).error || 'Error desconocido';
        log(`❌ Error creando Contract Policy General: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      log(`❌ Error creando Contract Policy General: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async function ensureAccessPolicy(partner: { bpn: string; name: string }): Promise<{ success: boolean; policyId?: string; error?: string }> {
    const accessPolicyId = `access-policy-${partner.bpn.toLowerCase()}`;
    
    // Check if already exists
    if (findPolicyById(accessPolicyId)) {
      log(`  ℹ️  Access Policy ya existe para ${partner.name}: ${accessPolicyId}`);
      return { success: true, policyId: accessPolicyId };
    }

    log(`  📋 Creando Access Policy para ${partner.name}...`);
    try {
      const result = await api.phase3.createAccessPolicy(partner.bpn);
      
      if (result.success || (result as any).error === 'POLICY_EXISTS') {
        await loadPolicies();  // Reload to get the new policy
        log(`  ✅ Access Policy disponible: ${accessPolicyId}`);
        return { success: true, policyId: accessPolicyId };
      } else {
        const errorMsg = (result as any).error || 'Error desconocido';
        log(`  ❌ Error con Access Policy: ${errorMsg}`);
        if ((result as any).logs) {
          (result as any).logs.forEach((logMsg: string) => log(`     ${logMsg}`));
        }
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      log(`  ❌ Error con Access Policy: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async function createPublicationForAssetPartner(assetId: string, partner: { bpn: string; name: string }): Promise<{ success: boolean; error?: string }> {
    log(`\n📝 Publicando '${assetId}' para ${partner.name} (${partner.bpn})...`);
    
    // 1. Ensure contract-policy-general exists
    const contractPolicyResult = await ensureContractPolicyGeneral();
    if (!contractPolicyResult.success) {
      log(`  ❌ No se pudo asegurar Contract Policy General`);
      return { success: false, error: 'Contract policy general missing' };
    }
    
    // 2. Ensure Access Policy for this partner exists
    const accessPolicyResult = await ensureAccessPolicy(partner);
    if (!accessPolicyResult.success) {
      log(`  ❌ No se pudo asegurar Access Policy para ${partner.name}`);
      return { success: false, error: 'Access policy missing' };
    }
    
    const accessPolicyId = accessPolicyResult.policyId || `access-policy-${partner.bpn.toLowerCase()}`;
    const contractPolicyId = 'contract-policy-general';
    
    // 3. Create Contract Definition
    const contractName = `${assetId}-${partner.name.toLowerCase()}`;
    
    log(`  🔗 Creando Contract Definition: ${contractName}...`);
    
    try {
      const contractResult = await api.phase4.createContractDefinition({
        contractName: contractName,
        assetId: assetId,
        accessPolicyId: accessPolicyId,
        contractPolicyId: contractPolicyId
      });
      
      if (contractResult.success) {
        log(`  ✅ Contract Definition creado exitosamente`);
        return { success: true };
      } else if ((contractResult as any).error === 'CONTRACT_EXISTS') {
        log(`  ℹ️  Contract Definition ya existe`);
        return { success: true };  // Consider this a success
      } else {
        const errorMsg = (contractResult as any).error || 'Error desconocido';
        log(`  ❌ Error creando Contract Definition: ${errorMsg}`);
        if ((contractResult as any).logs) {
          (contractResult as any).logs.forEach((logMsg: string) => log(`     ${logMsg}`));
        }
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      log(`  ❌ Error creando Contract Definition: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async function handleCreateAsset() {
    if (!newAssetId.trim()) {
      alert('Por favor ingresa un Asset ID');
      return;
    }

    // Determine URL based on selection
    let assetUrl: string;
    if (assetUrlType === 'pdf') {
      assetUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    } else if (assetUrlType === 'csv') {
      assetUrl = 'https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv';
    } else if (assetUrlType === 'sharepoint-file' || assetUrlType === 'sharepoint-folder') {
      assetUrl = sharePointUrl;
      if (!assetUrl) {
        alert('Por favor selecciona un archivo o carpeta de SharePoint');
        return;
      }
    } else {
      assetUrl = customUrl.trim();
      if (!assetUrl) {
        alert('Por favor introduce una URL personalizada');
        return;
      }
      if (!assetUrl.startsWith('http://') && !assetUrl.startsWith('https://')) {
        alert('La URL debe comenzar con http:// o https://');
        return;
      }
    }

    setLoading('create');
    log(`🔨 Creando asset: ${newAssetId}`);
    log(`🔗 URL: ${assetUrl}`);
    if (assetDescription) {
      log(`📝 Descripción: ${assetDescription}`);
    }
    try {
      await api.phase2.createAsset(newAssetId, assetUrl, assetDescription || undefined);
      log(`✅ Asset creado: ${newAssetId}`);
      setShowCreateDialog(false);
      setNewAssetId('');
      setAssetDescription('');
      setAssetUrlType('pdf');
      setCustomUrl('');
      setSharePointUrl('');
      setSharePointItemName('');
      setTimeout(() => loadAssets(), 1000);
    } catch (error) {
      log(`❌ Error al crear asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteAsset(assetId: string) {
    if (!confirm(`¿Estás seguro de eliminar el asset "${assetId}"?`)) {
      return;
    }

    setLoading('delete');
    log(`🗑️ Eliminando asset: ${assetId}`);
    try {
      await api.phase2.deleteAsset(assetId);
      log(`✅ Asset eliminado: ${assetId}`);
      setTimeout(() => loadAssets(), 1000);
    } catch (error) {
      log(`❌ Error al eliminar asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  }

  async function handlePublishSelected() {
    if (selectedAssets.size === 0) {
      alert('Selecciona al menos un asset para publicar');
      return;
    }

    // Abrir modal de selección de partners
    setSelectedPartners(new Set());
    setShowPublishDialog(true);
    log(`🔵 Abriendo selector de partners para ${selectedAssets.size} asset(s)`);
  }

  async function confirmPublish() {
    if (selectedPartners.size === 0) {
      alert('Por favor selecciona al menos un partner');
      return;
    }

    setShowPublishDialog(false);
    setLoading('publish');
    
    const selectedPartnerList = Array.from(selectedPartners).map(bpn => {
      const partner = getAvailablePartners().find(p => p.bpn === bpn);
      return partner;
    }).filter(p => p) as { bpn: string; name: string; description: string }[];
    
    const partnerList = selectedPartnerList.map(p => p.name).join(', ');
    
    log(`📤 Publicando ${selectedAssets.size} asset(s) para ${selectedPartners.size} partner(s): ${partnerList}`);
    
    // Ensure contract-policy-general exists before starting
    const contractPolicyResult = await ensureContractPolicyGeneral();
    if (!contractPolicyResult.success) {
      log(`\n❌ No se pudo crear/obtener Contract Policy General. Proceso abortado.`);
      setLoading(null);
      return;
    }
    
    // Track errors during publication
    let hasErrors = false;
    let successCount = 0;
    let failureCount = 0;
    
    // For each combination of asset-partner, create policies and contract definition
    for (const assetId of Array.from(selectedAssets)) {
      for (const partner of selectedPartnerList) {
        const result = await createPublicationForAssetPartner(assetId, partner);
        if (result.success) {
          successCount++;
        } else {
          hasErrors = true;
          failureCount++;
        }
      }
    }
    
    // Show final summary
    if (hasErrors) {
      log(`\n❌ Proceso de publicación finalizado con errores`);
      log(`   ✅ Exitosos: ${successCount}`);
      log(`   ❌ Fallidos: ${failureCount}`);
    } else {
      log(`\n✅ Proceso de publicación completado exitosamente`);
      log(`   Total: ${successCount} contrato(s) creado(s)`);
    }
    
    // Reload data
    await loadAssets();
    await loadPolicies();
    
    // Refresh contract definitions panel if ref available
    if (phase4Ref?.current?.refresh) {
      phase4Ref.current.refresh();
    }
    
    // Clear selections
    setSelectedAssets(new Set());
    setSelectedPartners(new Set());
    setLoading(null);
  }

  function togglePartnerSelection(bpn: string) {
    setSelectedPartners(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bpn)) {
        newSet.delete(bpn);
      } else {
        newSet.add(bpn);
      }
      return newSet;
    });
  }

  function toggleAssetSelection(assetId: string) {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  }

  function toggleAssetExpansion(assetId: string) {
    setExpandedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  }

  useEffect(() => {
    loadAssets();
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: loadAssets
  }));

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };

  const greenButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: 'white',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Actions Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        paddingBottom: '20px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <button
          onClick={() => {
            log('🔵 Botón "Crear Nuevo Asset" pulsado');
            setShowCreateDialog(true);
          }}
          disabled={loading !== null}
          style={greenButtonStyle}
        >
          <Plus size={16} />
          Crear Nuevo Asset
        </button>
        <button
          onClick={handlePublishSelected}
          disabled={loading !== null || selectedAssets.size === 0}
          style={primaryButtonStyle}
        >
          <Upload size={16} />
          {loading === 'publish' ? 'Publicando...' : `Publicar Seleccionados (${selectedAssets.size})`}
        </button>
      </div>

      {/* Assets Grid - 4 columns */}
      {assets.length === 0 && !loading ? (
        <div style={{
          background: '#f8f9fa',
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div>No hay assets publicados</div>
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            Haz clic en &quot;Crear Nuevo Asset&quot; para comenzar
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {assets.map((asset) => {
            const isSelected = selectedAssets.has(asset['@id']);
            const isExpanded = expandedAssets.has(asset['@id']);
            
            return (
              <div
                key={asset['@id']}
                style={{
                  background: isSelected ? '#e0e7ff' : '#f8f9fa',
                  border: `2px solid ${isSelected ? '#667eea' : '#ddd'}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Asset Card Content */}
                <div style={{ padding: '15px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: "'Courier New', monospace",
                        marginBottom: '6px',
                        wordBreak: 'break-word'
                      }}>
                        {asset['@id']}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                      {/* Expand/Collapse Icon */}
                      <button
                        onClick={() => toggleAssetExpansion(asset['@id'])}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#667eea',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#5568d3';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#667eea';
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAssetSelection(asset['@id'])}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#667eea'
                        }}
                      />
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteAsset(asset['@id'])}
                        disabled={loading !== null}
                        style={{
                          background: 'transparent',
                          color: '#dc3545',
                          padding: '2px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#c82333';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#dc3545';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {asset.properties?.description && (
                    <div style={{
                      fontSize: '10px',
                      color: '#666',
                      marginBottom: '4px',
                      lineHeight: '1.3'
                    }}>
                      {asset.properties.description}
                    </div>
                  )}
                </div>

                {/* Expanded Panel - Data Address */}
                {isExpanded && (
                  <div style={{
                    background: '#fafafa',
                    borderTop: '1px solid #e0e0e0',
                    padding: '12px'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#667eea',
                      marginBottom: '8px'
                    }}>
                      📊 Data Address
                    </div>
                    <div style={{
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '9px',
                      fontFamily: "'Courier New', monospace",
                      maxHeight: '150px',
                      overflowY: 'auto',
                      wordBreak: 'break-all'
                    }}>
                      {asset.dataAddress ? (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(asset.dataAddress, null, 2)}
                        </pre>
                      ) : (
                        <div style={{ color: '#999' }}>
                          {JSON.stringify(asset, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Asset Dialog */}
      {showCreateDialog && (
        <>
          {/* Overlay manual */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Modal content */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                position: 'relative',
                zIndex: 9999
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Crear Nuevo Asset
                </h2>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Introduce los datos del asset que deseas publicar
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => {
                  log('❌ Botón cerrar pulsado');
                  setShowCreateDialog(false);
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>

              {/* Form */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Nombre del Asset
                </label>
                <input
                  type="text"
                  placeholder="Ej: pdf-dummy-mass-ikln"
                  value={newAssetId}
                  onChange={(e) => setNewAssetId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && assetUrlType !== 'custom') {
                      handleCreateAsset();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Solo letras minúsculas, números y guiones
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Descripción (opcional)
                </label>
                <textarea
                  placeholder="Descripción del asset"
                  value={assetDescription}
                  onChange={(e) => setAssetDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Proporciona una descripción del asset (opcional)
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Tipo de Archivo
                </label>
                <select
                  value={assetUrlType}
                  onChange={(e) => {
                    const newType = e.target.value as 'pdf' | 'csv' | 'custom' | 'sharepoint-file' | 'sharepoint-folder';
                    setAssetUrlType(newType);
                    // Limpiar URL de SharePoint si cambia de tipo
                    if (newType !== 'sharepoint-file' && newType !== 'sharepoint-folder') {
                      setSharePointUrl('');
                      setSharePointItemName('');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="pdf">📄 PDF de prueba</option>
                  <option value="csv">📊 CSV de prueba</option>
                  <option value="custom">✏️ URL personalizada</option>
                  <option value="sharepoint-file">📄 Documento de SharePoint</option>
                  <option value="sharepoint-folder">📁 Carpeta de SharePoint</option>
                </select>
              </div>

              {/* Mostrar URL para PDF y CSV (solo lectura) */}
              {(assetUrlType === 'pdf' || assetUrlType === 'csv') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    URL del archivo
                  </label>
                  <input
                    type="text"
                    value={
                      assetUrlType === 'pdf'
                        ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
                        : 'https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv'
                    }
                    readOnly
                    style={{
                      width: '90%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              )}

              {/* Input para URL personalizada */}
              {assetUrlType === 'custom' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    URL Personalizada
                  </label>
                  <input
                    type="text"
                    placeholder="https://ejemplo.com/archivo.csv"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateAsset();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    Introduce la URL completa del recurso
                  </p>
                </div>
              )}

              {/* Selector de SharePoint */}
              {(assetUrlType === 'sharepoint-file' || assetUrlType === 'sharepoint-folder') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    {assetUrlType === 'sharepoint-file' ? 'Archivo de SharePoint' : 'Carpeta de SharePoint'}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={sharePointItemName || 'Ningún elemento seleccionado'}
                      readOnly
                      placeholder={assetUrlType === 'sharepoint-file' ? 'Selecciona un archivo' : 'Selecciona una carpeta'}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#f5f5f5',
                        color: sharePointItemName ? '#333' : '#999',
                        cursor: 'not-allowed'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSharePointToggle}
                      style={{
                        padding: '8px 16px',
                        background: showSharePointPicker 
                          ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = showSharePointPicker 
                          ? '0 4px 12px rgba(244, 63, 94, 0.4)'
                          : '0 4px 12px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {showSharePointPicker ? (
                        <>
                          <ChevronUp size={16} />
                          Cerrar
                        </>
                      ) : (
                        <>
                          <FolderOpen size={16} />
                          {assetUrlType === 'sharepoint-file' ? 'Seleccionar Archivo' : 'Seleccionar Carpeta'}
                        </>
                      )}
                    </button>
                  </div>
                  {sharePointUrl && (
                    <p style={{ fontSize: '11px', color: '#666', marginTop: '6px', wordBreak: 'break-all' }}>
                      URL: {sharePointUrl}
                    </p>
                  )}
                  
                  {/* SharePoint Browser Panel */}
                  {showSharePointPicker && (
                    <div style={{
                      marginTop: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#f9fafb'
                    }}>
                      {/* Breadcrumb Navigation */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '12px',
                        background: '#fff',
                        borderBottom: '1px solid #e5e7eb',
                        fontSize: '14px',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => handleSharePointBreadcrumbClick(0)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: sharePointFolderPath.length === 0 ? '#3b82f6' : 'transparent',
                            color: sharePointFolderPath.length === 0 ? 'white' : '#3b82f6',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          <Home size={16} />
                          IKDataSpace
                        </button>
                        
                        {sharePointFolderPath.map((folder, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronRight size={16} color="#9ca3af" />
                            <button
                              onClick={() => handleSharePointBreadcrumbClick(index + 1)}
                              style={{
                                padding: '4px 8px',
                                background: index === sharePointFolderPath.length - 1 ? '#3b82f6' : 'transparent',
                                color: index === sharePointFolderPath.length - 1 ? 'white' : '#3b82f6',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              {folder}
                            </button>
                          </div>
                        ))}

                        {sharePointAccessToken && (
                          <button
                            onClick={() => {
                              const currentFolderId = sharePointFolderIds[sharePointFolderIds.length - 1];
                              // Extract item_id from composite format
                              const itemId = currentFolderId ? 
                                (currentFolderId.includes('|') ? currentFolderId.split('|')[1] : currentFolderId) : 
                                undefined;
                              loadSharePointFiles(sharePointAccessToken, itemId);
                            }}
                            style={{
                              marginLeft: 'auto',
                              padding: '4px 8px',
                              background: 'transparent',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            disabled={sharePointLoading}
                          >
                            <RefreshCw size={14} className={sharePointLoading ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </div>

                      {/* Error Message */}
                      {sharePointError && (
                        <div style={{
                          padding: '12px',
                          background: '#fef2f2',
                          borderBottom: '1px solid #fca5a5',
                          color: '#dc2626',
                          fontSize: '14px'
                        }}>
                          {sharePointError}
                        </div>
                      )}

                      {/* Loading State */}
                      {sharePointLoading && (
                        <div style={{ 
                          padding: '40px', 
                          textAlign: 'center',
                          background: '#fff'
                        }}>
                          <RefreshCw size={24} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto' }} />
                          <p style={{ color: '#6b7280', marginTop: '12px' }}>Cargando archivos...</p>
                        </div>
                      )}

                      {/* Files List */}
                      {!sharePointLoading && !sharePointError && sharePointFiles.length > 0 && (
                        <div style={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          background: '#fff'
                        }}>
                          {sharePointFiles.map((file) => (
                            <div
                              key={file.id}
                              onClick={() => {
                                if (file.isFolder) {
                                  if (assetUrlType === 'sharepoint-folder') {
                                    // Can select folder
                                    handleSharePointItemSelect(file);
                                  } else {
                                    // Navigate into folder
                                    handleSharePointFolderClick(file);
                                  }
                                } else {
                                  // Select file
                                  handleSharePointItemSelect(file);
                                }
                              }}
                              style={{
                                padding: '12px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f3f4f6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff';
                              }}
                            >
                              {file.isFolder ? (
                                <FolderOpen size={20} color="#f59e0b" />
                              ) : (
                                <File size={20} color="#6b7280" />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  color: '#111827',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {file.name}
                                </div>
                                {!file.isFolder && file.size && (
                                  <div style={{
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    marginTop: '2px'
                                  }}>
                                    {formatFileSize(file.size)}
                                  </div>
                                )}
                              </div>
                              {file.isFolder && assetUrlType === 'sharepoint-file' && (
                                <ChevronRight size={16} color="#9ca3af" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No Files */}
                      {!sharePointLoading && !sharePointError && sharePointFiles.length === 0 && sharePointAccessToken && (
                        <div style={{ 
                          padding: '40px', 
                          textAlign: 'center',
                          background: '#fff',
                          color: '#6b7280'
                        }}>
                          <p>No hay {assetUrlType === 'sharepoint-folder' ? 'carpetas' : 'archivos'} en esta ubicación</p>
                        </div>
                      )}

                      {/* Authentication Required */}
                      {!sharePointAccessToken && !sharePointLoading && (
                        <div style={{ 
                          padding: '40px', 
                          textAlign: 'center',
                          background: '#fff'
                        }}>
                          <RefreshCw size={32} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 12px' }} />
                          <p style={{ color: '#6b7280', marginBottom: '8px' }}>Autenticando con Azure AD...</p>
                          <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                            Si aparece una ventana popup, por favor autoriza el acceso
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewAssetId('');
                    setAssetDescription('');
                    setAssetUrlType('pdf');
                    setCustomUrl('');
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateAsset}
                  disabled={loading !== null}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: loading !== null ? '#ccc' : '#667eea',
                    color: 'white',
                    cursor: loading !== null ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {loading === 'create' ? 'Creando...' : 'Crear Asset'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Dialog original comentado */}
      {/*
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        console.log('[Phase2] Dialog onOpenChange llamado con:', open);
        log(`🔄 Dialog cambiando a: ${open ? 'abierto' : 'cerrado'}`);
        setShowCreateDialog(open);
      }}>
        <DialogContent 
          className="sm:max-w-[500px]"
          onOpenAutoFocus={(e) => {
            console.log('[Phase2] Dialog onOpenAutoFocus disparado');
            log('👁️ Dialog recibiendo foco');
          }}
        >
          <DialogHeader>
            <DialogTitle>Crear Nuevo Asset</DialogTitle>
            <DialogDescription>
              Introduce los datos del asset que deseas publicar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assetId">Nombre del Asset</Label>
              <Input
                id="assetId"
                placeholder="Ej: pdf-dummy-mass-ikln"
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && assetUrlType !== 'custom') {
                    handleCreateAsset();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="urlType">URL del Asset</Label>
              <Select value={assetUrlType} onValueChange={(value: 'pdf' | 'csv' | 'custom') => setAssetUrlType(value)}>
                <SelectTrigger id="urlType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">📄 PDF de prueba (dummy.pdf)</SelectItem>
                  <SelectItem value="csv">📊 Dataset de vinos (winequality-red.csv)</SelectItem>
                  <SelectItem value="custom">✏️ URL personalizada...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assetUrlType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customUrl">URL Personalizada</Label>
                <Input
                  id="customUrl"
                  placeholder="https://ejemplo.com/archivo.csv"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateAsset();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Introduce la URL completa del recurso</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setNewAssetId('');
              setAssetUrlType('pdf');
              setCustomUrl('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAsset} disabled={loading !== null}>
              {loading === 'create' ? 'Creando...' : 'Crear Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}

      {/* Publish to Partners Dialog */}
      {showPublishDialog && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Modal content */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                position: 'relative',
                zIndex: 9999
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                  🚀 Publicar Assets a Partners
                </h2>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Selecciona los partners con los que deseas compartir los assets seleccionados
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => {
                  log('❌ Cancelando publicación');
                  setShowPublishDialog(false);
                  setSelectedPartners(new Set());
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>

              {/* Partners list */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                  Partners Disponibles:
                </label>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {getAvailablePartners().map(partner => (
                    <div
                      key={partner.bpn}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        marginBottom: '8px',
                        borderRadius: '4px',
                        backgroundColor: selectedPartners.has(partner.bpn) ? '#e0e7ff' : '#f8f9fa',
                        border: `1px solid ${selectedPartners.has(partner.bpn) ? '#667eea' : '#e0e0e0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => togglePartnerSelection(partner.bpn)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPartners.has(partner.bpn)}
                        onChange={() => togglePartnerSelection(partner.bpn)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#667eea',
                          marginRight: '12px'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                          {partner.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', fontFamily: "'Courier New', monospace" }}>
                          {partner.bpn}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  Selecciona uno o varios partners
                </p>
              </div>

              {/* Footer buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                <button
                  onClick={() => {
                    setShowPublishDialog(false);
                    setSelectedPartners(new Set());
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPublish}
                  disabled={selectedPartners.size === 0}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: selectedPartners.size === 0 ? '#ccc' : '#11998e',
                    color: 'white',
                    cursor: selectedPartners.size === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

Phase2Content.displayName = 'Phase2Content';
export default Phase2Content;

