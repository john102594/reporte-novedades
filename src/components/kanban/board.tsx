'use client';

import { updateActionStatus } from '@/app/actions/kanban'; // This might also be broken, need to check
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ActionPlan {
  id: string;
  name: string;
  description: string | null;
  status: string;
  endDate: Date | null;
  user: { name: string | null } | null;
  tasks: { cause: string }[];
}

export function KanbanBoard({ plans }: { plans: ActionPlan[] }) {
  // Map ABIERTO to Pending/InProgress based on something? 
  // For now let's just use ABIERTO as Pending and CERRADO as Done
  
  const pending = plans.filter(p => p.status === 'ABIERTO'); 
  const inProgress: ActionPlan[] = []; // tasks in progress?
  const done = plans.filter(p => p.status === 'CERRADO');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
      <Column title="Open Plans" items={pending} color="border-blue-500/20" badge="bg-blue-500/10 text-blue-400" />
      <Column title="Closed" items={done} color="border-emerald-500/20" badge="bg-emerald-500/10 text-emerald-400" />
    </div>
  );
}

function Column({ title, items, color, badge }: { title: string, items: ActionPlan[], color: string, badge: string }) {
    return (
        <div className={`bg-card/20 rounded-xl p-4 border ${color} flex flex-col gap-4`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">{title}</h3>
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
    // Disable move logic for now as updateActionStatus is likely compatible with old schema
    // async function moveNext() {
    //     await updateActionStatus(item.id);
    // }

    return (
        <Card className="p-4 bg-card border-border hover:border-primary/40 transition-all group">
            <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="text-[10px] tracking-wider border-border text-muted-foreground">
                    PLAN
                </Badge>
                {item.endDate && (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.endDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                    </span>
                )}
            </div>
            
            <h4 className="font-bold text-foreground mb-1">{item.name}</h4>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                {item.description}
            </p>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6 border border-border">
                        <AvatarFallback className="text-[10px] bg-accent text-foreground">
                            {item.user?.name?.substring(0,2).toUpperCase() || '??'}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {item.user?.name || 'Unassigned'}
                    </span>
                </div>
                
                {item.status === 'CERRADO' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
            </div>
        </Card>
    )
}
