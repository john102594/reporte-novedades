import { getSession } from '@/app/actions/auth';
import prisma from '@/lib/prisma';
import ActivitiesView from '@/components/activities/activities-view';
import { redirect } from 'next/navigation';

export default async function ActivitiesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: ['MANAGER', 'COORDINATOR'] }
    },
    select: { id: true, name: true, role: true }
  });

  // Check if current user is in the assignable users list
  const currentUserInList = users.some(u => u.id === session.userId);

  return (
    <ActivitiesView 
      currentUser={{ id: session.userId, role: session.role }}
      users={users}
      defaultResponsibleId={currentUserInList ? session.userId : 'ALL'}
    />
  );
}
