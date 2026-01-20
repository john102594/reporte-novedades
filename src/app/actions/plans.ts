'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createActionPlan(formData: FormData) {
  const variationId = formData.get('variationId') as string;
  const description = formData.get('description') as string;
  const deadlineStr = formData.get('deadline') as string;
  const responsibleId = formData.get('responsibleId') as string;

  if (!variationId || !description || !responsibleId) {
    return { error: 'Missing required fields' };
  }

  try {
    await prisma.actionPlan.create({
      data: {
        variationId,
        description,
        responsibleId,
        deadline: deadlineStr ? new Date(deadlineStr) : null,
        status: 'PENDING',
      },
    });

    revalidatePath('/dashboard/coordinator');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create action plan' };
  }
}
