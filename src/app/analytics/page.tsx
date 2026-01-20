import prisma from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // Need to make sure this exists or just use div
import { BarChart3, PieChart, AlertOctagon, CheckSquare } from 'lucide-react';

export default async function AnalyticsPage() {
  const plans = await prisma.actionPlan.findMany({
    include: { variation: true }
  });

  const total = plans.length;
  const done = plans.filter(p => p.status === 'DONE').length;
  const pending = plans.filter(p => p.status === 'PENDING').length;
  const inProgress = plans.filter(p => p.status === 'IN_PROGRESS').length;

  const systemic = plans.filter(p => p.variation.failureType === 'SYSTEMIC').length;
  const usage = plans.filter(p => p.variation.failureType === 'USAGE').length;
  
  const completionRate = total > 0 ? (done / total) * 100 : 0;
  
  // Calculate overdue
  const now = new Date();
  const overdue = plans.filter(p => p.deadline && p.deadline < now && p.status !== 'DONE').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Strategic Analytics</h1>
        <p className="text-muted-foreground">Insights into production stability and action plan effectiveness.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Completion Rate" value={`${completionRate.toFixed(0)}%`} icon={CheckSquare} color="text-emerald-400" />
        <KPI title="Total Plans" value={total} icon={BarChart3} color="text-blue-400" />
        <KPI title="Overdue Actions" value={overdue} icon={AlertOctagon} color="text-red-400" />
        <KPI title="Systemic Failures" value={systemic} icon={PieChart} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Progress Bars */}
        <Card className="p-6 bg-card/40 backdrop-blur border-border">
            <h3 className="text-lg font-semibold text-white mb-6">Plan Status Distribution</h3>
            <div className="space-y-6">
                <MetricBar label="Done" value={done} total={total} color="bg-emerald-500" />
                <MetricBar label="In Progress" value={inProgress} total={total} color="bg-blue-500" />
                <MetricBar label="Pending" value={pending} total={total} color="bg-orange-500" />
            </div>
        </Card>

        {/* Feature vs Usage */}
        <Card className="p-6 bg-card/40 backdrop-blur border-border">
            <h3 className="text-lg font-semibold text-white mb-6">Failure Type Analysis</h3>
            <div className="flex items-center justify-center gap-8 h-[200px]">
                {/* Simple Visualization */}
                <div className="text-center">
                    <div className="text-4xl font-bold text-purple-400">{systemic}</div>
                    <div className="text-sm text-muted-foreground">Systemic</div>
                    <div className="text-xs text-gray-500">(Process/Machine)</div>
                </div>
                <div className="h-full w-px bg-border"></div>
                <div className="text-center">
                    <div className="text-4xl font-bold text-blue-400">{usage}</div>
                    <div className="text-sm text-muted-foreground">Usage</div>
                    <div className="text-xs text-gray-500">(Operator Error)</div>
                </div>
            </div>
            <p className="text-center text-sm text-gray-400 mt-4">
                {systemic > usage 
                    ? "Focus maintenance and engineering needed." 
                    : "Focus on operator training needed."}
            </p>
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
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-white/5 ${color}`}>
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
                <span className="text-white">{label}</span>
                <span className="text-muted-foreground">{value} ({pct.toFixed(0)}%)</span>
            </div>
            <div className="h-2 w-full bg-accent/20 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
}
