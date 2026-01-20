'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OTSearchResultsProps {
  results: any[];
}

export function OTSearchResults({ results }: OTSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-dashed">
        <p className="text-muted-foreground">No se encontraron resultados para esta OT.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {results.map((detail: any) => (
          <Card key={detail.id} className="p-6 bg-card/50 backdrop-blur border-border overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 pb-4 border-b">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">
                    {format(new Date(detail.item.report.date), "PPP", { locale: es })}
                  </h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {detail.item.report.shift}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">
                  {detail.item.report.area.name} / {detail.item.machine.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground italic">Reportado por</p>
                <p className="text-md font-semibold text-black">{detail.item.report.gestor?.name || 'Gestor no asignado'}</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Operario: {detail.item.operator?.name || 'No asignado'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricItem label="Eficiencia" value={`${detail.efficiency}%`} color="text-blue-400" />
              <MetricItem label="MT PROG" value={detail.mtProg} color="text-emerald-400" />
              <MetricItem label="MT PROD" value={detail.mtProd} color="text-emerald-400" />
              <MetricItem label="KG PROD" value={detail.kgProd} color="text-purple-400" />
              <MetricItem label="KG DESP" value={detail.kgDesp} color="text-rose-400" />
            </div>

            {detail.variations && detail.variations.length > 0 && (
              <div className="mt-6 pt-6 border-t space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Novedades / Variaciones</h4>
                <div className="grid gap-3">
                  {detail.variations.map((v: any, idx: number) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                         <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px]">{v.stage}</Badge>
                         <span className="text-sm font-bold text-white/90">{v.program?.name || 'Sin causa seleccionada'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground italic pl-1">{v.analysis || 'Sin análisis adicional'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricItem({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value || '0'}</p>
    </div>
  );
}
