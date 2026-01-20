'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createArea(formData: FormData) {
  const name = formData.get('name') as string;
  
  if (!name) return { error: 'Name is required' };

  try {
    await prisma.area.create({
      data: { name },
    });
    revalidatePath('/masters/areas');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create area. Name might be duplicate.' };
  }
}

export async function deleteArea(id: string) {
  try {
    await prisma.area.delete({ where: { id } });
    revalidatePath('/masters/areas');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete area' };
  }
}

export async function updateArea(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  
  if (!name) return { error: 'Name is required' };

  try {
    await prisma.area.update({
      where: { id },
      data: { name },
    });
    revalidatePath('/masters/areas');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update area.' };
  }
}
