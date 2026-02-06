import { getOperators } from '@/app/actions/operators';
import { getCurrentUser } from '@/app/actions/auth';
import prisma from '@/lib/prisma';
import { OperatorDialog } from '@/components/masters/operators/operator-dialog';
import { OperatorActions } from '@/components/masters/operators/operator-actions';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { redirect } from 'next/navigation';

export default async function OperatorsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const operators = await getOperators();
  
  let allowedAreas = user.allowedAreas || [];
  if (user.role === 'ADMIN') {
    allowedAreas = await prisma.area.findMany({ orderBy: { name: 'asc' } });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">Operator Management</h1>
          <p className="text-muted-foreground">Manage operators by area.</p>
        </div>
        {(user.role === 'ADMIN' || ['MANAGER', 'COORDINATOR'].includes(user.role)) && (
             <OperatorDialog areas={allowedAreas} />
        )}
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Name</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operators.map((op) => (
              <TableRow key={op.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {op.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{op.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                    {op.area?.name}
                  </Badge>
                </TableCell>
                 <TableCell>
                  <Badge variant="outline" className={op.status === 'ACTIVE' ? 'border-green-500/50 text-green-600 bg-green-500/10' : 'bg-secondary text-secondary-foreground'}>
                    {op.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                {(user.role === 'ADMIN' || ['MANAGER', 'COORDINATOR'].includes(user.role)) && (
                  <OperatorActions operator={op} areas={allowedAreas} />
                )}
                </TableCell>
              </TableRow>
            ))}
            {operators.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No operators found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
