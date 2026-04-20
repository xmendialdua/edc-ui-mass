'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogsViewer } from '@/components/logs/logs-viewer';
import { api } from '@/lib/api';
import { Search, Package } from 'lucide-react';

interface Dataset {
  '@id': string;
  '@type': string;
  'odrl:hasPolicy'?: any;
  'dcat:distribution'?: any[];
  offers?: any[];
}

export default function Phase5Content() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  async function handleCatalogRequest() {
    setLoading(true);
    setLogs([]);
    try {
      const result = await api.phase5.catalogRequest();
      setDatasets(result.datasets || []);
      setLogs(result.logs);
      if (result.datasets && result.datasets.length > 0) {
        setSelectedDataset(result.datasets[0]);
      }
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm">
        <h4 className="font-semibold mb-2">🎯 Objetivo</h4>
        <p className="text-slate-600 dark:text-slate-400 mb-3">
          Consultar el catálogo de assets disponibles desde otro conector.
        </p>
        
        <h4 className="font-semibold mb-2">🔍 Operaciones</h4>
        <ul className="text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
          <li>Solicitar catálogo al conector provider (MASS)</li>
          <li>Ver datasets disponibles y sus políticas</li>
        </ul>
      </div>

      <Button
        onClick={handleCatalogRequest}
        disabled={loading}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        {loading ? 'Consultando Catálogo...' : 'Solicitar Catálogo (IKLN → MASS)'}
      </Button>

      {/* Datasets Grid */}
      {datasets.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Datasets Disponibles ({datasets.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets.map((dataset) => (
              <Card
                key={dataset['@id']}
                className={`cursor-pointer transition-all ${
                  selectedDataset?.['@id'] === dataset['@id']
                    ? 'ring-2 ring-primary'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => setSelectedDataset(dataset)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="truncate">Dataset</span>
                  </CardTitle>
                  <CardDescription className="text-xs font-mono truncate">
                    {dataset['@id']}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Type:</span> {dataset['@type']}
                    </div>
                    {dataset.offers && (
                      <div>
                        <span className="font-semibold">Offers:</span> {dataset.offers.length}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Dataset Detail */}
      {selectedDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle del Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(selectedDataset, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && <LogsViewer logs={logs} title="Catalog Logs" />}
    </div>
  );
}
