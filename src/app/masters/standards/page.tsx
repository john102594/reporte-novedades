import prisma from '@/lib/prisma';
import { StandardDialog } from '@/components/masters/standards/standard-dialog';
import { StandardActions } from '@/components/masters/standards/standard-actions';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function StandardsPage() {
  const standards = await prisma.standard.findMany({
    include: { machine: { include: { area: true } } }
  });
  
  const machines = await prisma.machine.findMany({
    include: { area: true }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">Process Standards</h1>
          <p className="text-muted-foreground">Configure T1-T5 times and speeds for each machine.</p>
        </div>
        <StandardDialog machines={machines} />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Machine</TableHead>
              <TableHead>T1 Setup</TableHead>
              <TableHead>T5 Speed</TableHead>
              <TableHead className="hidden md:table-cell">T2 Calib</TableHead>
              <TableHead className="hidden md:table-cell">T3 Tone</TableHead>
              <TableHead className="hidden md:table-cell">T4 Apprv</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standards.map((std) => (
              <TableRow key={std.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-blue-500" />
                        {std.machine.name}
                    </div>
                </TableCell>
                <TableCell>
                  <span className="font-bold">{std.t1_setup_min}</span> <span className="text-muted-foreground text-xs">min</span>
                </TableCell>
                <TableCell>
                  <span className="font-bold">{std.t5_run_speed_mpm}</span> <span className="text-muted-foreground text-xs">m/min</span>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                    {std.t2_calibration_min || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                    {std.t3_toning_min || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                    {std.t4_approval_min || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {/* Cast types to satisfy TS if needed, or ensure they match */}
                  <StandardActions standard={std} machines={machines} />
                </TableCell>
              </TableRow>
            ))}
            {standards.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No standards defined. Configure your first machine standard.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
