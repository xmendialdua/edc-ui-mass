'use client';

import { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export type PhaseStatus = 'pending' | 'running' | 'complete' | 'error';

interface PhaseData {
  id: string;
  number: number;
  title: string;
  description: string;
  status: PhaseStatus;
  content: ReactNode;
}

interface PhaseAccordionProps {
  phases: PhaseData[];
  defaultOpen?: string;
}

const statusConfig: Record<PhaseStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'outline' },
  running: { label: 'En Progreso', variant: 'default' },
  complete: { label: 'Completo', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
};

export function PhaseAccordion({ phases, defaultOpen }: PhaseAccordionProps) {
  return (
    <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={defaultOpen}>
      {phases.map((phase) => (
        <AccordionItem
          key={phase.id}
          value={phase.id}
          className="border rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-sm">
                  {phase.number}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {phase.title}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {phase.description}
                  </div>
                </div>
              </div>
              <Badge variant={statusConfig[phase.status].variant}>
                {statusConfig[phase.status].label}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            {phase.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
