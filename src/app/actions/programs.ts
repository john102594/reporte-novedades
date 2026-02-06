'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { canPerformAction, validateAreaAccess } from '@/lib/abac';

export async function createProgram(formData: FormData) {
  const name = formData.get('name') as string;
  const areaId = formData.get('areaId') as string;
  
  if (!name || !areaId) return { error: 'Name and Area are required' };

  // ABAC: Check role permission
  const roleCheck = await canPerformAction('create:cause');
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // ABAC: Validate area access
  const areaCheck = await validateAreaAccess(areaId);
  if (!areaCheck.allowed) return { error: areaCheck.reason };

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
  // ABAC: Check role permission
  const roleCheck = await canPerformAction('delete:cause');
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // Find program and validate area access
  const program = await prisma.failureProgram.findUnique({ where: { id } });
  if (!program) return { error: 'Program not found' };

  const areaCheck = await validateAreaAccess(program.areaId);
  if (!areaCheck.allowed) return { error: areaCheck.reason };

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

  // ABAC: Check role permission
  const roleCheck = await canPerformAction('edit:cause');
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // Find program and validate current area access
  const program = await prisma.failureProgram.findUnique({ where: { id } });
  if (!program) return { error: 'Program not found' };

  const currentAreaCheck = await validateAreaAccess(program.areaId);
  if (!currentAreaCheck.allowed) return { error: 'No tienes acceso a este programa.' };

  // Validate new area access
  const newAreaCheck = await validateAreaAccess(areaId);
  if (!newAreaCheck.allowed) return { error: newAreaCheck.reason };

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
