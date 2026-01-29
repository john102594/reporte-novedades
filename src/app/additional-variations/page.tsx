import { getSession } from '@/app/actions/auth';
import prisma from '@/lib/prisma';
import AdditionalVariationsPage from '@/components/additional-variations/additional-variations-page';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Variaciones Adicionales - FlexFlow',
};

export default async function AdditionalVariationsRoute() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [currentUser, users, causes, openPlans] = await Promise.all([
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
    }),
    prisma.actionPlan.findMany({
      where: { status: 'ABIERTO' },
      select: { id: true, name: true }
    })
  ]);

  return (
    <AdditionalVariationsPage 
      currentUser={currentUser} 
      users={users} 
      causes={causes} 
      openPlans={openPlans} 
    />
  );
}
