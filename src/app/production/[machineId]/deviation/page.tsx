import prisma from '@/lib/prisma';
import { submitDeviationReport } from '@/app/actions/analysis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ machineId: string }>;
  searchParams: Promise<{ otId: string; type: string; value: string }>;
}

export default async function DeviationPage({ params, searchParams }: PageProps) {
  const { machineId } = await params;
  const { otId, type, value } = await searchParams;

  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { area: { include: { programs: true } } }
  });

  if (!machine) return <div>Machine not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <Link href={`/production/${machineId}`} className="text-muted-foreground hover:text-white flex items-center gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Production
      </Link>

      <Card className="p-8 bg-card/40 backdrop-blur border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
        <div className="flex items-center gap-4 mb-6 text-red-500">
            <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-2xl font-bold">Deviation Report Required</h1>
                <p className="text-red-400/80">Significant variation detected in {type}. Analysis is mandatory.</p>
            </div>
        </div>

        <form action={async (formData) => {
          'use server';
          await submitDeviationReport(formData);
        }} className="space-y-6">
            <input type="hidden" name="otId" value={otId} />
            <input type="hidden" name="machineId" value={machineId} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="deviationValue" value={value} />
            
            {/* 1. What Happened? */}
            <div className="space-y-2">
                <Label className="text-lg font-semibold text-white">1. What happened? (Event)</Label>
                <Input name="event" placeholder="e.g., Ink dried too fast on station 4" required className="bg-black/20 border-white/10" />
            </div>

            {/* 2. Why? (Root Cause) */}
            <div className="space-y-2">
                <Label className="text-lg font-semibold text-white">2. Root Cause</Label>
                <Textarea name="rootCause" placeholder="e.g., Viscosity control valve failure" required className="bg-black/20 border-white/10 min-h-[100px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 3. Failed Program */}
                <div className="space-y-2">
                    <Label className="text-lg font-semibold text-white">3. Failed Program</Label>
                    <Select name="programId" required>
                        <SelectTrigger className="bg-black/20 border-white/10">
                            <SelectValue placeholder="Select Program" />
                        </SelectTrigger>
                        <SelectContent>
                            {machine.area.programs.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 4. Failure Type */}
                <div className="space-y-2">
                    <Label className="text-lg font-semibold text-white">4. Failure Type</Label>
                    <Select name="failureType" required>
                        <SelectTrigger className="bg-black/20 border-white/10">
                            <SelectValue placeholder="Usage vs Systemic" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USAGE">Usage (Operative Error)</SelectItem>
                            <SelectItem value="SYSTEMIC">Systemic (Process/Machine)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                        Usage = Coordinator assigns action.<br/>Systemic = Manager assigns action.
                    </p>
                </div>
            </div>

            <div className="pt-6">
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-6 text-lg shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    Submit Analysis & Unblock
                </Button>
            </div>
        </form>
      </Card>
    </div>
  );
}
