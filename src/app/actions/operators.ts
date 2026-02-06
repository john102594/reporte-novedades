'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

export async function getOperators() {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const where: any = { status: 'ACTIVE' };

    // Isolation: If not ADMIN, filter by managed/coordinated areas
    if (user.role !== 'ADMIN') {
        const allowedAreaIds = user.allowedAreas.map(a => a.id);
        where.areaId = { in: allowedAreaIds };
    }

    return await prisma.operator.findMany({
      where,
      include: { area: true },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching operators:', error);
    return [];
  }
}

export async function createOperator(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const name = formData.get('name') as string;
  const areaId = formData.get('areaId') as string;

  if (!name || !areaId) return { error: 'Name and Area are required' };

  // RBAC & Isolation Check
  if (user.role !== 'ADMIN') {
      const allowedAreaIds = user.allowedAreas.map(a => a.id);
      if (!allowedAreaIds.includes(areaId)) {
          return { error: 'You are not authorized to assign operators to this Area' };
      }
      // ONLY Managers and Coordinators can create operators (implied by previous request, but Admin surely can too)
      if (!['MANAGER', 'COORDINATOR'].includes(user.role)) {
           // Fallback if strictness is needed, but Admin check above handles it. 
           // Technically Gestor shouldn't create? User said "MANAGER solo podra crear COORD, GESTOR y OPERADOR", "COORD solo GESTOR y OPERADOR".
           // So Gestor cannot create.
           if (user.role === 'GESTOR') return { error: 'Gestors cannot create operators' };
      }
  }

  try {
    await prisma.operator.create({
      data: {
        name,
        areaId,
      },
    });
    revalidatePath('/masters/operators');
    return { success: true };
  } catch (error) {
    console.error('Error creating operator:', error);
    return { error: 'Failed to create operator' };
  }
}

export async function updateOperator(id: string, formData: FormData) {
    const user = await getCurrentUser();
    if (!user) return { error: 'Unauthorized' };
  
    const name = formData.get('name') as string;
    const areaId = formData.get('areaId') as string;
    const status = formData.get('status') as string;
  
    if (!name || !areaId) return { error: 'Name and Area are required' };
  
    // Check if operator exists and belongs to allowed area for non-admin
    const existing = await prisma.operator.findUnique({ where: { id } });
    if (!existing) return { error: 'Operator not found' };

    if (user.role !== 'ADMIN') {
        const allowedAreaIds = user.allowedAreas.map(a => a.id);
        
        // Cannot edit if not in your area
        if (!allowedAreaIds.includes(existing.areaId)) {
            return { error: 'Not authorized to edit this operator' };
        }
        // Cannot move to an area you don't manage
        if (!allowedAreaIds.includes(areaId)) {
            return { error: 'Cannot move operator to an area you do not manage' };
        }

        if (user.role === 'GESTOR') return { error: 'Gestors cannot update operators' };
    }
  
    try {
      await prisma.operator.update({
        where: { id },
        data: {
          name,
          areaId,
          status,
        },
      });
      revalidatePath('/masters/operators');
      return { success: true };
    } catch (error) {
      console.error('Error updating operator:', error);
      return { error: 'Failed to update operator' };
    }
  }

export async function deleteOperator(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const existing = await prisma.operator.findUnique({ where: { id } });
  if (!existing) return { error: 'Operator not found' };

  if (user.role !== 'ADMIN') {
      const allowedAreaIds = user.allowedAreas.map(a => a.id);
      if (!allowedAreaIds.includes(existing.areaId)) {
          return { error: 'Not authorized to delete this operator' };
      }
      if (user.role === 'GESTOR') return { error: 'Gestors cannot delete operators' };
  }

  try {
    await prisma.operator.delete({ where: { id } });
    revalidatePath('/masters/operators');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete operator' };
  }
}
