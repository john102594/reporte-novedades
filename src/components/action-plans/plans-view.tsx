'use client';

import { useState, useEffect } from 'react';
import { 
  getActionPlans, 
  createActionPlan, 
  createPlanActivity,
  updateActionPlan, 
  updateActionPlanStatus, 
  updatePlanActivity,
  deletePlanActivity,
  assignTaskToPlan 
} from '@/app/actions/action-plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Calendar, 
  UserCircle, 
  CheckCircle2, 
  Clock, 
  Send, 
  Loader2,
  ChevronDown,
  Check,
  X,
  Target,
  LayoutDashboard,
  CircleDot,
  Trash2,
  Pencil,
  ArchiveRestore
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PlansViewProps {
  currentUser: { id: string; role: string } | null;
  users: { 
    id: string; 
    name: string | null; 
    role: string;
    managedAreas?: { id: string }[];
    coordinatedAreas?: { id: string }[];
  }[];
}

export default function PlansView({ currentUser, users }: PlansViewProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  
  // New Plan Form
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanEnd, setNewPlanEnd] = useState('');
  const [newPlanPriority, setNewPlanPriority] = useState('MEDIA');

  // New Activity Form State (keyed by planId)
  const [newActivityState, setNewActivityState] = useState<Record<string, {
    desc: string;
    resp: string;
    start: string;
    end: string;
  }>>({});

  const [showWarning, setShowWarning] = useState(false);
  const [warningTitle, setWarningTitle] = useState('');
  const [warningDesc, setWarningDesc] = useState('');

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  // Buffered modifications for existing activities
  const [bufferedEdits, setBufferedEdits] = useState<Record<string, {
    responsibleId?: string;
    startDate?: string;
    deadline?: string;
    description?: string;
  }>>({});

  // Track which activities are being edited
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);

  const toggleStatus = (status: string) => {
    if (status === 'ALL') {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses(prev => 
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
      );
    }
  };

  const togglePriority = (priority: string) => {
    if (priority === 'ALL') {
      setSelectedPriorities([]);
    } else {
      setSelectedPriorities(prev => 
        prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
      );
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    const res = await getActionPlans();
    if (res.success) {
      setPlans(res.plans || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlanName) return;
    setIsCreatingPlan(true);
    const res = await createActionPlan({
      name: newPlanName,
      priority: newPlanPriority,
      endDate: newPlanEnd || undefined
    });

    if (res.success) {
      setNewPlanName('');
      setNewPlanEnd('');
      setNewPlanPriority('MEDIA');
      toast.success('Plan creado exitosamente');
      fetchPlans();
    } else {
        toast.error('Error al crear el plan');
    }
    setIsCreatingPlan(false);
  };

  const updateActivityForm = (planId: string, field: string, value: string) => {
    setNewActivityState(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
  };

  const handleAddActivity = async (planId: string) => {
    const form = newActivityState[planId];
    if (!form?.desc || !form?.resp || !form?.start || !form?.end) {
        toast.error('Complete todos los campos de la actividad');
        return;
    }

    const res = await createPlanActivity(planId, {
      description: form.desc,
      responsibleId: form.resp,
      startDate: form.start,
      deadline: form.end
    });

    if (res.success) {
      setNewActivityState(prev => ({
        ...prev,
        [planId]: { desc: '', resp: '', start: '', end: '' }
      }));
      fetchPlans();
      toast.success('Actividad agregada');
    } else {
      toast.error(res.error || 'Error al agregar la actividad');
    }
  };

  const handleUpdateStatus = async (actId: string, status: string) => {
      const res = await updatePlanActivity(actId, { status });
      if (res.success) fetchPlans();
  };

  const handleUpdateDate = async (actId: string, field: 'startDate' | 'deadline', value: string) => {
      // Buffer the change locally instead of saving immediately
      setBufferedEdits(prev => ({
          ...prev,
          [actId]: {
              ...(prev[actId] || {}),
              [field]: value
          }
      }));
  };

  const handleUpdateResponsible = async (actId: string, userId: string) => {
      // Buffer the change locally
      setBufferedEdits(prev => ({
          ...prev,
          [actId]: {
              ...(prev[actId] || {}),
              responsibleId: userId
          }
      }));
  };

  const saveBufferedEdits = async (actId: string) => {
      const edits = bufferedEdits[actId];
      if (!edits) return;
      
      const res = await updatePlanActivity(actId, edits);
      if (res.success) {
          toast.success('Cambios guardados');
          setBufferedEdits(prev => {
              const next = { ...prev };
              delete next[actId];
              return next;
          });
          fetchPlans();
      } else {
          toast.error('Error al guardar cambios');
      }
  };

  const cancelBufferedEdits = (actId: string) => {
      setBufferedEdits(prev => {
          const next = { ...prev };
          delete next[actId];
          return next;
      });
      setEditingDescriptionId(null);
  };

  const handleUpdateDescription = (actId: string, value: string) => {
      setBufferedEdits(prev => ({
          ...prev,
          [actId]: {
              ...(prev[actId] || {}),
              description: value
          }
      }));
  };

  const handleDeleteActivity = async (actId: string) => {
      const res = await deletePlanActivity(actId);
      if (res.success) {
          toast.success('Actividad eliminada');
          fetchPlans();
      } else {
          toast.error(res.error || 'Error al eliminar la actividad');
      }
  };

  // Filter users for assignment (Managers/Coordinators)
  const assignableUsers = users.filter(u => ['MANAGER', 'COORDINATOR'].includes(u.role?.toUpperCase() || ''));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
           <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent tracking-tight">
             Planes de Acción
           </h1>
           <p className="text-muted-foreground text-sm font-medium">Gestión operativa y mejora continua</p>
        </div>
        
        <Dialog>
            <DialogTrigger asChild>
                <Button className="h-11 px-6 rounded-xl bg-[#5C5DE5] hover:bg-[#4E4FD3] text-white shadow-lg shadow-[#5C5DE5]/20 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Crear Plan</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] !bg-white dark:!bg-zinc-950 !opacity-100 border-border shadow-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Crear Nuevo Plan de Acción</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground/80">Nombre del Plan</Label>
                        <Input 
                          className="h-11 px-4 rounded-xl bg-slate-50 border-slate-200 focus:ring-[#5C5DE5] focus:border-[#5C5DE5] text-foreground transition-all" 
                          placeholder="Ej. Plan de mejora Piel de Naranja" 
                          value={newPlanName} 
                          onChange={e => setNewPlanName(e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground/80">Prioridad</Label>
                        <Select value={newPlanPriority} onValueChange={setNewPlanPriority}>
                            <SelectTrigger className="h-11 px-4 rounded-xl bg-slate-50 border-slate-200 focus:ring-[#5C5DE5] focus:border-[#5C5DE5] text-foreground">
                                <SelectValue placeholder="Seleccionar prioridad" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 text-foreground rounded-xl">
                                <SelectItem value="ALTA" className="py-2 hover:bg-red-50 focus:bg-red-50">Alta</SelectItem>
                                <SelectItem value="MEDIA" className="py-2 hover:bg-amber-50 focus:bg-amber-50">Media</SelectItem>
                                <SelectItem value="BAJA" className="py-2 hover:bg-blue-50 focus:bg-blue-50">Baja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={handleCreatePlan} 
                        disabled={isCreatingPlan || !newPlanName} 
                        className="w-full h-12 bg-[#5C5DE5] hover:bg-[#4E4FD3] text-white rounded-xl shadow-lg shadow-[#5C5DE5]/10 transition-all font-bold text-base mt-2"
                    >
                        {isCreatingPlan ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Creación'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 w-fit rounded-xl border border-slate-200/50">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'REVISION', label: 'En Revisión' },
            { id: 'ABIERTO', label: 'En Curso' },
            { id: 'CERRADO', label: 'Cerrados' }
          ].map((tab) => {
            const isActive = tab.id === 'ALL' ? selectedStatuses.length === 0 : selectedStatuses.includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => toggleStatus(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                  isActive 
                    ? "bg-white dark:bg-zinc-900 text-[#5C5DE5] shadow-sm ring-1 ring-slate-200/50" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-zinc-900/50"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 w-fit rounded-xl border border-slate-200/50">
          {[
            { id: 'ALL', label: 'Todas', color: '' },
            { id: 'ALTA', label: 'Alta', color: 'text-red-600' },
            { id: 'MEDIA', label: 'Media', color: 'text-amber-600' },
            { id: 'BAJA', label: 'Baja', color: 'text-blue-600' }
          ].map((tab) => {
            const isActive = tab.id === 'ALL' ? selectedPriorities.length === 0 : selectedPriorities.includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => togglePriority(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                  isActive 
                    ? `bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 ${tab.color || 'text-[#5C5DE5]'}` 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-zinc-900/50"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-[#5C5DE5]" />
            <p className="font-medium animate-pulse">Cargando planes operativos...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <LayoutDashboard className="w-12 h-12 opacity-20" />
            <p className="font-medium">No se encontraron planes para mostrar.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4">
              {plans
                .filter(p => selectedStatuses.length === 0 || selectedStatuses.includes(p.status))
                .filter(p => selectedPriorities.length === 0 || selectedPriorities.includes(p.priority || 'MEDIA'))
                .map((plan) => {
                  const total = plan.activities?.length || 0;
                  const finished = plan.activities?.filter((a: any) => a.status === 'FINALIZADA').length || 0;
                  
                  // Weighted progress calculation
                  let progress = 0;
                  if (plan.activities && plan.activities.length > 0) {
                    let totalWeight = 0;
                    let weightedSum = 0;
                    
                    for (const act of plan.activities) {
                      const startDate = new Date(act.startDate || act.createdAt);
                      const endDate = new Date(act.deadline);
                      const duration = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)); // days, min 1
                      
                      let actProgress = 0;
                      if (act.status === 'FINALIZADA') actProgress = 100;
                      else if (act.status === 'EN_PROCESO') actProgress = 50;
                      // PENDIENTE = 0
                      
                      weightedSum += actProgress * duration;
                      totalWeight += duration;
                    }
                    
                    progress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
                  }


                  // Determine Area ID from the first task that has one
                  // Check standard variation or additional variation
                  const planAreaId = plan.tasks?.find((t: any) => 
                    t.variation?.detail?.item?.report?.areaId || 
                    t.additionalVariation?.areaId
                  )?.variation?.detail?.item?.report?.areaId 
                  || plan.tasks?.find((t: any) => t.additionalVariation?.areaId)?.additionalVariation?.areaId;

                  // Filter users for this plan
                  const planSpecificUsers = assignableUsers.filter(u => {
                      if (u.role === 'ADMIN') return true; 
                      if (!planAreaId) return true; // Fallback if no area linked

                      const manages = u.managedAreas?.some((a: any) => a.id === planAreaId);
                      const coordinates = u.coordinatedAreas?.some((a: any) => a.id === planAreaId);
                      return manages || coordinates;
                  });

                  const activityDeadlines = plan.activities?.map((a: any) => new Date(a.deadline).getTime()) || [];
                  const maxDeadline = activityDeadlines.length > 0 ? new Date(Math.max(...activityDeadlines)) : null;
                  const startDate = new Date(plan.startDate);
                  const displayEnd = plan.endDate ? new Date(plan.endDate) : maxDeadline;

                  return (
                  <AccordionItem key={plan.id} value={plan.id} className="group border rounded-2xl bg-white dark:bg-zinc-950 shadow-sm border-slate-200/60 overflow-hidden transition-all hover:border-slate-300">
                      <AccordionTrigger className="hover:no-underline py-6 px-6">
                          <div className="flex flex-wrap items-center justify-between w-full pr-4 text-left gap-4">
                              <div className="flex items-center gap-6 min-w-0">
                                  <div className="flex flex-col min-w-0">
                                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{plan.name}</h3>
                                      <div className="flex items-center gap-2 mt-1">
                                          <Badge 
                                              className={cn(
                                                  "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md",
                                                  plan.priority === 'ALTA' ? "bg-red-50 text-red-600 border-red-100" :
                                                  plan.priority === 'MEDIA' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                  "bg-blue-50 text-blue-600 border-blue-100"
                                              )}
                                              variant="outline"
                                          >
                                              {plan.priority || 'MEDIA'}
                                          </Badge>
                                          <Badge 
                                              className={cn(
                                                  "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md",
                                                  plan.status === 'ABIERTO' ? "bg-[#5C5DE5]/10 text-[#5C5DE5] border-[#5C5DE5]/20" :
                                                  plan.status === 'REVISION' ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                  "bg-emerald-50 text-emerald-600 border-emerald-100"
                                              )}
                                              variant="outline"
                                          >
                                              {plan.status === 'ABIERTO' ? 'EN CURSO' : plan.status === 'REVISION' ? 'EN REVISIÓN' : plan.status}
                                          </Badge>
                                      </div>
                                  </div>

                                  <div className="hidden lg:flex flex-col gap-1 w-48">
                                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                          <span>{progress}%</span>
                                          <span>{finished}/{total} tareas</span>
                                      </div>
                                      <Progress value={progress} className="h-1.5 bg-slate-200" indicatorClassName="bg-[#5C5DE5]" />
                                  </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                                  <div className="flex items-center gap-2 text-slate-500 whitespace-nowrap">
                                      <Calendar className="w-4 h-4 opacity-50" />
                                      <span className="text-xs font-bold">
                                          {format(startDate, 'dd/MM/yyyy')} — {displayEnd ? format(displayEnd, 'dd/MM/yyyy') : '...'}
                                      </span>
                                  </div>

                                  {currentUser?.role === 'MANAGER' && plan.status === 'REVISION' && (
                                      <div 
                                          role="button"
                                          tabIndex={0}
                                          className="inline-flex items-center h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-2 shadow-sm cursor-pointer transition-colors"
                                          onClick={async (e) => {
                                              e.stopPropagation();
                                              const res = await updateActionPlanStatus(plan.id, 'ABIERTO');
                                              if (res.success) {
                                                  toast.success('Plan aprobado y puesto en marcha');
                                                  fetchPlans();
                                              } else {
                                                  toast.error('Error al aprobar el plan');
                                              }
                                          }}
                                      >
                                          <Check className="w-3 h-3" /> Aprobar Plan
                                      </div>
                                  )}

                                  {currentUser?.role === 'MANAGER' && plan.status === 'ABIERTO' && (
                                      <div 
                                          role="button"
                                          tabIndex={0}
                                          className="inline-flex items-center h-8 px-4 rounded-lg bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 font-bold text-[11px] gap-2 border border-emerald-200 cursor-pointer transition-colors"
                                          onClick={async (e) => {
                                              e.stopPropagation();
                                              const unfinished = plan.activities?.some((a: any) => a.status !== 'FINALIZADA');
                                              if (unfinished) {
                                                  setWarningTitle('No se puede cerrar el plan');
                                                  setWarningDesc('Existen actividades pendientes o en curso. Todas las actividades vinculadas al plan deben estar en estado FINALIZADA para poder proceder con el cierre.');
                                                  setShowWarning(true);
                                                  return;
                                              }
                                              const res = await updateActionPlanStatus(plan.id, 'CERRADO');
                                              if (res.success) {
                                                  toast.success('Plan cerrado exitosamente');
                                                  fetchPlans();
                                              } else {
                                                  toast.error('Error al cerrar el plan');
                                              }
                                          }}
                                      >
                                          <CheckCircle2 className="w-3 h-3" /> Cerrar Plan
                                      </div>
                                  )}

                                  {currentUser?.role === 'MANAGER' && plan.status === 'CERRADO' && (
                                      <div 
                                          role="button"
                                          tabIndex={0}
                                          className="inline-flex items-center h-8 px-4 rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 font-bold text-[11px] gap-2 border border-blue-200 cursor-pointer transition-colors"
                                          onClick={async (e) => {
                                              e.stopPropagation();
                                              const res = await updateActionPlanStatus(plan.id, 'ABIERTO');
                                              if (res.success) {
                                                  toast.success('Plan reabierto exitosamente');
                                                  fetchPlans();
                                              } else {
                                                  toast.error('Error al reabrir el plan');
                                              }
                                          }}
                                      >
                                          <ArchiveRestore className="w-3 h-3" /> Reabrir Plan
                                      </div>
                                  )}
                              </div>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="border-t border-slate-100">
                          <div className="p-0 overflow-x-auto">
                              <Table>
                                  <TableHeader>
                                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                          <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider pl-6">Actividad</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Responsable</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Periodo</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Estado</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-right pr-6 w-[120px]">Acciones</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {plan.activities.map((act: any) => {
                                          const edits = bufferedEdits[act.id];
                                          const isEditing = !!edits;

                                          return (
                                          <TableRow key={act.id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                                              <TableCell className="font-bold text-slate-700 pl-6 text-sm">
                                                  {editingDescriptionId === act.id ? (
                                                      <Input
                                                          className="h-9 text-sm bg-white border-slate-200 focus:ring-[#5C5DE5]"
                                                          value={edits?.description ?? act.description}
                                                          onChange={(e) => handleUpdateDescription(act.id, e.target.value)}
                                                          onBlur={() => setEditingDescriptionId(null)}
                                                          autoFocus
                                                      />
                                                  ) : (
                                                      <div 
                                                          className="flex items-center gap-2 cursor-pointer hover:text-[#5C5DE5] transition-colors"
                                                          onClick={() => {
                                                              if (currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'COORDINATOR') {
                                                                  setEditingDescriptionId(act.id);
                                                              }
                                                          }}
                                                      >
                                                          <span>{edits?.description ?? act.description}</span>
                                                          {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'COORDINATOR') && (
                                                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                          )}
                                                      </div>
                                                  )}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                  {currentUser?.role === 'MANAGER' && act.status !== 'FINALIZADA' ? (
                                                      <div className="flex items-center justify-center gap-2">
                                                          <UserCircle className="w-4 h-4 text-slate-300" />
                                                          <Select
                                                              value={edits?.responsibleId || act.responsibleId}
                                                              onValueChange={(val) => handleUpdateResponsible(act.id, val)}
                                                          >
                                                              <SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-600 focus:ring-[#5C5DE5] w-[140px]">
                                                                  <SelectValue placeholder="Responsable" />
                                                              </SelectTrigger>
                                                              <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200">
                                                                  {planSpecificUsers.map((user) => (
                                                                      <SelectItem key={user.id} value={user.id}>
                                                                          {user.name}
                                                                      </SelectItem>
                                                                  ))}
                                                              </SelectContent>
                                                          </Select>
                                                      </div>
                                                  ) : (
                                                      <div className="flex items-center justify-center gap-2 text-slate-600 font-medium text-xs">
                                                          <UserCircle className="w-4 h-4 text-slate-300" />
                                                          {act.responsible?.name}
                                                      </div>
                                                  )}
                                              </TableCell>
                                              <TableCell className="text-center font-bold text-slate-500 text-xs whitespace-nowrap">
                                                  {currentUser?.role === 'MANAGER' && act.status !== 'FINALIZADA' ? (
                                                      <div className="flex items-center justify-center gap-2">
                                                          <Input 
                                                              type="date"
                                                              className="h-8 text-[10px] w-28 bg-white"
                                                              value={edits?.startDate || format(new Date(act.startDate), 'yyyy-MM-dd')}
                                                              onChange={(e) => handleUpdateDate(act.id, 'startDate', e.target.value)}
                                                          />
                                                          <span className="opacity-30">/</span>
                                                          <Input 
                                                              type="date"
                                                              className="h-8 text-[10px] w-28 bg-white"
                                                              value={edits?.deadline || format(new Date(act.deadline), 'yyyy-MM-dd')}
                                                              onChange={(e) => handleUpdateDate(act.id, 'deadline', e.target.value)}
                                                          />
                                                      </div>
                                                  ) : (
                                                      `${format(new Date(act.startDate), 'dd/MM/yyyy')} / ${format(new Date(act.deadline), 'dd/MM/yyyy')}`
                                                  )}
                                              </TableCell>
                                              <TableCell>
                                                  <div className="flex justify-center">
                                                      <Select
                                                          defaultValue={act.status}
                                                          onValueChange={(val) => handleUpdateStatus(act.id, val)}
                                                          disabled={plan.status === 'CERRADO'}
                                                      >
                                                          <SelectTrigger className={cn(
                                                              "h-8 w-[140px] text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm transition-all",
                                                              act.status === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 
                                                              act.status === 'EN_PROCESO' ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' : 
                                                              'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                                          )}>
                                                              <SelectValue />
                                                          </SelectTrigger>
                                                          <SelectContent className="bg-white rounded-xl border-slate-200">
                                                              <SelectItem value="PENDIENTE" className="text-[10px] font-bold py-2">
                                                                  <span className="flex items-center gap-2 text-slate-500">
                                                                      <Clock className="w-3.5 h-3.5" /> PENDIENTE
                                                                  </span>
                                                              </SelectItem>
                                                              <SelectItem value="EN_PROCESO" className="text-[10px] font-bold py-2">
                                                                  <span className="flex items-center gap-2 text-blue-600">
                                                                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> EN PROCESO
                                                                  </span>
                                                              </SelectItem>
                                                              <SelectItem value="FINALIZADA" className="text-[10px] font-bold py-2">
                                                                  <span className="flex items-center gap-2 text-emerald-600">
                                                                      <CheckCircle2 className="w-3.5 h-3.5" /> FINALIZADA
                                                                  </span>
                                                              </SelectItem>
                                                          </SelectContent>
                                                      </Select>
                                                  </div>
                                              </TableCell>
                                              <TableCell className="pr-6">
                                                  <div className="flex items-center justify-end gap-1">
                                                      {isEditing ? (
                                                          <>
                                                              <Button 
                                                                  size="icon" 
                                                                  variant="ghost" 
                                                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                                                  onClick={() => saveBufferedEdits(act.id)}
                                                              >
                                                                  <Check className="w-4 h-4" />
                                                              </Button>
                                                              <Button 
                                                                  size="icon" 
                                                                  variant="ghost" 
                                                                  className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-lg"
                                                                  onClick={() => cancelBufferedEdits(act.id)}
                                                              >
                                                                  <X className="w-4 h-4" />
                                                              </Button>
                                                          </>
                                                      ) : (
                                                          <>
                                                              {/* Delete Button - Only for managers/coordinators on non-closed plans */}
                                                              {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || 
                                                                (currentUser?.role === 'COORDINATOR' && plan.status === 'REVISION')) && 
                                                                plan.status !== 'CERRADO' && (
                                                                  <Button 
                                                                      size="icon" 
                                                                      variant="ghost" 
                                                                      className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                      onClick={() => handleDeleteActivity(act.id)}
                                                                      title="Eliminar actividad"
                                                                  >
                                                                      <Trash2 className="w-4 h-4" />
                                                                  </Button>
                                                              )}
                                                          </>
                                                      )}
                                                  </div>
                                              </TableCell>
                                          </TableRow>
                                          );
                                      })}
                                      
                                      {/* Add Activity Row */}
                                      {(plan.status === 'REVISION' || (currentUser?.role === 'MANAGER' && plan.status === 'ABIERTO')) && (
                                          <TableRow className="bg-[#5C5DE5]/5 dark:bg-[#5C5DE5]/10 border-slate-100">
                                              <TableCell className="pl-6">
                                                  <Input 
                                                      className="h-9 text-xs rounded-xl bg-white/80 border-slate-200 focus:ring-[#5C5DE5]" 
                                                      placeholder="Nueva actividad..." 
                                                      value={newActivityState[plan.id]?.desc || ''} 
                                                      onChange={e => updateActivityForm(plan.id, 'desc', e.target.value)} 
                                                  />
                                              </TableCell>
                                              <TableCell>
                                                  <Select 
                                                      value={newActivityState[plan.id]?.resp || ''} 
                                                      onValueChange={val => updateActivityForm(plan.id, 'resp', val)}
                                                  >
                                                      <SelectTrigger className="h-9 text-xs bg-white/80 border-slate-200 rounded-xl">
                                                          <SelectValue placeholder="Asignar..." />
                                                      </SelectTrigger>
                                                      <SelectContent className="bg-white rounded-xl">
                                                          {planSpecificUsers.map(u => (
                                                              <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                                                          ))}
                                                      </SelectContent>
                                                  </Select>
                                              </TableCell>
                                              <TableCell>
                                                  <div className="flex items-center justify-center gap-2">
                                                      <Input 
                                                          type="date" 
                                                          className="h-9 text-[10px] w-28 bg-white/80 border-slate-200 rounded-xl" 
                                                          value={newActivityState[plan.id]?.start || ''} 
                                                          onChange={e => updateActivityForm(plan.id, 'start', e.target.value)} 
                                                      />
                                                      <span className="opacity-30">/</span>
                                                      <Input 
                                                          type="date" 
                                                          className="h-9 text-[10px] w-28 bg-white/80 border-slate-200 rounded-xl" 
                                                          value={newActivityState[plan.id]?.end || ''} 
                                                          onChange={e => updateActivityForm(plan.id, 'end', e.target.value)} 
                                                      />
                                                  </div>
                                              </TableCell>
                                              <TableCell></TableCell>
                                              <TableCell className="pr-6 text-right">
                                                  <Button 
                                                      size="sm" 
                                                      className="h-9 px-6 rounded-xl bg-[#5C5DE5] hover:bg-[#4E4FD3] text-white font-bold text-xs gap-2 shadow-sm shadow-[#5C5DE5]/10" 
                                                      onClick={() => handleAddActivity(plan.id)}
                                                  >
                                                      <Plus className="w-4 h-4" /> Añadir
                                                  </Button>
                                              </TableCell>
                                          </TableRow>
                                      )}
                                      {plan.status === 'ABIERTO' && currentUser?.role !== 'MANAGER' && (
                                           <TableRow className="bg-slate-50/30">
                                              <TableCell colSpan={5} className="text-center text-[11px] text-slate-400 italic py-4">
                                                  <div className="flex items-center justify-center gap-2">
                                                    <CircleDot className="w-3 h-3 opacity-30" />
                                                    Plan en curso. Reservado para gerencia y coordinación.
                                                  </div>
                                              </TableCell>
                                           </TableRow>
                                      )}
                                  </TableBody>
                              </Table>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                );
              })}
          </Accordion>
        )}
      </div>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Clock className="w-5 h-5" /> {warningTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground pt-2">
              {warningDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-primary text-primary-foreground hover:bg-primary/90">
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
