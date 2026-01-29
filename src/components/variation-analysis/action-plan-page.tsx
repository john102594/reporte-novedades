'use client';

import React, { useState, useEffect } from 'react';
import { getActionTasks } from '@/app/actions/action-tasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TaskReviewDialog } from './task-review-dialog';
import { ClipboardList, CheckCircle2, AlertCircle, Clock, Filter, X } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ActionTask {
  id: string;
  ot: string;
  cause: string;
  details: string;
  rootCauseAnalysis: string | null;
  status: string;
  createdAt: Date;
  responsibleId: string | null;
  responsible: { name: string | null } | null;
  actionPlanId: string | null;
  actionPlan?: { 
    id: string; 
    name: string; 
    status: string;
    startDate?: string | Date;
    activities?: {
      id: string;
      description: string;
      responsibleId: string;
      startDate: string | Date;
      deadline: string | Date;
      responsible?: { name: string | null };
    }[]
  } | null;
  activities: any[];
}

export default function ActionPlanPage({ currentUser, users, causes, openPlans }: { 
  currentUser: { id: string; role: string } | null, 
  users: { id: string; name: string | null; role: string }[], 
  causes: { id: string; name: string }[],
  openPlans: { id: string; name: string }[]
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialOt = searchParams.get('ot');
  const initialTaskId = searchParams.get('taskId');

  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchOt, setSearchOt] = useState(initialOt || '');
  const [activeTaskId, setActiveTaskId] = useState(initialTaskId || null);

  // Update params when URL changes
  useEffect(() => {
    setSearchOt(searchParams.get('ot') || '');
    setActiveTaskId(searchParams.get('taskId') || null);
  }, [searchParams]);

  const clearSearch = () => {
    setSearchOt('');
    setActiveTaskId(null);
    router.push('/variation-analysis');
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
        // Remove taskId from URL but keep other state if needed, or just clear all
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('taskId');
        router.push(`/variation-analysis?${newParams.toString()}`);
    }
  };

  const fetchTasks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const data = await getActionTasks();
    if (!('error' in data)) {
      setTasks(data as any);
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(t => {
    // If specific task ID is requested, only show that one (or at least ensure it's included)
    if (activeTaskId) return t.id === activeTaskId;

    // Filter by OT if present
    if (searchOt && !t.ot.includes(searchOt)) return false;
    
    // Filter by Status
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POR_REVISAR': return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Por Revisar</Badge>;
      case 'REVISADA': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Revisada</Badge>;
      case 'EN_PLAN_DE_ACCION': return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">En Plan de Acción</Badge>;
      case 'FINALIZADA': return <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Finalizada</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPlanStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'REVISION': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">En Revisión</Badge>;
      case 'ABIERTO': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Abierto</Badge>;
      case 'CERRADO': return <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20">Cerrado</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
            Analisis de Variaciones
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Gestión y seguimiento de variaciones reportadas.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Button 
            variant={filter === 'ALL' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setFilter('ALL')}
            className="rounded-full"
          >
            Todos
          </Button>
          <Button 
            variant={filter === 'POR_REVISAR' ? 'destructive' : 'outline'} 
            size="sm" 
            onClick={() => setFilter('POR_REVISAR')}
            className="rounded-full"
          >
            Por Revisar
          </Button>
          <Button 
            variant={filter === 'REVISADA' ? 'secondary' : 'outline'} 
            size="sm" 
            onClick={() => setFilter('REVISADA')}
            className="rounded-full"
          >
            Revisadas
          </Button>
          <Button 
            variant={filter === 'EN_PLAN_DE_ACCION' ? 'outline' : 'outline'} 
            size="sm" 
            onClick={() => setFilter('EN_PLAN_DE_ACCION')}
            className={filter === 'EN_PLAN_DE_ACCION' ? 'rounded-full bg-orange-500/10 text-orange-500' : 'rounded-full'}
          >
            En Plan
          </Button>
        </div>
        </div>

      {(searchOt || activeTaskId) && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg w-fit animate-in fade-in slide-in-from-left-4">
             <span className="text-xs font-bold text-purple-700 dark:text-purple-300 pl-2">
                {activeTaskId ? 'Viendo Tarea Específica' : `Filtrando por OT: ${searchOt}`}
             </span>
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-purple-100 dark:hover:bg-purple-800"
                onClick={clearSearch}
             >
                <X className="w-3 h-3 text-purple-700" />
             </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: tasks.length, icon: ClipboardList, color: 'text-primary' },
          { label: 'Pendientes', value: tasks.filter(t => t.status === 'POR_REVISAR').length, icon: AlertCircle, color: 'text-red-500' },
          { label: 'En Plan', value: tasks.filter(t => t.status === 'EN_PLAN_DE_ACCION').length, icon: Clock, color: 'text-orange-500' },
          { label: 'Finalizadas', value: tasks.filter(t => t.status === 'FINALIZADA').length, icon: CheckCircle2, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-accent/50 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-accent/30">
              <TableRow>
                <TableHead className="w-[100px]">OT</TableHead>
                <TableHead>Causa Reportada</TableHead>
                <TableHead>Estado Tarea</TableHead>
                <TableHead>Estado Plan</TableHead>
                <TableHead>Fecha Reporte</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">Cargando tareas...</TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No hay tareas que mostrar.</TableCell>
                </TableRow>
              ) : filteredTasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-accent/20 transition-colors">
                  <TableCell className="font-bold">{task.ot}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{task.cause}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{task.details}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>{getPlanStatusBadge(task.actionPlan?.status)}</TableCell>
                  <TableCell className="text-xs">{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <TaskReviewDialog 
                      task={task} 
                      currentUser={currentUser} 
                      users={users} 
                      causes={causes}
                      openPlans={openPlans}
                      onUpdate={() => fetchTasks(false)} 
                      externalOpen={activeTaskId === task.id}
                      onExternalOpenChange={handleDialogClose}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
