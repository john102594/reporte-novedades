import { getSession } from '@/app/actions/auth';
import prisma from '@/lib/prisma';
import ActionPlanPage from '@/components/action-plans/action-plan-page';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Planes de Acción - FlexFlow',
};

export default async function ActionPlansRoute() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [currentUser, users, causes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, role: true }
    }),
    prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'COORDINATOR'] }
      },
      select: { id: true, name: true, role: true }
    }),
    prisma.failureProgram.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <ActionPlanPage currentUser={currentUser} users={users} causes={causes} />
    </div>
  );
}
