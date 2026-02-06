import prisma from '@/lib/prisma';
import { getAllowedAreaIds, getAllowedAreas } from '@/lib/abac';
import { MachineDialog } from '@/components/masters/machines/machine-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Factory } from 'lucide-react';
import { MachineActions } from '@/components/masters/machines/machine-actions';

export default async function MachinesPage() {
  // ABAC: Get user's allowed area IDs
  const allowedAreaIds = await getAllowedAreaIds();
  
  // Build where clause for area filtering
  const areaWhere = allowedAreaIds ? { areaId: { in: allowedAreaIds } } : {};
  
  const machines = await prisma.machine.findMany({
    where: areaWhere,
    include: { 
      area: true, 
      _count: { select: { operators: true } },
      operators: { select: { id: true, name: true } }
    }
  });
  
  // Get only allowed areas (for dropdown)
  const areas = await getAllowedAreas();
  
  // Get operators from allowed areas
  const operators = await prisma.operator.findMany({
    where: allowedAreaIds ? { 
      areaId: { in: allowedAreaIds }
    } : {},
    select: { id: true, name: true, areaId: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">Machine Inventory</h1>
          <p className="text-muted-foreground">Configure machines and assign them to production areas.</p>
        </div>
        <MachineDialog areas={areas} operators={operators} />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Machine Name</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Operators</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow key={machine.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-foreground">{machine.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-border text-muted-foreground bg-accent/20">
                    <Factory className="w-3 h-3 mr-1" />
                    {machine.area.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-muted-foreground">
                    <span className="text-sm">{machine._count.operators} Assigned</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <MachineActions machine={machine} areas={areas} operators={operators} />
                </TableCell>
              </TableRow>
            ))}
            {machines.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No machines found. Create your first machine to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
