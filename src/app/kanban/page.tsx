import prisma from '@/lib/prisma';
import { KanbanBoard } from '@/components/kanban/board';

export default async function KanbanPage() {
  const plans = await prisma.actionPlan.findMany({
    include: {
      responsible: { select: { name: true } },
      variation: { select: { event: true, failureType: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Action Plan Board</h1>
        <p className="text-muted-foreground">Track corrective actions from To Do to Done.</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard plans={plans} />
      </div>
    </div>
  );
}
