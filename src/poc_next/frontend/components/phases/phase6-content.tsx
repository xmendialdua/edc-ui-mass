'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogsViewer } from '@/components/logs/logs-viewer';
import { api } from '@/lib/api';
import { Search, Handshake, Download, ArrowRight } from 'lucide-react';

interface Asset {
  '@id': string;
  '@type': string;
  policy?: any;
}

const Phase6Content = forwardRef<{ refresh: () => void }>((props, ref) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [contractAgreementId, setContractAgreementId] = useState<string>('');

  async function handleCatalogRequest() {
    setLoading('catalog');
    setLogs([]);
    try {
      const result = await api.phase6.catalogRequest();
      setAssets(result.datasets || []);
      setLogs(result.logs);
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setLoading(null);
    }
  }

  async function handleNegotiate(asset: Asset) {
    if (!asset.policy) {
      alert('Este asset no tiene policy disponible');
      return;
    }

    setLoading('negotiate');
    setLogs([]);
    setSelectedAsset(asset);
    try {
      const result = await api.phase6.negotiate({
        assetId: asset['@id'],
        policy: asset.policy,
      });
      setLogs(result.logs);
      // El backend debería devolver el contractAgreementId en los logs
      // Por ahora, simulamos extrayéndolo de los logs
      const agreementLine = result.logs.find(log => log.includes('Agreement ID:'));
      if (agreementLine) {
        const match = agreementLine.match(/Agreement ID:\s*([^\s]+)/);
        if (match) {
          setContractAgreementId(match[1]);
        }
      }
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setLoading(null);
    }
  }

  async function handleTransfer() {
    if (!contractAgreementId || !selectedAsset) {
      alert('Primero debes negociar un asset');
      return;
    }

    setLoading('transfer');
    setLogs([]);
    try {
      const result = await api.phase6.initiateTransfer({
        contractAgreementId,
        assetId: selectedAsset['@id'],
      });
      setLogs(result.logs);
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setLoading(null);
    }
  }

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: handleCatalogRequest
  }));

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm">
        <h4 className="font-semibold mb-2">🎯 Objetivo</h4>
        <p className="text-slate-600 dark:text-slate-400 mb-3">
          Negociar contratos, iniciar transferencias y descargar datos.
        </p>
        
        <h4 className="font-semibold mb-2">📡 Operaciones</h4>
        <ul className="text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
          <li>Consultar catálogo</li>
          <li>Negociar contrato con asset</li>
          <li>Iniciar transferencia EDR</li>
          <li>Monitorear estado de transferencia</li>
          <li>Descargar archivo con token EDR</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleCatalogRequest}
          disabled={loading !== null}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          {loading === 'catalog' ? 'Consultando...' : 'Consultar Catálogo'}
        </Button>

        {contractAgreementId && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-md text-sm text-green-700 dark:text-green-300 font-mono">
              <span className="font-semibold">Contract ID:</span>
              <span className="truncate max-w-xs">{contractAgreementId}</span>
            </div>
            <Button
              onClick={handleTransfer}
              disabled={loading !== null}
              variant="secondary"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {loading === 'transfer' ? 'Iniciando...' : 'Iniciar Transferencia'}
            </Button>
          </>
        )}
      </div>

      {/* Assets Grid */}
      {assets.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Assets Disponibles ({assets.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <Card key={asset['@id']}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Asset</CardTitle>
                  <CardDescription className="text-xs font-mono truncate">
                    {asset['@id']}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs">
                    <span className="font-semibold">Type:</span> {asset['@type']}
                  </div>
                  <Button
                    onClick={() => handleNegotiate(asset)}
                    disabled={loading !== null}
                    size="sm"
                    className="w-full gap-2"
                  >
                    <Handshake className="h-4 w-4" />
                    {loading === 'negotiate' && selectedAsset?.['@id'] === asset['@id']
                      ? 'Negociando...'
                      : 'Negociar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Visual */}
      {selectedAsset && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flujo de Negociación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-center">
                <div className="font-semibold text-blue-700 dark:text-blue-300">1. Catálogo</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Consultar assets</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className={`flex-1 p-3 rounded-md text-center ${contractAgreementId ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <div className={`font-semibold ${contractAgreementId ? 'text-green-700 dark:text-green-300' : 'text-slate-500'}`}>2. Negociación</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Obtener contract</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-center">
                <div className="font-semibold text-slate-500">3. Transferencia</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Obtener EDR token</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-center">
                <div className="font-semibold text-slate-500">4. Descarga</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Acceder a datos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && <LogsViewer logs={logs} title="Transfer Logs" />}
    </div>
  );
});

Phase6Content.displayName = 'Phase6Content';

export default Phase6Content;
