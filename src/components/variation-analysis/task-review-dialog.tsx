import React, { useState, useEffect } from 'react';
import { 
  updateTaskAnalysis, 
  revokeActionPlan
} from '@/app/actions/action-tasks';
import { 
  assignTaskToPlan, 
  createActionPlan,
  updateActionPlan 
} from '@/app/actions/action-plans';
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
import { 
  ClipboardList, 
  UserCircle, 
  Send, 
  CheckCircle2, 
  X, 
  Loader2, 
  ArrowRight, 
  Plus,
  Settings2,
  Calendar,
  User,
  ChevronRight,
  Clock,
  Search,
  Save,
  AlertCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function TaskReviewDialog({ 
  task, 
  currentUser, 
  users, 
  onUpdate, 
  causes, 
  openPlans,
  externalOpen,
  onExternalOpenChange 
}: {
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
    variationType?: { id: string; name: string } | null;
    areaId?: string | null;
    actionPlan?: { 
        id: string; 
        name: string; 
        status: string;
        priority?: string;
        startDate?: string | Date;
        activities?: {
            id: string;
            description: string;
            responsibleId: string;
            responsible?: {
                id: string;
                name: string | null;
                role: string;
            };
            startDate: string | Date;
            deadline: string | Date;
        }[]
    } | null;
  }, 
  currentUser: { id: string, role: string } | null, 
  users: { id: string; name: string | null; role: string }[],
  causes: { id: string; name: string }[],
  causes: { id: string; name: string }[],
  openPlans: { id: string; name: string; areaId?: string | null }[],
  onUpdate: () => void,
  externalOpen?: boolean,
  onExternalOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (onExternalOpenChange ?? (() => {})) : setInternalOpen;
  const [rca, setRca] = useState(task.rootCauseAnalysis || '');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  
  // Cause Edit State
  // If the initial cause is actually a variation type name, it might not be in the causes list.
  // We check if it exists in the list to avoid displaying a name that doesn't belong to a FailureProgram.
  const initialCause = causes.some(c => c.name === task.cause) ? task.cause : 
                      (causes.length > 0 ? causes[0].name : '');
  const [selectedCause, setSelectedCause] = useState(initialCause);

  // Assignment State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newPlanName, setNewPlanName] = useState(task.actionPlan?.name || '');
  const [newPlanPriority, setNewPlanPriority] = useState(task.actionPlan?.priority || 'MEDIA');
  const [isAssigning, setIsAssigning] = useState(false);

  // Activity Management State
  const [newActivities, setNewActivities] = useState<{description: string, responsibleId: string, startDate: string, deadline: string}[]>([]);
  const [tempActivity, setTempActivity] = useState({description: '', responsibleId: '', startDate: '', deadline: ''});

  // Filter existing plans based on task area
  const filteredOpenPlans = task.areaId 
    ? openPlans.filter(p => p.areaId === task.areaId)
    : openPlans;

  // Load activities if plan exists and is in REVISION (for Manager/Coordinator editing)
  useEffect(() => {
    if (task.actionPlan?.activities) {
        const formatted = task.actionPlan.activities.map(act => ({
            description: act.description,
            responsibleId: act.responsibleId,
            startDate: format(new Date(act.startDate), 'yyyy-MM-dd'),
            deadline: format(new Date(act.deadline), 'yyyy-MM-dd')
        }));
        setNewActivities(formatted);
    }
  }, [task.actionPlan]);

  const handleAddActivity = () => {
    if(!tempActivity.description || !tempActivity.responsibleId || !tempActivity.startDate || !tempActivity.deadline) return;
    setNewActivities([...newActivities, tempActivity]);
    setTempActivity({description: '', responsibleId: '', startDate: '', deadline: ''});
  };

  const removeActivity = (index: number) => {
    const arr = [...newActivities];
    arr.splice(index, 1);
    setNewActivities(arr);
  };

  const updateActivityField = (index: number, field: keyof typeof newActivities[0], value: string) => {
    const arr = [...newActivities];
    arr[index] = { ...arr[index], [field]: value };
    setNewActivities(arr);
  };

  const canEditRCA = (currentUser?.role?.toUpperCase() === 'COORDINATOR' || currentUser?.role?.toUpperCase() === 'MANAGER' || currentUser?.role?.toUpperCase() === 'ADMIN') && 
                     (task.status === 'POR_REVISAR' || task.status === 'REVISADA');
  
  const canAssignPlan = (currentUser?.role?.toUpperCase() === 'MANAGER' || currentUser?.role?.toUpperCase() === 'COORDINATOR' || currentUser?.role?.toUpperCase() === 'ADMIN') && 
                        (task.status === 'REVISADA');

  const canApprovePlan = (currentUser?.role?.toUpperCase() === 'MANAGER' || currentUser?.role?.toUpperCase() === 'ADMIN') && 
                         task.actionPlan?.status === 'REVISION';

  // Coordinators can edit while in REVISION
  const canModifyPlan = canApprovePlan || 
                        (currentUser?.role?.toUpperCase() === 'COORDINATOR' && task.actionPlan?.status === 'REVISION');

  const canRevokePlan = (currentUser?.role?.toUpperCase() === 'MANAGER' || currentUser?.role?.toUpperCase() === 'COORDINATOR' || currentUser?.role?.toUpperCase() === 'ADMIN') && 
                        task.status === 'EN_PLAN_DE_ACCION' && task.actionPlan?.status !== 'ABIERTO'; // Only revoke if not already fully approved/active? User said "poder aprobarlo", once approved it might be locked.

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
    if (!selectedPlanId) {
        toast.error('Debe seleccionar un plan existente');
        return;
    }
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
    if (!newPlanName) {
        toast.error('El nombre del plan es obligatorio');
        return;
    }
    if (newActivities.length === 0) {
        toast.error('Debe agregar al menos una actividad al plan');
        return;
    }

    setIsAssigning(true);
    // 1. Create Plan with Activities
    const planRes = await createActionPlan({
        name: newPlanName,
        areaId: task.areaId || undefined,
        priority: newPlanPriority,
        activities: newActivities
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

  const handleApproveAndModify = async () => {
    if (!task.actionPlanId) return;
    if (newActivities.length === 0) {
        toast.error('El plan debe tener al menos una actividad');
        return;
    }
    
    setIsAssigning(true);

    // If it's a manager, specify status: 'ABIERTO' (Approval)
    // If it's a coordinator, just update standard fields
    const isManager = currentUser?.role?.toUpperCase() === 'MANAGER' || currentUser?.role?.toUpperCase() === 'ADMIN';

    const res = await updateActionPlan(task.actionPlanId, {
        name: newPlanName,
        priority: newPlanPriority,
        status: isManager ? 'ABIERTO' : undefined, 
        activities: newActivities
    });

    if (res.success) {
        toast.success(isManager ? 'Plan de acción aprobado y actualizado' : 'Plan de acción actualizado');
        onUpdate();
        setOpen(false);
    } else {
        toast.error('Error al actualizar el plan');
    }
    setIsAssigning(false);
  };

  const handleRevokePlan = async () => {
    const res = await revokeActionPlan(task.id);
    if ('success' in res) {
        toast.success('Tarea devuelta a revisión');
        onUpdate();
        setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {currentUser?.role?.toUpperCase() !== 'GESTOR' && (
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4 text-purple-600" /> Detalle
        </Button>
      </DialogTrigger>
      )}
      <DialogContent className="sm:!max-w-[1200px] !w-[95vw] h-[90vh] !p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 rounded-3xl border-slate-200 dark:border-slate-800">
        
        {/* HEADER GLOBAL */}
        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-zinc-950 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Settings2 className="text-purple-600 dark:text-purple-400 w-6 h-6" />
              <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Gestión de Variación</DialogTitle>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {task.ot}
              </span>
              <span className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border 
                ${task.status === 'REVISADA' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 
                  task.status === 'EN_PLAN_DE_ACCION' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' : 
                  'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'}`}>
                <CheckCircle2 size={12} /> {task.status.replace(/_/g, ' ')}
              </span>
              {task.variationType && (
                <Badge variant="outline" className="bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold px-3 py-1">
                  TIPO: {task.variationType.name}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold bg-gradient-to-r from-purple-900 via-primary to-purple-600 dark:from-purple-400 dark:via-primary dark:to-purple-300 bg-clip-text text-transparent">
                FlexFlow
              </h1>
             <button onClick={() => setOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENIDO DIVIDIDO EN DOS COLUMNAS */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* COLUMNA IZQUIERDA: REPORTE Y ANÁLISIS */}
          <div className="w-5/12 border-r border-slate-100 dark:border-slate-800 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-8 space-y-8">
            
            {/* Sección: Reporte Inicial */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Reporte Inicial (Gestor)</h3>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="space-y-2">
                   <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{task.details}"
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Causa Reportada:</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700">
                      {task.cause}
                    </span>
                  </div>
                  {task.variationType && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tipo:</span>
                      <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-bold rounded-lg border border-purple-100 dark:border-purple-800">
                        {task.variationType.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Sección: Análisis de Causa Raíz */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Search size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Análisis de Causa Raíz</h3>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Causa Confirmada</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none disabled:opacity-70 disabled:cursor-not-allowed text-foreground"
                    value={selectedCause}
                    onChange={(e) => setSelectedCause(e.target.value)}
                    disabled={!canEditRCA}
                  >
                    {causes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Detalle del Análisis</label>
                  <textarea 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all min-h-[140px] placeholder:text-slate-300 dark:placeholder:text-slate-600 font-mono resize-none disabled:opacity-70 disabled:cursor-not-allowed text-foreground"
                    placeholder="Escriba aquí los hallazgos técnicos..."
                    value={rca}
                    onChange={(e) => setRca(e.target.value)}
                    disabled={!canEditRCA}
                  />
                </div>

                <button 
                    onClick={handleUpdateRCA}
                    disabled={isSaving || !canEditRCA}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold text-sm hover:bg-black dark:hover:bg-slate-600 transition-all shadow-lg shadow-slate-200 dark:shadow-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar Análisis
                </button>
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA: PLAN DE ACCIÓN */}
          <div className="w-7/12 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <CheckCircle2 size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-wider">Plan de Acción</h3>
                </div>
                
                {/* Tabs Modernos */}
                {canAssignPlan && !task.actionPlanId && (
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-64">
                    <button 
                        onClick={() => setActiveTab('existing')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'existing' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-700 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        Existente
                    </button>
                    <button 
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-700 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        Nuevo
                    </button>
                    </div>
                )}
              </div>

              {task.actionPlan ? (
                <div className="space-y-6">
                    {/* Plan basic info (Editable if canModifyPlan) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-purple-400 dark:text-purple-500 uppercase">Nombre del Plan</p>
                            {canModifyPlan ? (
                                <input 
                                    type="text" 
                                    value={newPlanName}
                                    onChange={e => setNewPlanName(e.target.value)}
                                    className="w-full bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl px-4 py-3 text-sm font-bold text-purple-900 dark:text-purple-100 outline-none focus:ring-2 focus:ring-purple-500/20" 
                                />
                            ) : (
                                <div className="p-3 bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl text-sm font-bold text-purple-900 dark:text-purple-100">
                                    {task.actionPlan.name}
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-purple-400 dark:text-purple-500 uppercase">Prioridad</p>
                            {canModifyPlan ? (
                                <Select value={newPlanPriority} onValueChange={setNewPlanPriority}>
                                    <SelectTrigger className="w-full bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl px-4 py-6 text-sm font-bold text-purple-900 dark:text-purple-100 outline-none focus:ring-2 focus:ring-purple-500/20">
                                        <SelectValue placeholder="Prioridad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALTA">Alta</SelectItem>
                                        <SelectItem value="MEDIA">Media</SelectItem>
                                        <SelectItem value="BAJA">Baja</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="p-3 bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl text-sm font-bold text-purple-900 dark:text-purple-100 uppercase">
                                    {task.actionPlan.priority || 'MEDIA'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Summary (Only if not editing - or if in REVISION but we want to show it anyway) */}
                    {!canModifyPlan && (
                        <div className={`rounded-2xl p-4 flex items-center justify-between border ${
                            task.actionPlan.status === 'REVISION' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800' : 
                            'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800'
                        }`}>
                            <div className="flex items-center gap-3">
                                {task.actionPlan.status === 'REVISION' ? <Clock className="w-8 h-8 text-yellow-500" /> : <CheckCircle2 className="w-8 h-8 text-purple-500" />}
                                <div>
                                    <h4 className={`font-bold text-sm ${task.actionPlan.status === 'REVISION' ? 'text-yellow-900 dark:text-yellow-100' : 'text-purple-900 dark:text-purple-100'}`}>
                                        {task.actionPlan.status === 'REVISION' ? 'Plan en Revisión' : 'Plan en Ejecución'}
                                    </h4>
                                    <p className={`text-[10px] ${task.actionPlan.status === 'REVISION' ? 'text-yellow-600 dark:text-yellow-300' : 'text-purple-600 dark:text-purple-300'}`}>
                                        {task.actionPlan.status === 'REVISION' ? 'Esperando aprobación del manager.' : 'Las tareas listadas están activas.'}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-[10px] px-3 py-1 rounded-full border font-bold ${
                                task.actionPlan.status === 'REVISION' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                                task.actionPlan.status === 'ABIERTO' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {task.actionPlan.status === 'ABIERTO' ? 'EN CURSO' : task.actionPlan.status}
                            </span>
                        </div>
                    )}

                    {/* Activities List */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Actividades del Plan</Label>
                        {(canModifyPlan ? newActivities : (task.actionPlan.activities || [])).map((act: any, id: number) => (
                            <div key={id} className="group flex gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700 transition-all relative">
                                {canModifyPlan && (
                                    <button 
                                        onClick={() => removeActivity(id)}
                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-100 dark:border-slate-700 font-mono font-bold text-slate-400 min-w-[50px]">
                                    #{id + 1}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start pr-6">
                                        {canModifyPlan ? (
                                            <input 
                                                type="text"
                                                value={act.description}
                                                onChange={e => updateActivityField(id, 'description', e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none p-0 text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight focus:ring-0 placeholder:text-slate-400"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                                {act.description}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-2 text-[10px] font-bold shrink-0 mt-1">
                                            {canModifyPlan ? (
                                                <>
                                                    <input 
                                                        type="date"
                                                        value={act.startDate}
                                                        onChange={e => updateActivityField(id, 'startDate', e.target.value)}
                                                        className="bg-transparent border-none p-0 text-[10px] font-bold text-slate-400 dark:text-slate-500 w-24 focus:ring-0"
                                                    />
                                                    <ArrowRight size={12} className="text-slate-300 dark:text-slate-600" />
                                                    <input 
                                                        type="date"
                                                        value={act.deadline}
                                                        onChange={e => updateActivityField(id, 'deadline', e.target.value)}
                                                        className="bg-transparent border-none p-0 text-[10px] font-bold text-amber-600 w-24 focus:ring-0"
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400 dark:text-slate-500">{typeof act.startDate === 'string' ? act.startDate : format(new Date(act.startDate), 'yyyy-MM-dd')}</span>
                                                    <ArrowRight size={12} className="text-slate-300 dark:text-slate-600" />
                                                    <span className="text-amber-600">{typeof act.deadline === 'string' ? act.deadline : format(new Date(act.deadline), 'yyyy-MM-dd')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                        <UserCircle size={12} className="text-slate-400" />
                                        {canModifyPlan ? (
                                            <select 
                                                value={act.responsibleId}
                                                onChange={e => updateActivityField(id, 'responsibleId', e.target.value)}
                                                className="bg-transparent border-none p-0 text-[11px] font-medium text-slate-500 dark:text-slate-400 focus:ring-0 cursor-pointer appearance-none"
                                            >
                                                {users.filter(u => ['MANAGER', 'COORDINATOR'].includes(u.role)).map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span>
                                                {canModifyPlan 
                                                  ? users.find(u => u.id === act.responsibleId)?.name 
                                                  : (act.responsible?.name || users.find(u => u.id === act.responsibleId)?.name)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(canApprovePlan ? newActivities : (task.actionPlan.activities || [])).length === 0 && (
                            <p className="text-xs text-center text-slate-400 py-4 border border-dashed rounded-xl">No hay actividades definidas.</p>
                        )}
                    </div>

                    {/* Add Activity Form (Only if Manager/Coordinator during Revision) */}
                    {canModifyPlan && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-dashed border-slate-200 dark:border-slate-800 space-y-5">
                            <h4 className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Plus size={14} /> Agregar Tarea Adicional
                            </h4>
                            
                            <textarea 
                                placeholder="¿Qué acción se debe tomar?" 
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none min-h-[80px] transition-all shadow-sm resize-none text-foreground"
                                value={tempActivity.description}
                                onChange={e => setTempActivity({...tempActivity, description: e.target.value})}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Responsable</label>
                                <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 appearance-none text-foreground"
                                    value={tempActivity.responsibleId}
                                    onChange={e => setTempActivity({...tempActivity, responsibleId: e.target.value})}
                                >
                                    <option value="">Elegir...</option>
                                    {users.filter(u => ['MANAGER', 'COORDINATOR'].includes(u.role)).map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Inicio</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
                                    value={tempActivity.startDate}
                                    onChange={e => setTempActivity({...tempActivity, startDate: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Vencimiento</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
                                    value={tempActivity.deadline}
                                    onChange={e => setTempActivity({...tempActivity, deadline: e.target.value})}
                                />
                            </div>
                            </div>

                            <button 
                                onClick={handleAddActivity}
                                disabled={!tempActivity.description || !tempActivity.responsibleId || !tempActivity.startDate || !tempActivity.deadline}
                                className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={16} /> Agregar a la lista del plan
                            </button>
                        </div>
                    )}

                    {/* Revoke button if applicable */}
                    {canRevokePlan && (
                        <div className="pt-4 flex justify-center">
                            <button 
                                onClick={handleRevokePlan} 
                                className="px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all flex items-center gap-2"
                            >
                                <X size={14} /> Regresar Tarea a Revisión
                            </button>
                        </div>
                    )}
                </div>
              ) : (
                <>
                {canAssignPlan ? (
                    <>
                        {activeTab === 'existing' ? (
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <Label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Seleccionar Plan Abierto</Label>
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                    <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl h-11">
                                        <SelectValue placeholder="Seleccione un plan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredOpenPlans.length > 0 ? filteredOpenPlans.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        )) : <div className="p-3 text-sm text-center text-muted-foreground dark:text-slate-500">No hay planes abiertos para esta área</div>}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <>
                            {/* NUEVO PLAN UI */}
                           <div className="grid grid-cols-1 gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-purple-400 dark:text-purple-500 uppercase">Nombre del Plan</p>
                                    <input 
                                        type="text" 
                                        value={newPlanName}
                                        onChange={e => setNewPlanName(e.target.value)}
                                        placeholder="Ej. Plan de Mejora..."
                                        className="w-full bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl px-4 py-3 text-sm font-bold text-purple-900 dark:text-purple-100 outline-none focus:ring-2 focus:ring-purple-500/20" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-purple-400 dark:text-purple-500 uppercase">Prioridad</p>
                                    <Select value={newPlanPriority} onValueChange={setNewPlanPriority}>
                                        <SelectTrigger className="w-full bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl px-4 py-6 text-sm font-bold text-purple-900 dark:text-purple-100 outline-none focus:ring-2 focus:ring-purple-500/20">
                                            <SelectValue placeholder="Prioridad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALTA">Alta</SelectItem>
                                            <SelectItem value="MEDIA">Media</SelectItem>
                                            <SelectItem value="BAJA">Baja</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                           </div>

                            {/* Added Activities List */}
                            <div className="space-y-3">
                            {newActivities.map((act, id) => (
                                <div key={id} className="group flex gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700 transition-all relative">
                                    <button 
                                        onClick={() => removeActivity(id)}
                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-100 dark:border-slate-700 font-mono font-bold text-slate-400">
                                        #{id + 1}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start pr-6">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                                {act.description}
                                            </span>
                                            <div className="flex items-center gap-2 text-[10px] font-bold shrink-0 mt-1">
                                                <span className="text-slate-400 dark:text-slate-500">{act.startDate}</span>
                                                <ArrowRight size={12} className="text-slate-300 dark:text-slate-600" />
                                                <span className="text-amber-600">{act.deadline}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                            <UserCircle size={12} className="text-slate-400" />
                                            <span>{users.find(u => u.id === act.responsibleId)?.name}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>

                           {/* Formulario de Nueva Actividad (Inline) */}
                           <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-dashed border-slate-200 dark:border-slate-800 space-y-5">
                                <h4 className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Plus size={14} /> Definir Nueva Tarea
                                </h4>
                                
                                <textarea 
                                    placeholder="¿Qué acción se debe tomar?" 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none min-h-[80px] transition-all shadow-sm resize-none text-foreground"
                                    value={tempActivity.description}
                                    onChange={e => setTempActivity({...tempActivity, description: e.target.value})}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Responsable</label>
                                    <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <select 
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 appearance-none text-foreground"
                                        value={tempActivity.responsibleId}
                                        onChange={e => setTempActivity({...tempActivity, responsibleId: e.target.value})}
                                    >
                                        <option value="">Elegir...</option>
                                        {users.filter(u => ['MANAGER', 'COORDINATOR'].includes(u.role)).map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Inicio</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
                                        value={tempActivity.startDate}
                                        onChange={e => setTempActivity({...tempActivity, startDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Vencimiento</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
                                        value={tempActivity.deadline}
                                        onChange={e => setTempActivity({...tempActivity, deadline: e.target.value})}
                                    />
                                </div>
                                </div>

                                <button 
                                    onClick={handleAddActivity}
                                    disabled={!tempActivity.description || !tempActivity.responsibleId || !tempActivity.startDate || !tempActivity.deadline}
                                    className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} /> Agregar a la lista del plan
                                </button>
                           </div>
                           </div>
                           </>
                        )}
                    </>
                ) : (
                    <div className="text-center p-8 bg-muted/20 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-muted-foreground dark:text-slate-500 font-medium">
                            {task.status === 'POR_REVISAR' 
                                ? 'Complete el análisis RCA y guárdelo para habilitar el plan de acción.'
                                : 'Esperando acción...'}
                        </p>
                    </div>
                )}
                </>
              )}
            </section>
            </div>

            {/* ACCIÓN FINAL GLOBAL (Footer of Right Column) */}
            {((canAssignPlan && !task.actionPlanId) || canModifyPlan) && (
                <div className="px-8 py-5 bg-slate-900 dark:bg-black flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                        <AlertCircle size={14} className="text-amber-500" />
                        {canApprovePlan ? 'Al aprobar, el plan se pondrá en marcha inmediatamente.' : 'Se notificará a los responsables.'}
                    </div>
                    
                    {canModifyPlan ? (
                        <button 
                            onClick={handleApproveAndModify}
                            disabled={!newPlanName || newActivities.length === 0 || isAssigning}
                            className={`text-white font-bold px-8 py-3 rounded-xl shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 ${
                                canApprovePlan 
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-500/20 hover:-translate-y-0.5' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-indigo-500/20 hover:-translate-y-0.5'
                            }`}
                        >
                            {isAssigning ? <Loader2 className="animate-spin" /> : (canApprovePlan ? 'Aprobar y Ejecutar Plan' : 'Guardar Cambios')}
                            {canApprovePlan ? <CheckCircle2 size={18} /> : <Save size={18} />}
                        </button>
                    ) : activeTab === 'existing' ? (
                        <button 
                            onClick={handleAssignExisting}
                            disabled={!selectedPlanId || isAssigning}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold px-8 py-3 rounded-xl shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isAssigning ? <Loader2 className="animate-spin" /> : 'Confirmar Asignación'}
                            <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleCreateAndAssign}
                            disabled={!newPlanName || newActivities.length === 0 || isAssigning}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-xl hover:shadow-purple-500/20 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isAssigning ? <Loader2 className="animate-spin" /> : 
                              currentUser?.role === 'COORDINATOR' ? 'Enviar Plan a Revisión' : 'Confirmar y Ejecutar Plan'
                            }
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
