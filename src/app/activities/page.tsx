import { getSession } from '@/app/actions/auth';
import { getAllowedAreaIds } from '@/lib/abac';
import prisma from '@/lib/prisma';
import ActivitiesView from '@/components/activities/activities-view';
import { redirect } from 'next/navigation';

export default async function ActivitiesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }


  const allowedAreaIds = await getAllowedAreaIds();
  const whereUser: any = {
    role: { in: ['MANAGER', 'COORDINATOR'] }
  };

  if (allowedAreaIds) {
    whereUser.OR = [
      { managedAreas: { some: { id: { in: allowedAreaIds } } } },
      { coordinatedAreas: { some: { id: { in: allowedAreaIds } } } }
    ];
  }

  const users = await prisma.user.findMany({
    where: whereUser,
    select: { 
      id: true, 
      name: true, 
      role: true,
      managedAreas: { select: { id: true } },
      coordinatedAreas: { select: { id: true } }
    }
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
