'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateActionStatus(id: string, customStatus?: string) {
  // Logic to cycle status or set specific
  // PENDING -> IN_PROGRESS -> DONE
  
  try {
     const plan = await prisma.actionPlan.findUnique({ where: { id } });
     if (!plan) return { error: 'Plan not found' };

     let nextStatus = 'PENDING';
     if (customStatus) {
         nextStatus = customStatus;
     } else {
         if (plan.status === 'PENDING') nextStatus = 'IN_PROGRESS';
         else if (plan.status === 'IN_PROGRESS') nextStatus = 'DONE';
         else return; // Already Done
     }

     await prisma.actionPlan.update({
         where: { id },
         data: { status: nextStatus }
     });
     
     revalidatePath('/kanban');
     revalidatePath('/dashboard/coordinator');
     return { success: true };
  } catch (error) {
      return { error: 'Failed to update status' };
  }
}
