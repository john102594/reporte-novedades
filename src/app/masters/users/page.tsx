import prisma from '@/lib/prisma';
import { UserDialog } from '@/components/masters/users/user-dialog';
import { UserActions } from '@/components/masters/users/user-actions';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

  /* REMOVED: prisma import not needed for areas if using allowedAreas from session/user logic handled in page component or passed down */
/* BUT actually I need getOperators or getUsers equivalent... wait, current users page calls prisma directly? YES. */
/* I need to call getUsers() instead of prisma.user.findMany to respect filtering */
import { getUsers } from '@/app/actions/users';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const users = await getUsers();
  
  // Admin sees all areas for assignment? getUsers returns filtered users.
  // For the Dialog (Create User), we pass allowedAreas.
  // Admin needs ALL areas for the dialog.
  
  let areasForDialog = currentUser.allowedAreas;
  if (currentUser.role === 'ADMIN') {
      areasForDialog = await prisma.area.findMany({ orderBy: { name: 'asc' } });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">Team Management</h1>
          <p className="text-muted-foreground">Manage roles, permissions, and shift assignments.</p>
        </div>
        <UserDialog areas={areasForDialog} currentUserRole={currentUser.role} />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`
                    ${user.role === 'MANAGER' ? 'border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-500/10' : ''}
                    ${user.role === 'COORDINATOR' ? 'border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10' : ''}
                    ${user.role === 'GESTOR' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : ''}
                    ${user.role === 'OPERATOR' ? 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10' : ''}
                  `}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} areas={areasForDialog} currentUserRole={currentUser.role} />
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No users found. Create your first user.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
