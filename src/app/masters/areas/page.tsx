import prisma from '@/lib/prisma';
import { AreaDialog } from '@/components/masters/areas/area-dialog';
import { AreaActions } from '@/components/masters/areas/area-actions';
import { Badge } from '@/components/ui/badge';
import { Factory } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AreasPage() {
  const areas = await prisma.area.findMany({
    include: { _count: { select: { machines: true } } }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">Production Areas</h1>
          <p className="text-muted-foreground">Manage factory zones and their assigned machines.</p>
        </div>
        <AreaDialog />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Area Name</TableHead>
              <TableHead>Assigned Machines</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.map((area) => (
              <TableRow key={area.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-primary" />
                    {area.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-border text-muted-foreground bg-accent/20">
                    {area._count.machines} Machines
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AreaActions area={area} />
                </TableCell>
              </TableRow>
            ))}
            {areas.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No areas found. Create your first production area.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
