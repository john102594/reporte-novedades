'use client';

import { useState, useEffect } from 'react';
import { 
  getActionPlans, 
  createActionPlan, 
  createPlanActivity, 
  updateActionPlanStatus,
  updatePlanActivityStatus 
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
  Plus, 
  Calendar, 
  UserCircle, 
  CheckCircle2, 
  Clock, 
  Send, 
  Loader2,
  ChevronDown
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
  const [newPlanStart, setNewPlanStart] = useState('');
  const [newPlanEnd, setNewPlanEnd] = useState('');

  // New Activity Form State (keyed by planId)
  const [newActivityState, setNewActivityState] = useState<Record<string, {
    desc: string;
    resp: string;
    start: string;
    end: string;
  }>>({});

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
    if (!newPlanName || !newPlanStart) return;
    setIsCreatingPlan(true);
    const res = await createActionPlan({
      name: newPlanName,
      startDate: newPlanStart,
      endDate: newPlanEnd || undefined
    });

    if (res.success) {
      setNewPlanName('');
      setNewPlanStart('');
      setNewPlanEnd('');
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
    }
  };

  const handleUpdateStatus = async (actId: string, status: string) => {
      const res = await updatePlanActivityStatus(actId, status);
      if (res.success) fetchPlans();
  };

  // Filter users for assignment (Managers/Coordinators)
  const assignableUsers = users.filter(u => ['MANAGER', 'COORDINATOR'].includes(u.role?.toUpperCase() || ''));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
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
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-white">Crear Nuevo Plan de Acción</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-white">Nombre del Plan</Label>
                        <Input className="bg-background border-input text-white" placeholder="Ej. Plan de mejora Piel de Naranja" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-white">Fecha Inicio</Label>
                            <Input className="bg-background border-input text-white" type="date" value={newPlanStart} onChange={e => setNewPlanStart(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white">Fecha Final (Estimada)</Label>
                            <Input className="bg-background border-input text-white" type="date" value={newPlanEnd} onChange={e => setNewPlanEnd(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={handleCreatePlan} disabled={isCreatingPlan || !newPlanName || !newPlanStart} className="w-full">
                        {isCreatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Plan'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-1">
        <Accordion type="multiple" className="w-full space-y-2">
            {plans.map((plan) => {
                // Calculate max deadline from activities
                const activityDeadlines = plan.activities?.map((a: any) => new Date(a.deadline).getTime()) || [];
                const maxDeadline = activityDeadlines.length > 0 ? new Date(Math.max(...activityDeadlines)) : null;
                const displayEnd = plan.endDate ? new Date(plan.endDate) : maxDeadline;

                return (
                <AccordionItem key={plan.id} value={plan.id} className="border rounded-lg bg-background px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                                <span className="font-semibold text-lg">{plan.name}</span>
                                <Badge variant={plan.status === 'ABIERTO' ? 'default' : 'secondary'}>
                                    {plan.status}
                                </Badge>
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
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.activities.map((act: any) => (
                                    <TableRow key={act.id}>
                                        <TableCell className="font-medium">{act.description}</TableCell>
                                        <TableCell>{act.responsible?.name}</TableCell>
                                        <TableCell>{format(new Date(act.startDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{format(new Date(act.deadline), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                act.status === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                                act.status === 'EN_PROCESO' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''
                                            }>
                                                {act.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Action Buttons Logic */}
                                            {act.status === 'PENDIENTE' && (
                                                <Button size="icon" variant="ghost" title="Iniciar" onClick={() => handleUpdateStatus(act.id, 'EN_PROCESO')}>
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                </Button>
                                            )}
                                            {act.status === 'EN_PROCESO' && (
                                                 <Button size="icon" variant="ghost" title="Finalizar" onClick={() => handleUpdateStatus(act.id, 'FINALIZADA')}>
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                
                                {/* Add Activity Row */}
                                <TableRow className="bg-blue-50/30 dark:bg-blue-900/10">
                                    <TableCell>
                                        <Input 
                                            placeholder="Nueva actividad..." 
                                            value={newActivityState[plan.id]?.desc || ''}
                                            onChange={e => updateActivityForm(plan.id, 'desc', e.target.value)}
                                            className="bg-background h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={newActivityState[plan.id]?.resp}
                                            onValueChange={v => updateActivityForm(plan.id, 'resp', v)}
                                        >
                                            <SelectTrigger className="bg-background h-8">
                                                <SelectValue placeholder="Resp." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {assignableUsers.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="date" 
                                            value={newActivityState[plan.id]?.start || ''}
                                            onChange={e => updateActivityForm(plan.id, 'start', e.target.value)}
                                            className="bg-background h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="date" 
                                            value={newActivityState[plan.id]?.end || ''}
                                            onChange={e => updateActivityForm(plan.id, 'end', e.target.value)}
                                            className="bg-background h-8"
                                        />
                                    </TableCell>
                                    <TableCell colSpan={2} className="text-right">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleAddActivity(plan.id)}
                                            variant="secondary"
                                            className="gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100"
                                        >
                                            <Send className="w-3 h-3" /> Agregar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
              );
            })}
        </Accordion>
      </div>
    </div>
  );
}
