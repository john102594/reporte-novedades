'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createProgram(formData: FormData) {
  const name = formData.get('name') as string;
  const areaId = formData.get('areaId') as string;
  
  if (!name || !areaId) return { error: 'Name and Area are required' };

  try {
    await prisma.failureProgram.create({
      data: { name, areaId },
    });
    revalidatePath('/masters/causes');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create program.' };
  }
}

export async function deleteProgram(id: string) {
  try {
    await prisma.failureProgram.delete({ where: { id } });
    revalidatePath('/masters/causes');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete program' };
  }
}

export async function updateProgram(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const areaId = formData.get('areaId') as string;
  
  if (!name || !areaId) return { error: 'Name and Area are required' };

  try {
    await prisma.failureProgram.update({
      where: { id },
      data: { name, areaId },
    });
    revalidatePath('/masters/causes');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update program.' };
  }
}
