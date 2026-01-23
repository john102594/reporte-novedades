'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth';

// --- Action Plans ---

export async function getActionPlans() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const plans = await prisma.actionPlan.findMany({
      include: {
        activities: {
          include: {
            responsible: true
          },
          orderBy: { startDate: 'asc' }
        },
        tasks: {
          select: { ot: true } // Just to show linked OTs
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, plans };
  } catch (error) {
    console.error('Error fetching plans:', error);
    return { error: 'Failed to fetch plans' };
  }
}

export async function createActionPlan(data: { name: string, startDate: string, endDate?: string }) {
  const session = await getSession();
  if (!session || (session.role !== 'MANAGER' && session.role !== 'COORDINATOR')) {
    return { error: 'Unauthorized' };
  }

  try {
    const plan = await prisma.actionPlan.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: 'ABIERTO'
      }
    });
    revalidatePath('/action-plans');
    return { success: true, plan };
  } catch (error) {
    console.error('Error creating plan:', error);
    return { error: 'Failed to create plan' };
  }
}

export async function updateActionPlanStatus(planId: string, status: string) {
    const session = await getSession();
    if (!session || session.role !== 'MANAGER') {
      return { error: 'Unauthorized' };
    }
  
    try {
      const plan = await prisma.actionPlan.update({
        where: { id: planId },
        data: { status }
      });
      revalidatePath('/action-plans');
      return { success: true, plan };
    } catch (error) {
      console.error('Error updating plan status:', error);
      return { error: 'Failed to update plan status' };
    }
}

// --- Plan Activities ---

export async function createPlanActivity(planId: string, data: { description: string, responsibleId: string, startDate: string, deadline: string }) {
  const session = await getSession();
  if (!session || (session.role !== 'MANAGER' && session.role !== 'COORDINATOR')) {
    return { error: 'Unauthorized' };
  }

  try {
    const activity = await prisma.planActivity.create({
      data: {
        planId,
        description: data.description,
        responsibleId: data.responsibleId,
        startDate: new Date(data.startDate),
        deadline: new Date(data.deadline),
        status: 'PENDIENTE'
      }
    });
    revalidatePath('/action-plans');
    return { success: true, activity };
  } catch (error) {
    console.error('Error creating activity:', error);
    return { error: 'Failed to create activity' };
  }
}

export async function updatePlanActivityStatus(activityId: string, status: string) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
  
    try {
      const activity = await prisma.planActivity.update({
        where: { id: activityId },
        data: { status }
      });

      // Check if we should close the plan? (Optional per requirement, but good practice)
      // For now, just update activity.
      
      revalidatePath('/action-plans');
      return { success: true, activity };
    } catch (error) {
      console.error('Error updating activity:', error);
      return { error: 'Failed to update activity' };
    }
}
export async function assignTaskToPlan(taskId: string, planId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'MANAGER' && session.role !== 'COORDINATOR')) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.actionTask.update({
      where: { id: taskId },
      data: { 
        actionPlanId: planId,
        status: 'EN_PLAN_DE_ACCION'
      }
    });
    revalidatePath('/variation-analysis');
    return { success: true };
  } catch (e) {
    console.error('Error assigning plan:', e);
    return { error: 'Failed' };
  }
}
