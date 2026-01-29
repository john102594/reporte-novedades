'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Users, Package, Calendar, User, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  updateAdditionalVariation,
  type VariationStatus
} from '@/app/actions/additional-variations';
import { getActionTaskById } from '@/app/actions/action-tasks';
import { TaskReviewDialog } from '@/components/variation-analysis/task-review-dialog';

interface VariationType {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface Operator {
  id: string;
  name: string | null;
}

interface AdditionalVariation {
  id: string;
  ot: string;
  type: VariationType;
  quantity: number;
  description: string | null;
  status: VariationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null } | null;
  responsibleOperators: Operator[];
  actionTask: { id: string; status: string; cause: string | null } | null;
}

interface VariationListProps {
  variations: AdditionalVariation[];
  onRefresh: () => void;
  currentUser: { id: string; role: string } | null;
  users: { id: string; name: string | null; role: string }[];
  causes: { id: string; name: string }[];
  openPlans: { id: string; name: string }[];
}

const statusLabels: Record<VariationStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_ANALISIS: 'En Análisis',
  RESUELTO: 'Resuelto'
};

const statusColors: Record<VariationStatus, string> = {
  PENDIENTE: 'bg-slate-100 text-slate-700',
  EN_ANALISIS: 'bg-orange-100 text-orange-700',
  RESUELTO: 'bg-green-100 text-green-700'
};

export function VariationList({ variations, onRefresh, currentUser, users, causes, openPlans }: VariationListProps) {
  const [selectedVariation, setSelectedVariation] = useState<AdditionalVariation | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Task Review Dialog State
  const [taskReviewOpen, setTaskReviewOpen] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleStatusChange = async (id: string, newStatus: VariationStatus) => {
    setIsUpdating(true);
    try {
      const result = await updateAdditionalVariation(id, { status: newStatus });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Estado actualizado');
        onRefresh();
      }
    } catch (error) {
      toast.error('Error al actualizar estado');
    } finally {
      setIsUpdating(false);
    }
  };

  if (variations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Package className="w-12 h-12" />
          <div>
            <p className="font-medium">No hay variaciones registradas</p>
            <p className="text-sm">Cree una nueva variación para comenzar</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-bold">OT</TableHead>
                <TableHead className="font-bold">Tipo</TableHead>
                <TableHead className="font-bold">Causa</TableHead>
                <TableHead className="font-bold text-right">Cantidad</TableHead>
                <TableHead className="font-bold">Operadores</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="font-bold">Tarea</TableHead>
                <TableHead className="font-bold">Creado</TableHead>
                <TableHead className="font-bold text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map((variation) => (
                <TableRow key={variation.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono font-bold text-primary">
                    {variation.ot}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border text-xs">
                      {variation.type.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {variation.actionTask?.cause ? (
                      <span className="text-sm text-slate-700">{variation.actionTask.cause}</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin causa</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {variation.quantity.toLocaleString()} <span className="text-slate-400 font-normal">kg</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-sm">
                        {variation.responsibleOperators.length} operador(es)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={variation.status}
                      onValueChange={(value) => handleStatusChange(variation.id, value as VariationStatus)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                        <SelectItem value="EN_ANALISIS">En Análisis</SelectItem>
                        <SelectItem value="RESUELTO">Resuelto</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {variation.actionTask ? (
                      <Link 
                        href="/variation-analysis" 
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Ver tarea
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {format(new Date(variation.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVariation(variation)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedVariation} onOpenChange={() => setSelectedVariation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalle de Variación
            </DialogTitle>
            <DialogDescription>
              OT: <span className="font-mono font-bold text-primary">{selectedVariation?.ot}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedVariation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Tipo</p>
                  <Badge variant="outline" className="border">
                    {selectedVariation.type.name}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Cantidad</p>
                  <p className="font-bold text-lg">{selectedVariation.quantity.toLocaleString()} kg</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Estado</p>
                  <Badge className={statusColors[selectedVariation.status]}>
                    {statusLabels[selectedVariation.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Causa</p>
                  <p className="text-sm font-medium">
                    {selectedVariation.actionTask?.cause || <span className="text-slate-400 italic">Sin causa asignada</span>}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Operadores Responsables
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedVariation.responsibleOperators.map(op => (
                    <Badge key={op.id} variant="secondary">
                      {op.name || 'Sin nombre'}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedVariation.description && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Descripción</p>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedVariation.description}</p>
                </div>
              )}

              {selectedVariation.actionTask && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs font-bold uppercase text-primary mb-1">Tarea de Seguimiento</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{selectedVariation.actionTask.status}</Badge>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-sm text-primary hover:underline flex items-center gap-1 p-0 h-auto"
                      disabled={loadingTask}
                      onClick={async () => {
                        if (!selectedVariation.actionTask?.id) return;
                        setLoadingTask(true);
                        try {
                          const result = await getActionTaskById(selectedVariation.actionTask.id);
                          if ('error' in result) {
                            toast.error('No se pudo cargar la tarea');
                          } else {
                            setSelectedTask(result.task);
                            setSelectedVariation(null); // Close detail dialog
                            setTaskReviewOpen(true);
                          }
                        } catch (error) {
                          toast.error('Error al cargar la tarea');
                        } finally {
                          setLoadingTask(false);
                        }
                      }}
                    >
                      {loadingTask ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          Ver en análisis
                          <ExternalLink className="w-3 h-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Creado por
                  </p>
                  <p className="text-sm">{selectedVariation.createdBy?.name || 'Desconocido'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha
                  </p>
                  <p className="text-sm">
                    {format(new Date(selectedVariation.createdAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Review Dialog - Opens when clicking "Ver en análisis" */}
      {selectedTask && (
        <TaskReviewDialog
          task={selectedTask}
          currentUser={currentUser}
          users={users}
          causes={causes}
          openPlans={openPlans}
          onUpdate={() => {
            setTaskReviewOpen(false);
            setSelectedTask(null);
            onRefresh();
          }}
          externalOpen={taskReviewOpen}
          onExternalOpenChange={(open) => {
            setTaskReviewOpen(open);
            if (!open) setSelectedTask(null);
          }}
        />
      )}
    </>
  );
}
