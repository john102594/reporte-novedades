import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface OTSearchResultsProps {
  results: {
    details: any[];
    additionalVariations: any[];
  } | any[]; // Fallback for backward compatibility or initial state
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'POR_REVISAR': return <Badge variant="destructive" className="h-5 px-2 text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">POR REVISAR</Badge>;
    case 'REVISADA': return <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">REVISADA</Badge>;
    case 'EN_PLAN_DE_ACCION': return <Badge variant="outline" className="h-5 px-2 text-[10px] bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">EN PLAN</Badge>;
    case 'FINALIZADA': return <Badge variant="default" className="h-5 px-2 text-[10px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">FINALIZADA</Badge>;
    default: return <Badge variant="secondary" className="h-5 px-2 text-[10px]">{status || 'PENDIENTE'}</Badge>;
  }
};

export function OTSearchResults({ results }: OTSearchResultsProps) {
  // Normalize results
  const details = Array.isArray(results) ? results : results?.details || [];
  const additionalVariations = !Array.isArray(results) ? results?.additionalVariations || [] : [];

  if (details.length === 0 && additionalVariations.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-dashed">
        <p className="text-muted-foreground">No se encontraron resultados para esta OT.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Additional Variations Section */}
      {additionalVariations.length > 0 && (
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
             <Badge variant="destructive" className="animate-pulse">Variaciones Adicionales</Badge>
             <span className="text-sm text-muted-foreground font-normal">(Fuera de Producción)</span>
           </h3>
           <div className="grid gap-4">
             {additionalVariations.map((av: any) => (
                <Card key={av.id} className="p-3 bg-red-50/10 border-red-200/20 dark:border-red-900/30 hover:bg-red-50/20 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                     <div className="flex-1 space-y-2">
                        {/* Header Line */}
                        <div className="flex items-center gap-2 flex-wrap">
                           <Badge variant="outline" className="text-red-500 border-red-500/50 h-5 px-2 text-[10px]">{av.type?.name || 'GENÉRICA'}</Badge>
                           <span className="text-xs font-medium text-muted-foreground">{format(new Date(av.createdAt), "PPP p", { locale: es })}</span>
                           {getStatusBadge(av.actionTask?.status)}
                        </div>
                        
                        {/* Metrics Line */}
                        <div className="flex items-center gap-4 text-xs">
                           <div className="flex items-center gap-1">
                              <span className="font-bold text-muted-foreground uppercase text-[10px]">Cantidad:</span>
                              <span className="font-black text-red-500">{av.quantity} Kg</span>
                           </div>
                           <div className="h-3 w-px bg-border"></div>
                           <div className="flex items-center gap-1">
                              <span className="font-bold text-muted-foreground uppercase text-[10px]">Reportado por:</span>
                              <span className="font-medium text-foreground">{av.createdBy?.name || 'Desconocido'}</span>
                              {av.area?.name && (
                                 <>
                                    <span className="text-muted-foreground mx-1">•</span>
                                    <span className="font-medium text-primary/80">{av.area.name}</span>
                                 </>
                              )}
                           </div>
                        </div>

                        {/* Observation */}
                        {av.description && (
                           <div className="text-xs text-muted-foreground italic bg-red-500/5 p-2 rounded-md border border-red-500/10">
                              "{av.description}"
                           </div>
                        )}
                     </div>

                     {/* Action Button */}
                     <div className="flex items-center h-full pt-1">
                        <Link href={av.actionTask?.id ? `/variation-analysis?taskId=${av.actionTask.id}` : '#'}>
                           <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold shadow-sm hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all cursor-pointer group">
                              Ver Análisis <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                           </div>
                        </Link>
                     </div>
                  </div>
                </Card>
             ))}
           </div>
        </div>
      )}

      {/* Production Details Section */}
      {details.length > 0 && (
         <div className="grid gap-6">
           <h3 className="text-lg font-bold text-foreground">Reportes de Producción</h3> 
           {details.map((detail: any) => (
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
      )}
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
