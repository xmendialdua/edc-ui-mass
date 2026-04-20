'use client';

import { useState } from 'react';
import { PhaseAccordion, type PhaseStatus } from '@/components/phases/phase-accordion';
import Phase1Content from '@/components/phases/phase1-content';
import Phase2Content from '@/components/phases/phase2-content';
import Phase3Content from '@/components/phases/phase3-content';
import Phase4Content from '@/components/phases/phase4-content';
import Phase5Content from '@/components/phases/phase5-content';
import Phase6Content from '@/components/phases/phase6-content';
import { Database } from 'lucide-react';

export default function Home() {
  const [phaseStatuses] = useState<Record<string, PhaseStatus>>({
    phase1: 'pending',
    phase2: 'pending',
    phase3: 'pending',
    phase4: 'pending',
    phase5: 'pending',
    phase6: 'pending',
  });

  const phases = [
    {
      id: 'phase1',
      number: 1,
      title: 'Verificación de Prerequisitos',
      description: 'Conectividad APIs, estado de pods y verificación de trust',
      status: phaseStatuses.phase1,
      content: <Phase1Content />,
    },
    {
      id: 'phase2',
      number: 2,
      title: 'Gestión de Assets',
      description: 'Crear, listar y eliminar assets en el conector EDC',
      status: phaseStatuses.phase2,
      content: <Phase2Content />,
    },
    {
      id: 'phase3',
      number: 3,
      title: 'Gestión de Políticas',
      description: 'Access policies y contract policies con restricciones BPN',
      status: phaseStatuses.phase3,
      content: <Phase3Content />,
    },
    {
      id: 'phase4',
      number: 4,
      title: 'Definiciones de Contratos',
      description: 'Contract definitions que vinculan assets con políticas',
      status: phaseStatuses.phase4,
      content: <Phase4Content />,
    },
    {
      id: 'phase5',
      number: 5,
      title: 'Solicitud de Catálogo',
      description: 'Consultar catálogo de assets disponibles',
      status: phaseStatuses.phase5,
      content: <Phase5Content />,
    },
    {
      id: 'phase6',
      number: 6,
      title: 'Descubrimiento y Transferencia',
      description: 'Negociación, transferencia y descarga de datos',
      status: phaseStatuses.phase6,
      content: <Phase6Content />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Database className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              POC Next Dashboard
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Eclipse Tractus-X EDC - Asset Publishing Workflow
          </p>
          <div className="mt-4 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div>
              <span className="font-semibold">Provider:</span> BPNL00000000MASS
            </div>
            <div>
              <span className="font-semibold">Consumer:</span> BPNL00000002IKLN
            </div>
          </div>
        </div>

        {/* Phase Accordion */}
        <PhaseAccordion phases={phases} defaultOpen="phase1" />

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500">
          <p>🚀 Built with Next.js 15 + FastAPI | Tractus-X EDC Connectors</p>
        </div>
      </div>
    </div>
  );
}
