'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal } from 'lucide-react';

interface LogsViewerProps {
  logs: string[];
  title?: string;
  autoScroll?: boolean;
}

export function LogsViewer({ logs, title = 'Logs', autoScroll = true }: LogsViewerProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-950 text-slate-200 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic">No hay logs aún...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="py-0.5 whitespace-pre-wrap break-words">
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
