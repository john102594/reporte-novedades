import prisma from '@/lib/prisma';
import { ProgramDialog } from '@/components/masters/causes/program-dialog';
import { ProgramActions } from '@/components/masters/causes/program-actions';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CausesPage() {
  const programs = await prisma.failureProgram.findMany({
    include: { area: true },
    orderBy: { area: { name: 'asc' } }
  });
  
  const areas = await prisma.area.findMany({ select: { id: true, name: true } });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">Cause Matrix Configuration</h1>
          <p className="text-muted-foreground">Define the Preventive & Maintenance Programs that can fail.</p>
        </div>
        <ProgramDialog areas={areas} />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Program Name</TableHead>
              <TableHead>Target Area</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((program) => (
              <TableRow key={program.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                    {program.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-border text-muted-foreground bg-accent/20">
                    {program.area.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ProgramActions program={program} areas={areas} />
                </TableCell>
              </TableRow>
            ))}
            {programs.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No programs defined. Create your first program.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
