import { getSession } from '@/app/actions/auth';
import prisma from '@/lib/prisma';
import PlansView from '@/components/action-plans/plans-view';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Planes de Acción - FlexFlow',
};

export default async function ActionPlansRoute() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [users] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'COORDINATOR'] }
      },
      select: { id: true, name: true, role: true }
    })
  ]);

  const currentUser = {
    id: session.userId,
    role: session.role || ''
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PlansView currentUser={currentUser} users={users} />
    </div>
  );
}
