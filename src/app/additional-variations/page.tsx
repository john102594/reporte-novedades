import { getSession, getCurrentUser } from '@/app/actions/auth';
import { getOperators } from '@/app/actions/operators';
import prisma from '@/lib/prisma';
import AdditionalVariationsPage from '@/components/additional-variations/additional-variations-page';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Variaciones Adicionales - FlexFlow',
};

export default async function AdditionalVariationsRoute() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const [operators, causes, openPlans] = await Promise.all([
    getOperators(),
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
      operators={operators} 
      causes={causes} 
      openPlans={openPlans} 
    />
  );
}
