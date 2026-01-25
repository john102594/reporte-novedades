import prisma from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { BarChart3, PieChart, AlertOctagon, CheckSquare } from 'lucide-react';

export default async function AnalyticsPage() {
  const plans = await prisma.actionPlan.findMany({
    include: { 
      tasks: {
        include: { variation: true }
      }
    }
  });

  const total = plans.length;
  // Status check needs to align with new status values (ABIERTO, CERRADO) or legacy?
  // Schema says: default("ABIERTO") // ABIERTO, CERRADO
  // Old code used: DONE, PENDING, IN_PROGRESS. I should map them or update logic.
  // New ActionPlan status: "ABIERTO", "CERRADO". "PlanActivity" has PENDING, EN_PROCESO, FINALIZADA.
  // I'll map CERRADO to done, ABIERTO to pending/inProgress.
  
  const done = plans.filter(p => p.status === 'CERRADO').length;
  const open = plans.filter(p => p.status === 'ABIERTO').length;
  
  // Logic for Systemic/Usage is temporarily unavailable as new schema uses ShiftReportVariation which lacks this field.
  // We will check if we can derive it or just set to 0 for now.
  const systemic = 0; 
  const usage = 0;
  
  const completionRate = total > 0 ? (done / total) * 100 : 0;
  
  // Calculate overdue
  const now = new Date();
  const overdue = plans.filter(p => p.endDate && p.endDate < now && p.status !== 'CERRADO').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent mb-2">Strategic Analytics</h1>
        <p className="text-muted-foreground">Insights into production stability and action plan effectiveness.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Completion Rate" value={`${completionRate.toFixed(0)}%`} icon={CheckSquare} color="text-emerald-400" />
        <KPI title="Total Plans" value={total} icon={BarChart3} color="text-blue-400" />
        <KPI title="Overdue Actions" value={overdue} icon={AlertOctagon} color="text-red-400" />
        <KPI title="Active Plans" value={open} icon={PieChart} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Progress Bars */}
        <Card className="p-6 bg-card/40 backdrop-blur border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6">Plan Status Distribution</h3>
            <div className="space-y-6">
                <MetricBar label="Closed" value={done} total={total} color="bg-emerald-500" />
                <MetricBar label="Open" value={open} total={total} color="bg-blue-500" />
            </div>
        </Card>

        {/* Feature vs Usage - Placeholder/Stubbed */}
        <Card className="p-6 bg-card/40 backdrop-blur border-border flex items-center justify-center">
            <p className="text-muted-foreground italic">Failure Type Analysis temporarily unavailable due to schema update.</p>
        </Card>
      </div>
    </div>
  );
}

function KPI({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
    return (
        <Card className="p-6 bg-card sm:bg-card/60 border-border">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-accent/20 ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </Card>
    );
}

function MetricBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-foreground">{label}</span>
                <span className="text-muted-foreground">{value} ({pct.toFixed(0)}%)</span>
            </div>
            <div className="h-2 w-full bg-accent/20 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
}
