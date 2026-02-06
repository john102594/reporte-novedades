'use client';

import { useState, useEffect } from 'react';
import { getAllActivities, updateActivityStatus, updateActivity } from '@/app/actions/activities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  Calendar,
  ListTodo,
  Filter,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ActivitiesViewProps {
  currentUser: { id: string; role: string } | null;
  users: { 
    id: string; 
    name: string | null; 
    role: string;
    managedAreas?: { id: string }[];
    coordinatedAreas?: { id: string }[];
  }[];
  defaultResponsibleId?: string;
}

interface BufferedEdit {
  responsibleId?: string;
  deadline?: string;
  description?: string;
}

export default function ActivitiesView({ currentUser, users, defaultResponsibleId }: ActivitiesViewProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['PENDIENTE', 'EN_PROCESO']);
  const [responsibleFilter, setResponsibleFilter] = useState<string>(defaultResponsibleId || 'ALL');
  
  // Buffered edits for inline editing
  const [bufferedEdits, setBufferedEdits] = useState<Record<string, BufferedEdit>>({});

  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

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

  const fetchActivities = async () => {
    setLoading(true);
    const filters: { status?: string; responsibleId?: string } = {};
    
    if (responsibleFilter !== 'ALL') {
      filters.responsibleId = responsibleFilter;
    }

    const res = await getAllActivities(filters);
    if (res.success) {
      let result = res.activities || [];
      if (selectedStatuses.length > 0) {
        result = result.filter((a: any) => selectedStatuses.includes(a.status));
      }
      setActivities(result);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [selectedStatuses, responsibleFilter]);

  const handleStatusChange = async (activityId: string, newStatus: string) => {
    const res = await updateActivityStatus(activityId, newStatus);
    if (res.success) {
      toast.success('Estado actualizado');
      fetchActivities();
    } else {
      toast.error('Error al actualizar el estado');
    }
  };

  // Buffered edit functions
  const startEdit = (activityId: string, activity: any) => {
    setBufferedEdits(prev => ({
      ...prev,
      [activityId]: {
        responsibleId: activity.responsibleId || '',
        deadline: format(new Date(activity.deadline), 'yyyy-MM-dd'),
        description: activity.description || ''
      }
    }));
  };

  const updateBuffer = (activityId: string, field: keyof BufferedEdit, value: string) => {
    setBufferedEdits(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value
      }
    }));
  };

  const cancelEdit = (activityId: string) => {
    setBufferedEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[activityId];
      return newEdits;
    });
  };

  const saveEdit = async (activityId: string) => {
    const edits = bufferedEdits[activityId];
    if (!edits) return;

    const res = await updateActivity(activityId, {
      responsibleId: edits.responsibleId,
      deadline: edits.deadline,
      description: edits.description
    });

    if (res.success) {
      toast.success('Actividad actualizada');
      cancelEdit(activityId);
      fetchActivities();
    } else {
      toast.error(res.error || 'Error al actualizar');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FINALIZADA':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'EN_PROCESO':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'FINALIZADA':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100';
      case 'EN_PROCESO':
        return 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      ALTA: 'bg-red-50 text-red-600 border-red-100',
      MEDIA: 'bg-amber-50 text-amber-600 border-amber-100',
      BAJA: 'bg-blue-50 text-blue-600 border-blue-100'
    };
    return styles[priority as keyof typeof styles] || styles.MEDIA;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent tracking-tight">
            Mis Actividades
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Vista unificada de todas las actividades pendientes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 w-fit rounded-xl border border-slate-200/50">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PENDIENTE', label: 'Pendiente' },
            { id: 'EN_PROCESO', label: 'En Curso' },
            { id: 'FINALIZADA', label: 'Finalizada' }
          ].map((tab) => {
            const isActive = tab.id === 'ALL' 
              ? selectedStatuses.length === 0 
              : selectedStatuses.includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => toggleStatus(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200",
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

        {/* Responsible Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
            <SelectTrigger className="h-10 w-[200px] bg-white dark:bg-zinc-950 border-slate-200 rounded-xl">
              <SelectValue placeholder="Filtrar por responsable" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 rounded-xl">
              <SelectItem value="ALL" className="font-medium">Todos los responsables</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-[#5C5DE5]" />
            <p className="font-medium animate-pulse">Cargando actividades...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <ListTodo className="w-12 h-12 opacity-20" />
            <p className="font-medium">No se encontraron actividades con los filtros seleccionados.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider pl-6 w-[30%]">Actividad</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Plan</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Responsable</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Vencimiento</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Estado</TableHead>
                {isManager && <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center pr-6 w-[100px]">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => {
                const isOverdue = new Date(activity.deadline) < new Date() && activity.status !== 'FINALIZADA';
                const edits = bufferedEdits[activity.id];
                const isEditing = !!edits;
                


                // Determine Activity Area ID from Plan
                // This logic mirrors plans-view.tsx
                const activityAreaId = activity.plan?.tasks?.find((t: any) => 
                  t.variation?.detail?.item?.report?.areaId || 
                  t.additionalVariation?.areaId
                )?.variation?.detail?.item?.report?.areaId 
                || activity.plan?.tasks?.find((t: any) => t.additionalVariation?.areaId)?.additionalVariation?.areaId;

                // Filter users for this specific activity
                const activityUsers = users.filter(u => {
                    if (u.role === 'ADMIN') return true; 
                    if (!activityAreaId) return true; // Fallback

                    const manages = u.managedAreas?.some((a: any) => a.id === activityAreaId);
                    const coordinates = u.coordinatedAreas?.some((a: any) => a.id === activityAreaId);
                    return manages || coordinates;
                });
                
                return (
                  <TableRow 
                    key={activity.id} 
                    className={cn(
                      "group hover:bg-slate-50/80 transition-colors border-slate-100",
                      isEditing && "bg-amber-50/30"
                    )}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getStatusIcon(activity.status)}
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          {isEditing ? (
                            <Input
                              className="h-8 text-sm font-bold bg-white border-slate-200 rounded-lg"
                              value={edits.description}
                              onChange={(e) => updateBuffer(activity.id, 'description', e.target.value)}
                              placeholder="Nombre de la actividad"
                            />
                          ) : (
                            <span 
                              className={cn(
                                "font-bold text-slate-700 dark:text-slate-200 text-sm",
                                activity.status === 'FINALIZADA' && "line-through text-slate-400",
                                isManager && "cursor-pointer hover:text-primary"
                              )}
                              onClick={() => isManager && startEdit(activity.id, activity)}
                            >
                              {activity.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md",
                            getPriorityBadge(activity.plan?.priority)
                          )}
                        >
                          {activity.plan?.name || 'Sin plan'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Select 
                          value={edits.responsibleId} 
                          onValueChange={(val) => updateBuffer(activity.id, 'responsibleId', val)}
                        >
                          <SelectTrigger className="h-8 w-[160px] text-xs bg-white border-slate-200 rounded-lg mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl">
                            {activityUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id} className="text-xs">
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div 
                          className={cn(
                            "flex items-center justify-center gap-2 text-slate-600 font-medium text-xs",
                            isManager && "cursor-pointer hover:text-primary"
                          )}
                          onClick={() => isManager && startEdit(activity.id, activity)}
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary/20 to-purple-400/20 flex items-center justify-center font-bold text-[10px] text-primary">
                            {activity.responsible?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="hidden md:inline">{activity.responsible?.name || 'Sin asignar'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input 
                          type="date"
                          className="h-8 w-[130px] text-xs bg-white border-slate-200 rounded-lg mx-auto"
                          value={edits.deadline}
                          onChange={(e) => updateBuffer(activity.id, 'deadline', e.target.value)}
                        />
                      ) : (
                        <div 
                          className={cn(
                            "flex items-center justify-center gap-1.5 text-xs font-bold",
                            isOverdue ? "text-red-500" : "text-slate-500",
                            isManager && "cursor-pointer hover:text-primary"
                          )}
                          onClick={() => isManager && startEdit(activity.id, activity)}
                        >
                          <Calendar className="w-3.5 h-3.5 opacity-50" />
                          {format(new Date(activity.deadline), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Select
                          value={activity.status}
                          onValueChange={(val) => handleStatusChange(activity.id, val)}
                        >
                          <SelectTrigger className={cn(
                            "h-8 w-[140px] text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm transition-all",
                            getStatusStyles(activity.status)
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-950 rounded-xl border-slate-200">
                            <SelectItem value="PENDIENTE" className="text-[10px] font-bold py-2">
                              <span className="flex items-center gap-2 text-slate-500">
                                <Clock className="w-3.5 h-3.5" /> PENDIENTE
                              </span>
                            </SelectItem>
                            <SelectItem value="EN_PROCESO" className="text-[10px] font-bold py-2">
                              <span className="flex items-center gap-2 text-blue-600">
                                <Loader2 className="w-3.5 h-3.5" /> EN PROCESO
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
                    {isManager && (
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                onClick={() => saveEdit(activity.id)}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                                onClick={() => cancelEdit(activity.id)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-300">Click para editar</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary Footer */}
      {!loading && activities.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50">
          <div className="flex items-center gap-6 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              Pendientes: {activities.filter(a => a.status === 'PENDIENTE').length}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              En Curso: {activities.filter(a => a.status === 'EN_PROCESO').length}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Finalizadas: {activities.filter(a => a.status === 'FINALIZADA').length}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Total: {activities.length} actividades
          </span>
        </div>
      )}
    </div>
  );
}
