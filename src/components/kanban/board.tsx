'use client';

import { updateActionStatus } from '@/app/actions/kanban';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ActionPlan {
  id: string;
  description: string;
  status: string;
  deadline: Date | null;
  responsible: { name: string | null };
  variation: {
      event: string;
      failureType: string;
  }
}

export function KanbanBoard({ plans }: { plans: ActionPlan[] }) {
  const pending = plans.filter(p => p.status === 'PENDING');
  const inProgress = plans.filter(p => p.status === 'IN_PROGRESS');
  const done = plans.filter(p => p.status === 'DONE');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
      <Column title="To Do" items={pending} color="border-orange-500/20" badge="bg-orange-500/10 text-orange-400" />
      <Column title="In Progress" items={inProgress} color="border-blue-500/20" badge="bg-blue-500/10 text-blue-400" />
      <Column title="Done" items={done} color="border-emerald-500/20" badge="bg-emerald-500/10 text-emerald-400" />
    </div>
  );
}

function Column({ title, items, color, badge }: { title: string, items: ActionPlan[], color: string, badge: string }) {
    return (
        <div className={`bg-card/20 rounded-xl p-4 border ${color} flex flex-col gap-4`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{title}</h3>
                <Badge variant="secondary" className={badge}>{items.length}</Badge>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto">
                {items.map(item => (
                    <KanbanCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}

function KanbanCard({ item }: { item: ActionPlan }) {
    async function moveNext() {
        await updateActionStatus(item.id);
    }

    return (
        <Card className="p-4 bg-card border-border hover:border-primary/40 transition-all group">
            <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="text-[10px] tracking-wider border-border text-muted-foreground">
                    {item.variation.failureType}
                </Badge>
                {item.deadline && (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.deadline).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                    </span>
                )}
            </div>
            
            <p className="text-sm font-medium text-white mb-3 line-clamp-3">
                {item.description}
            </p>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6 border border-border">
                        <AvatarFallback className="text-[10px] bg-accent text-white">
                            {item.responsible.name?.substring(0,2).toUpperCase() || '??'}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {item.responsible.name}
                    </span>
                </div>
                
                {item.status !== 'DONE' && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={moveNext}>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                )}
                {item.status === 'DONE' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
            </div>
        </Card>
    )
}
