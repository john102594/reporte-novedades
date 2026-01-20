import prisma from '@/lib/prisma';
import { ProductionManager } from '@/components/production/production-manager';

export const dynamic = 'force-dynamic';

import { getSession } from '../actions/auth';
import { redirect } from 'next/navigation';

export default async function ProductionPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let areas;
  if (session.role === 'MANAGER') {
    areas = await prisma.area.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
  } else {
    // Only fetch areas assigned to this user
    areas = await prisma.area.findMany({
        where: {
            gestores: {
                some: { id: session.userId }
            }
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
  }

  // Sanitize data for Client Component with explicit mapping
  const serializedAreas = areas.map(area => ({
    id: area.id,
    name: area.name
  }));

  return (
    <div className="space-y-6">
       <ProductionManager areas={serializedAreas} userId={session.userId} />
    </div>
  );
}
