'use client';

import { useState } from 'react';
import { 
  updateTaskAnalysis, 
  revokeActionPlan
} from '@/app/actions/action-tasks';
import { assignTaskToPlan, createActionPlan } from '@/app/actions/action-plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, UserCircle, Send, CheckCircle2, X, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function TaskReviewDialog({ task, currentUser, users, onUpdate, causes, openPlans }: {
  task: {
    id: string;
    ot: string;
    cause: string;
    details: string;
    rootCauseAnalysis: string | null;
    status: string;
    responsibleId: string | null;
    createdAt: string | Date;
    actionPlanId: string | null;
    actionPlan?: { id: string; name: string } | null;
  }, 
  currentUser: { id: string, role: string } | null, 
  users: { id: string; name: string | null; role: string }[],
  causes: { id: string; name: string }[],
  openPlans: { id: string; name: string }[],
  onUpdate: () => void 
}) {
  const [open, setOpen] = useState(false);
  const [rca, setRca] = useState(task.rootCauseAnalysis || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Cause Edit State
  const [selectedCause, setSelectedCause] = useState(task.cause);

  // Assignment State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanStart, setNewPlanStart] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const canEditRCA = (currentUser?.role?.toUpperCase() === 'COORDINATOR' || currentUser?.role?.toUpperCase() === 'MANAGER') && 
                     (task.status === 'POR_REVISAR' || task.status === 'REVISADA');
  
  const canAssignPlan = (currentUser?.role?.toUpperCase() === 'MANAGER' || currentUser?.role?.toUpperCase() === 'COORDINATOR') && 
                        (task.status === 'REVISADA');

  const canRevokePlan = (currentUser?.role?.toUpperCase() === 'MANAGER' || currentUser?.role?.toUpperCase() === 'COORDINATOR' || currentUser?.role?.toUpperCase() === 'ADMIN') && 
                        task.status === 'EN_PLAN_DE_ACCION';

  const handleUpdateRCA = async () => {
    if (!rca) return;
    setIsSaving(true);
    try {
      const res = await updateTaskAnalysis(task.id, rca, selectedCause);
      if ('success' in res) {
          toast.success('Análisis actualizado');
          onUpdate();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignExisting = async () => {
    if (!selectedPlanId) return;
    setIsAssigning(true);
    const res = await assignTaskToPlan(task.id, selectedPlanId);
    if (res.success) {
        toast.success('Tarea asignada al plan');
        onUpdate();
        setOpen(false);
    } else {
        toast.error('Error al asignar plan');
    }
    setIsAssigning(false);
  };

  const handleCreateAndAssign = async () => {
    if (!newPlanName || !newPlanStart) return;
    setIsAssigning(true);
    // 1. Create Plan
    const planRes = await createActionPlan({
        name: newPlanName,
        startDate: newPlanStart
    });

    if (planRes.success && planRes.plan) {
        // 2. Assign
        const assignRes = await assignTaskToPlan(task.id, planRes.plan.id);
        if (assignRes.success) {
            toast.success('Plan creado y tarea asignada');
            onUpdate();
            setOpen(false);
        } else {
            toast.error('Plan creado pero falló la asignación');
        }
    } else {
        toast.error('Error al crear el plan');
    }
    setIsAssigning(false);
  };

  const handleRevokePlan = async () => {
    const res = await revokeActionPlan(task.id);
    if ('success' in res) {
        toast.success('Tarea devuelta a revisión');
        onUpdate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ClipboardList className="w-4 h-4 text-blue-500" /> Detalle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[80vw] !w-[95vw] max-h-[90vh] overflow-y-auto !bg-white dark:!bg-zinc-950 !opacity-100 shadow-2xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span>Gestión de Variación - OT: {task.ot}</span>
            </div>
            <Badge variant="outline" className="bg-accent/50">{task.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* LEFT COLUMN: Analysis */}
            <div className="space-y-6">
                {/* Initial Details */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-2 border">
                   <Label className="text-muted-foreground font-semibold flex items-center gap-2">
                       <UserCircle className="w-4 h-4" /> Reporte Inicial (Gestor)
                   </Label>
                   <p className="text-sm italic">{task.details}</p>
                   <div className="flex items-center gap-2 mt-2">
                       <Badge variant="outline">Causa Rep: {task.cause}</Badge>
                   </div>
                </div>

                {/* RCA Section */}
                <div className="space-y-3">
                   <Label className="font-bold flex items-center gap-2 text-lg">
                       <ClipboardList className="w-5 h-5 text-primary" /> Análisis de Causa Raíz
                   </Label>
                   
                   <div className="space-y-4">
                       <div>
                           <Label className="text-xs text-muted-foreground mb-1 block">Causa Confirmada</Label>
                           {canEditRCA ? (
                               <Select value={selectedCause} onValueChange={setSelectedCause}>
                                   <SelectTrigger>
                                       <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {causes.map(c => (
                                           <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           ) : (
                               <div className="p-2 bg-muted rounded border">{selectedCause}</div>
                           )}
                       </div>

                       <div>
                           <Label className="text-xs text-muted-foreground mb-1 block">Detalle del Análisis</Label>
                           <Textarea 
                               placeholder="Ingrese el análisis de causa detallado..."
                               value={rca}
                               onChange={e => setRca(e.target.value)}
                               disabled={!canEditRCA}
                               className="min-h-[150px] resize-none"
                           />
                       </div>

                       {canEditRCA && (
                           <Button onClick={handleUpdateRCA} disabled={isSaving} className="w-full">
                               {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                               Guardar Análisis
                           </Button>
                       )}
                   </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Action Plan Assignment */}
            <div className="space-y-6 border-l pl-0 md:pl-8 border-border/50">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold">Plan de Acción</h3>
                </div>

                {task.actionPlan ? (
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-6 rounded-xl text-center space-y-4">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                        <div>
                            <h4 className="font-bold text-lg text-green-700 dark:text-green-400">Asignado a Plan</h4>
                            <p className="text-lg font-medium mt-1">{task.actionPlan.name}</p>
                        </div>
                        
                        {canRevokePlan && (
                            <Button variant="destructive" onClick={handleRevokePlan} className="w-full mt-4">
                                <X className="w-4 h-4 mr-2" /> Regresar a Revisión
                            </Button>
                        )}
                    </div>
                ) : (
                   canAssignPlan ? (
                       <div className="bg-card border rounded-xl p-4 shadow-sm">
                           <Tabs defaultValue="existing" className="w-full">
                               <TabsList className="grid w-full grid-cols-2 mb-4">
                                   <TabsTrigger value="existing">Existente</TabsTrigger>
                                   <TabsTrigger value="new">Nuevo Plan</TabsTrigger>
                               </TabsList>
                               
                               <TabsContent value="existing" className="space-y-4">
                                   <div className="space-y-2">
                                       <Label>Seleccionar Plan Abierto</Label>
                                       <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                           <SelectTrigger>
                                               <SelectValue placeholder="Seleccione un plan..." />
                                           </SelectTrigger>
                                           <SelectContent>
                                               {openPlans.length > 0 ? openPlans.map(p => (
                                                   <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                               )) : <div className="p-2 text-sm text-muted-foreground text-center">No hay planes abiertos</div>}
                                           </SelectContent>
                                       </Select>
                                   </div>
                                   <Button onClick={handleAssignExisting} disabled={!selectedPlanId || isAssigning} className="w-full">
                                       {isAssigning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                       Asignar a Plan
                                   </Button>
                               </TabsContent>

                               <TabsContent value="new" className="space-y-4">
                                   <div className="space-y-2">
                                       <Label>Nombre del Nuevo Plan</Label>
                                       <Input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="Ej. Plan de Mejora Tinta" />
                                   </div>
                                   <div className="space-y-2">
                                       <Label>Fecha Inicio</Label>
                                       <Input type="date" value={newPlanStart} onChange={e => setNewPlanStart(e.target.value)} />
                                   </div>
                                   <Button onClick={handleCreateAndAssign} disabled={!newPlanName || !newPlanStart || isAssigning} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                       {isAssigning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                       Crear y Asignar
                                   </Button>
                               </TabsContent>
                           </Tabs>
                       </div>
                   ) : (
                       <div className="text-center p-8 bg-muted/20 rounded-xl border border-dashed">
                           <p className="text-muted-foreground">
                               {task.status === 'POR_REVISAR' 
                                   ? 'Complete el análisis RCA y guarde los cambios para asignar un plan.'
                                   : 'Esperando acción...'}
                           </p>
                       </div>
                   )
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
