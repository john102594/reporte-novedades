'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createMachine(formData: FormData) {
  const name = formData.get('name') as string;
  const areaId = formData.get('areaId') as string;
  const operatorIds = formData.getAll('operatorIds') as string[];
  
  if (!name || !areaId) return { error: 'Name and Area are required' };

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
