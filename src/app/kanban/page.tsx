import prisma from '@/lib/prisma';
import { KanbanBoard } from '@/components/kanban/board';

export default async function KanbanPage() {
  const plans = await prisma.actionPlan.findMany({
    include: {
      user: { select: { name: true } },
      tasks: { select: { cause: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent mb-2">Action Plan Board</h1>
        <p className="text-muted-foreground">Track corrective actions from To Do to Done.</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard plans={plans} />
      </div>
    </div>
  );
}
