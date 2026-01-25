'use client';

import { useState, useEffect } from 'react';
import { 
  getActionPlans, 
  createActionPlan, 
  createPlanActivity,
  updateActionPlan, 
  updateActionPlanStatus, 
  updatePlanActivity,
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
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface PlansViewProps {
  currentUser: { id: string; role: string } | null;
  users: { id: string; name: string | null; role: string }[];
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

  // Buffered modifications for existing activities
  const [bufferedEdits, setBufferedEdits] = useState<Record<string, {
    responsibleId?: string;
    startDate?: string;
    deadline?: string;
  }>>({});

  const toggleStatus = (status: string) => {
    if (status === 'ALL') {
      setSelectedStatuses([]);
      return;
    }
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
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
  };

  // Filter users for assignment (Managers/Coordinators)
  const assignableUsers = users.filter(u => ['MANAGER', 'COORDINATOR'].includes(u.role?.toUpperCase() || ''));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
             Planes de Acción
           </h1>
           <p className="text-muted-foreground">Gestión y seguimiento de planes de mejora</p>
        </div>
        
        <Dialog>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Nuevo Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] !bg-white dark:!bg-zinc-950 !opacity-100 border-border shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Crear Nuevo Plan de Acción</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-foreground">Nombre del Plan</Label>
                        <Input className="bg-background border-input text-foreground" placeholder="Ej. Plan de mejora Piel de Naranja" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                            <Label className="text-foreground">Prioridad</Label>
                            <Select value={newPlanPriority} onValueChange={setNewPlanPriority}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <SelectValue placeholder="Seleccionar prioridad" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-950 border-input text-foreground">
                                    <SelectItem value="ALTA">Alta</SelectItem>
                                    <SelectItem value="MEDIA">Media</SelectItem>
                                    <SelectItem value="BAJA">Baja</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    <Button 
                        onClick={handleCreatePlan} 
                        disabled={isCreatingPlan || !newPlanName} 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all font-bold py-2"
                    >
                        {isCreatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Plan'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-end items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtrar:</span>
        <div className="flex gap-2 p-1 bg-muted/30 rounded-full border border-border/50">
            <Badge 
                variant={selectedStatuses.length === 0 ? 'default' : 'outline'}
                className="cursor-pointer transition-all hover:scale-105 active:scale-95 px-3"
                onClick={() => toggleStatus('ALL')}
            >
                Todos
            </Badge>
            <Badge 
                variant={selectedStatuses.includes('REVISION') ? 'secondary' : 'outline'}
                className={`cursor-pointer transition-all hover:scale-105 active:scale-95 px-3 ${
                    selectedStatuses.includes('REVISION') ? 'bg-yellow-100 text-red-700 border-yellow-300' : ''
                }`}
                onClick={() => toggleStatus('REVISION')}
            >
                En Revisión
            </Badge>
            <Badge 
                variant={selectedStatuses.includes('ABIERTO') ? 'default' : 'outline'}
                className={`cursor-pointer transition-all hover:scale-105 active:scale-95 px-3 ${
                    selectedStatuses.includes('ABIERTO') ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : ''
                }`}
                onClick={() => toggleStatus('ABIERTO')}
            >
                En Curso
            </Badge>
            <Badge 
                variant={selectedStatuses.includes('CERRADO') ? 'secondary' : 'outline'}
                className={`cursor-pointer transition-all hover:scale-105 active:scale-95 px-3 ${
                    selectedStatuses.includes('CERRADO') ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' : ''
                }`}
                onClick={() => toggleStatus('CERRADO')}
            >
                Cerrados
            </Badge>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-1">
        <Accordion type="multiple" className="w-full space-y-2">
            {plans
              .filter(p => selectedStatuses.length === 0 || selectedStatuses.includes(p.status))
              .map((plan) => {
                // Calculate max deadline from activities
                const activityDeadlines = plan.activities?.map((a: any) => new Date(a.deadline).getTime()) || [];
                const maxDeadline = activityDeadlines.length > 0 ? new Date(Math.max(...activityDeadlines)) : null;
                const displayEnd = plan.endDate ? new Date(plan.endDate) : maxDeadline;

                // Calculate activity counts
                const total = plan.activities?.length || 0;
                const finished = plan.activities?.filter((a: any) => a.status === 'FINALIZADA').length || 0;
                const inProgress = plan.activities?.filter((a: any) => a.status === 'EN_PROCESO').length || 0;
                const pending = plan.activities?.filter((a: any) => a.status === 'PENDIENTE').length || 0;

                return (
                <AccordionItem key={plan.id} value={plan.id} className="border rounded-lg bg-background px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                                <span className="font-semibold text-lg">{plan.name}</span>
                                <Badge 
                                    variant="outline"
                                    className={`
                                        ${plan.status === 'REVISION' ? 'bg-yellow-50 text-red-600 border-yellow-200' : 
                                          plan.status === 'ABIERTO' ? 'bg-blue-600 text-white border-blue-700 font-bold' : 
                                          'bg-emerald-100 text-emerald-800 border-emerald-200'}
                                    `}
                                >
                                    {plan.status === 'ABIERTO' ? 'EN CURSO' : plan.status === 'REVISION' ? 'EN REVISIÓN' : plan.status}
                                </Badge>

                                <Badge 
                                    variant="secondary"
                                    className={`
                                        ${plan.priority === 'ALTA' ? 'bg-red-100 text-red-700 border-red-200' : 
                                          plan.priority === 'MEDIA' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                          'bg-blue-100 text-blue-700 border-blue-200'}
                                    `}
                                >
                                    {plan.priority || 'MEDIA'}
                                </Badge>
                                
                                {currentUser?.role === 'MANAGER' && plan.status === 'REVISION' && (
                                    <Button 
                                        size="sm" 
                                        variant="default"
                                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
                                        <CheckCircle2 className="w-3 h-3" /> Aprobar Plan
                                    </Button>
                                )}

                                {currentUser?.role === 'MANAGER' && plan.status === 'ABIERTO' && (
                                    <Button 
                                        asChild
                                        size="sm" 
                                        variant="outline" 
                                        className="h-6 text-xs gap-1 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 text-emerald-600 cursor-pointer"
                                    >
                                        <div
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
                                    </Button>
                                )}

                                {total > 0 && (
                                    <div className="flex items-center gap-3 text-[10px] font-bold ml-2 border-l pl-4 border-slate-200 dark:border-slate-800 hidden lg:flex">
                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {finished}/{total} Finalizadas
                                        </div>
                                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            {inProgress}/{total} En Curso
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            {pending}/{total} Pendientes
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground hidden md:flex">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Inicio: {format(new Date(plan.startDate), 'dd/MM/yyyy')}</span>
                                </div>
                                {displayEnd && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Fin: {format(displayEnd, 'dd/MM/yyyy')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[40%]">Actividad</TableHead>
                                    <TableHead>Responsable</TableHead>
                                    <TableHead>Inicio</TableHead>
                                    <TableHead>Fin</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="w-[80px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.activities.map((act: any) => {
                                    const edits = bufferedEdits[act.id];
                                    const isEditing = !!edits;

                                    return (
                                    <TableRow key={act.id}>
                                        <TableCell className="font-medium">{act.description}</TableCell>
                                        <TableCell>
                                            {currentUser?.role === 'MANAGER' && act.status !== 'FINALIZADA' ? (
                                                <Select
                                                    value={edits?.responsibleId || act.responsibleId}
                                                    onValueChange={(val) => handleUpdateResponsible(act.id, val)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs bg-background border-input text-foreground">
                                                        <SelectValue placeholder="Responsable" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white dark:bg-zinc-950 border-input text-foreground">
                                                        {assignableUsers.map((user) => (
                                                            <SelectItem key={user.id} value={user.id}>
                                                                {user.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                act.responsible?.name
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {currentUser?.role === 'MANAGER' && act.status !== 'FINALIZADA' ? (
                                                <Input 
                                                    type="date"
                                                    className="h-8 text-xs w-32"
                                                    value={edits?.startDate || format(new Date(act.startDate), 'yyyy-MM-dd')}
                                                    onChange={(e) => handleUpdateDate(act.id, 'startDate', e.target.value)}
                                                />
                                            ) : (
                                                format(new Date(act.startDate), 'dd/MM/yyyy')
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {currentUser?.role === 'MANAGER' && act.status !== 'FINALIZADA' ? (
                                                <Input 
                                                    type="date"
                                                    className="h-8 text-xs w-32"
                                                    value={edits?.deadline || format(new Date(act.deadline), 'yyyy-MM-dd')}
                                                    onChange={(e) => handleUpdateDate(act.id, 'deadline', e.target.value)}
                                                />
                                            ) : (
                                                format(new Date(act.deadline), 'dd/MM/yyyy')
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={act.status}
                                                onValueChange={(val) => handleUpdateStatus(act.id, val)}
                                            >
                                                <SelectTrigger className={`h-8 w-[140px] border-none ${
                                                    act.status === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 
                                                    act.status === 'EN_PROCESO' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 
                                                    'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PENDIENTE">
                                                        <span className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-gray-400" /> Pendiente
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="EN_PROCESO">
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin-slow" /> En Proceso
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="FINALIZADA">
                                                        <span className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Finalizada
                                                        </span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {isEditing && (
                                                <div className="flex items-center gap-1">
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => saveBufferedEdits(act.id)}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => cancelBufferedEdits(act.id)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                                
                                {/* Add Activity Row */}
                                {(plan.status === 'REVISION' || (currentUser?.role === 'MANAGER' && plan.status === 'ABIERTO')) && (
                                    <TableRow className="bg-blue-50/30 dark:bg-blue-900/10">
                                        <TableCell>
                                            <Input 
                                                className="h-8 text-xs" 
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
                                                <SelectTrigger className="h-8 text-xs bg-background border-input text-foreground">
                                                    <SelectValue placeholder="Resp." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-zinc-950 border-input text-foreground">
                                                    {assignableUsers.map(u => (
                                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="date" 
                                                className="h-8 text-xs" 
                                                value={newActivityState[plan.id]?.start || ''} 
                                                onChange={e => updateActivityForm(plan.id, 'start', e.target.value)} 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="date" 
                                                className="h-8 text-xs" 
                                                value={newActivityState[plan.id]?.end || ''} 
                                                onChange={e => updateActivityForm(plan.id, 'end', e.target.value)} 
                                            />
                                        </TableCell>
                                        <TableCell colSpan={2}>
                                            <Button size="sm" className="h-8 w-full gap-2" onClick={() => handleAddActivity(plan.id)}>
                                                <Plus className="w-3 h-3" /> Agregar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {plan.status === 'ABIERTO' && currentUser?.role !== 'MANAGER' && (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground italic py-2">
                                            El plan está en curso. Solo los administradores pueden agregar nuevas actividades.
                                        </TableCell>
                                     </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
              );
            })}
        </Accordion>
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
