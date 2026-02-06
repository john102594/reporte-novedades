import React from 'react';
import prisma from '@/lib/prisma';
import { ProductionManager } from '@/components/production/production-manager';
import { getSession } from '../actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProductionPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let areas;
  if (session.role === 'ADMIN') {
    // ADMIN sees all areas
    areas = await prisma.area.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
  } else if (session.role === 'MANAGER') {
    // MANAGER sees only their managed areas (via gestores relation = managedAreas)
    areas = await prisma.area.findMany({
        where: {
            gestores: {
                some: { id: session.userId }
            }
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
  } else if (session.role === 'COORDINATOR') {
    // COORDINATOR sees only their coordinated areas
    areas = await prisma.area.findMany({
        where: {
            coordinators: {
                some: { id: session.userId }
            }
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
  } else {
    // GESTOR sees only their assigned areas
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
  const serializedAreas = (areas || []).map(area => ({
    id: area.id,
    name: area.name
  }));

  return (
    <div className="space-y-6">
       <ProductionManager areas={serializedAreas} userId={session.userId} />
    </div>
  );
}
