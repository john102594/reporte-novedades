'use client';

import { useState } from 'react';
import { 
  updateTaskAnalysis, 
  approveActionPlan, 
  createActivity, 
  updateActivityStatus, 
  approveActivity,
  updateTaskCause,
  revokeActionPlan
} from '@/app/actions/action-tasks';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Plus, Send, CheckCircle2, UserCircle, Calendar, ClipboardList, Clock, Pencil, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function TaskReviewDialog({ task, currentUser, users, onUpdate, causes }: {
  task: {
    id: string;
    ot: string;
    cause: string;
    details: string;
    rootCauseAnalysis: string | null;
    status: string;
    responsibleId: string | null;
    createdAt: string | Date;
    activities: any[];
  }, 
  currentUser: { id: string, role: string } | null, 
  users: { id: string; name: string | null; role: string }[],
  causes: { id: string; name: string }[],
  onUpdate: () => void 
}) {
  const [open, setOpen] = useState(false);
  const [rca, setRca] = useState(task.rootCauseAnalysis || '');
  const [responsibleId, setResponsibleId] = useState(task.responsibleId || '');
  
  // Cause Edit State
  const [isEditingCause, setIsEditingCause] = useState(false);
  const [selectedCause, setSelectedCause] = useState(task.cause);

  
  // New Activity State
  const [newActDesc, setNewActDesc] = useState('');
  const [newActResp, setNewActResp] = useState('');
  const [newActDate, setNewActDate] = useState('');

  const canEditRCA = (currentUser?.role === 'COORDINATOR' || currentUser?.role === 'MANAGER') && 
                     (task.status === 'POR_REVISAR' || task.status === 'REVISADA');
  
  const canApprovePlan = currentUser?.role === 'MANAGER' && task.status === 'REVISADA';
  const canRevokePlan = currentUser?.role === 'MANAGER' && task.status === 'EN_PLAN_DE_ACCION';
  
  const canAddActivity = (currentUser?.role === 'COORDINATOR' || currentUser?.role === 'MANAGER') && 
                         (task.status === 'REVISADA' || task.status === 'EN_PLAN_DE_ACCION');

  const handleUpdateCause = async () => {
      const res = await updateTaskCause(task.id, selectedCause);
      if ('success' in res) {
        setIsEditingCause(false);
        onUpdate();
      }
  };

  const handleUpdateRCA = async () => {
    if (!rca || !responsibleId) return;
    const res = await updateTaskAnalysis(task.id, rca, responsibleId);
    if ('success' in res) onUpdate();
  };

  const handleApprovePlan = async () => {
    const res = await approveActionPlan(task.id);
    if ('success' in res) onUpdate();
  };

  const handleRevokePlan = async () => {
    const res = await revokeActionPlan(task.id);
    if ('success' in res) onUpdate();
  };

  const handleAddActivity = async () => {
    if (!newActDesc || !newActResp || !newActDate) return;
    const res = await createActivity(task.id, {
      description: newActDesc,
      responsibleId: newActResp,
      deadline: newActDate
    });
    if ('success' in res) {
      setNewActDesc('');
      setNewActResp('');
      setNewActDate('');
      onUpdate();
    }
  };

  const handleUpdateActStatus = async (actId: string, status: string) => {
    const res = await updateActivityStatus(actId, status);
    if ('success' in res) onUpdate();
  };

  const handleApproveAct = async (actId: string) => {
    const res = await approveActivity(actId);
    if ('success' in res) onUpdate();
  };

  const filteredUsers = users.filter(u => ['MANAGER', 'COORDINATOR'].includes(u.role));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="w-4 h-4" /> Detalle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[60vw] !w-[95vw] sm:!w-[60vw] max-h-[90vh] overflow-y-auto !bg-white dark:!bg-zinc-950 !opacity-100 shadow-2xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span>Gestión de Tarea - OT: {task.ot}</span>
            </div>
            <Badge variant="outline" className="bg-accent/50">{task.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Information from Variation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-accent/10 p-4 rounded-xl border border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-muted-foreground">Causa Reportada</Label>
                {canEditRCA && !isEditingCause && (
                   <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingCause(true)}>
                     <Pencil className="w-3 h-3" />
                   </Button>
                )}
              </div>
              
              {isEditingCause ? (
                <div className="flex gap-2 items-center">
                  <Select value={selectedCause} onValueChange={setSelectedCause}>
                    <SelectTrigger className="h-8 bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Seleccionar causa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {causes.map((c) => (
                         <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" className="h-8 w-8" onClick={handleUpdateCause}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditingCause(false); setSelectedCause(task.cause); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="font-semibold text-lg">{task.cause}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Análisis Inicial (Gestor)</Label>
              <p className="text-sm border-l-2 border-primary/50 pl-3 italic">{task.details}</p>
            </div>
          </div>

          <Separator />

          {/* Analysis Section (Coordinator/Manager) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Análisis de Causa Raíz (RCA)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Análisis de Causa</Label>
                <Textarea 
                  placeholder="Explique el análisis realizado..."
                  value={rca}
                  onChange={(e) => setRca(e.target.value)}
                  disabled={!canEditRCA}
                  className="min-h-[100px] bg-accent/5"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Responsable de Seguimiento</Label>
                  <Select 
                    value={responsibleId} 
                    onValueChange={setResponsibleId}
                    disabled={!canEditRCA}
                  >
                    <SelectTrigger className="bg-accent/5">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canEditRCA && (
                  <Button onClick={handleUpdateRCA} className="w-full gap-2">
                    <Send className="w-4 h-4" /> Guardar Análisis
                  </Button>
                )}
                {canApprovePlan && (
                  <Button onClick={handleApprovePlan} variant="secondary" className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                    <CheckCircle2 className="w-4 h-4" /> Aprobar Plan de Acción
                  </Button>
                )}
                {canRevokePlan && (
                  <Button onClick={handleRevokePlan} variant="destructive" className="w-full gap-2">
                    <X className="w-4 h-4" /> Desaprobar Plan
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Plan Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Plan de Actividades</h3>
              </div>
            </div>

            {/* Activities Table */}
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-accent/20">
                  <TableRow>
                    <TableHead>Actividad</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {task.activities?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4 italic">No hay actividades definidas.</TableCell>
                    </TableRow>
                  ) : task.activities?.map((act: any) => (
                    <TableRow key={act.id}>
                      <TableCell className="font-medium text-sm">{act.description}</TableCell>
                      <TableCell className="text-sm">{act.responsible?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(act.deadline).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {act.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {act.status === 'PENDIENTE' && (currentUser?.id === act.responsibleId || currentUser?.role === 'MANAGER') && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdateActStatus(act.id, 'EN_PROCESO')}>
                              <Clock className="w-3 h-3 text-orange-500" />
                            </Button>
                          )}
                          {act.status === 'EN_PROCESO' && (currentUser?.id === act.responsibleId || currentUser?.role === 'MANAGER') && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdateActStatus(act.id, 'EN_APROBACION')}>
                              <Send className="w-3 h-3 text-blue-500" />
                            </Button>
                          )}
                          {act.status === 'EN_APROBACION' && currentUser?.role === 'MANAGER' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleApproveAct(act.id)}>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Row for Adding New Activity */}
                  {canAddActivity && (
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell>
                        <Input 
                          placeholder="Nueva actividad..." 
                          className="h-8 text-sm"
                          value={newActDesc}
                          onChange={(e) => setNewActDesc(e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={newActResp} onValueChange={setNewActResp}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Resp..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="date" 
                          className="h-8 text-xs" 
                          value={newActDate}
                          onChange={(e) => setNewActDate(e.target.value)}
                        />
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="h-8 gap-1" onClick={handleAddActivity}>
                          <Plus className="w-4 h-4" /> Agregar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
