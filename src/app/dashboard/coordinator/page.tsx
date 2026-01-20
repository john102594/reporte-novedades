import prisma from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionConverter } from '@/components/dashboard/action-converter';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default async function CoordinatorDashboard() {
  // Fetch pending variations (those without action plans)
  const pendingVariations = await prisma.variationRecord.findMany({
    where: { actionPlan: { is: null } },
    include: { order: true },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch users for assignment dropdown
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true } // Assuming 'name' exists in schema, check schema again
    // Schema says: name String?
  });
  
  // Safe user mapping
  const safeUsers = users.map(u => ({ ...u, name: u.name || 'Unknown' }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Coordinator Dashboard</h1>
        <p className="text-muted-foreground">Manage exceptions and assign corrective actions.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" /> 
            Pending Deviations 
            <Badge variant="secondary" className="ml-2">{pendingVariations.length}</Badge>
        </h2>

        {pendingVariations.length === 0 ? (
            <Card className="p-8 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-accent/5">
                <CheckCircle2 className="w-12 h-12 mb-4 text-emerald-500/50" />
                <p>All deviations have been addressed. Good job!</p>
            </Card>
        ) : (
            <div className="grid gap-4">
                {pendingVariations.map((v) => (
                    <Card key={v.id} className="p-6 bg-card/40 backdrop-blur border-border hover:border-primary/20 transition-all">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-red-400 border-red-500/20 bg-red-500/10">
                                        -{v.value.toFixed(1)}% Deviation
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">{v.order.otNumber}</span>
                                    <span className="text-sm text-muted-foreground">• {new Date(v.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white">{v.event}</h3>
                                <div className="text-sm text-gray-400">
                                    <span className="font-semibold text-gray-300">Root Cause:</span> {v.rootCause} <br/>
                                    <span className="font-semibold text-gray-300">Failed Program:</span> {v.failedProgram}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 min-w-[200px]">
                                <Badge className={v.failureType === 'SYSTEMIC' ? "bg-purple-500/20 text-purple-300 border-purple-500/50" : "bg-blue-500/20 text-blue-300 border-blue-500/50"}>
                                    {v.failureType} FAILURE
                                </Badge>
                                <div className="mt-auto">
                                    <ActionConverter variation={v} users={safeUsers} />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
