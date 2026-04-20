'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogsViewer } from '@/components/logs/logs-viewer';
import { api } from '@/lib/api';
import { Server, Package, Shield, Key, Sprout } from 'lucide-react';

export default function Phase1Content() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckConnectivity() {
    setLoading('connectivity');
    setLogs([]);
    try {
      const result = await api.phase1.checkConnectivity();
      setLogs(result.logs);
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setLoading(null);
    }
  }

  async function handleCheckPods() {
    setLoading('pods');
    setLogs([]);
    try {
      const result = await api.phase1.checkPods();
      setLogs(result.logs);
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setLoading(null);
    }
  }

  async function handleCheckTrust() {
    setLoading('trust');
    setLogs([]);
    try {
      const result = await api.phase1.checkTrust();
      setLogs(result.logs);
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setLoading(null);
    }
  }

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

  const infoButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: 'white',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <button
          onClick={handleCheckConnectivity}
          disabled={loading !== null}
          style={greenButtonStyle}
        >
          <Server size={16} />
          {loading === 'connectivity' ? 'Verificando...' : 'Verificar Conectividad'}
        </button>

        <button
          onClick={handleCheckPods}
          disabled={loading !== null}
          style={infoButtonStyle}
        >
          <Package size={16} />
          {loading === 'pods' ? 'Verificando...' : 'Estado de Pods'}
        </button>

        <button
          onClick={handleCheckTrust}
          disabled={loading !== null}
          style={primaryButtonStyle}
        >
          <Shield size={16} />
          {loading === 'trust' ? 'Verificando...' : 'Verificar Trust'}
        </button>
      </div>

      {logs.length > 0 && <LogsViewer logs={logs} />}
    </div>
  );
}
