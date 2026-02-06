'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { canPerformAction, validateAreaAccess } from '@/lib/abac';

export async function createMachine(formData: FormData) {
  const name = formData.get('name') as string;
  const areaId = formData.get('areaId') as string;
  const operatorIds = formData.getAll('operatorIds') as string[];
  
  if (!name || !areaId) return { error: 'Name and Area are required' };

  // ABAC: Check role permission
  const roleCheck = await canPerformAction('create:machine');
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // ABAC: Validate area access
  const areaCheck = await validateAreaAccess(areaId);
  if (!areaCheck.allowed) return { error: areaCheck.reason };

  try {
    await prisma.machine.create({
      data: { 
        name, 
        areaId,
        operators: {
          connect: operatorIds.map(id => ({ id }))
        }
      },
    });
    revalidatePath('/masters/machines');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create machine.' };
  }
}

export async function deleteMachine(id: string) {
  // ABAC: Check role permission
  const roleCheck = await canPerformAction('delete:machine');
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // Find machine and validate area access
  const machine = await prisma.machine.findUnique({ where: { id } });
  if (!machine) return { error: 'Machine not found' };

  const areaCheck = await validateAreaAccess(machine.areaId);
  if (!areaCheck.allowed) return { error: areaCheck.reason };

  try {
    await prisma.machine.delete({ where: { id } });
    revalidatePath('/masters/machines');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete machine' };
  }
}

export async function updateMachine(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const areaId = formData.get('areaId') as string;
  const operatorIds = formData.getAll('operatorIds') as string[];
  
  if (!name || !areaId) return { error: 'Name and Area are required' };

  // ABAC: Check role permission
  const roleCheck = await canPerformAction('edit:machine');
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // Find machine and validate current area access
  const machine = await prisma.machine.findUnique({ where: { id } });
  if (!machine) return { error: 'Machine not found' };

  const currentAreaCheck = await validateAreaAccess(machine.areaId);
  if (!currentAreaCheck.allowed) return { error: 'No tienes acceso a esta máquina.' };

  // Validate new area access
  const newAreaCheck = await validateAreaAccess(areaId);
  if (!newAreaCheck.allowed) return { error: newAreaCheck.reason };

  try {
    await prisma.machine.update({
      where: { id },
      data: { 
        name, 
        areaId,
        operators: {
          set: operatorIds.map(id => ({ id }))
        }
      },
    });
    revalidatePath('/masters/machines');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update machine.' };
  }
}
