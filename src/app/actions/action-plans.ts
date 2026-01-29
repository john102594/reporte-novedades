'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth';

// --- Action Plans ---

async function syncPlanDates(tx: any, planId: string, activities?: any[]) {
    const allActivities = activities || await tx.planActivity.findMany({
        where: { planId },
        select: { startDate: true, deadline: true }
    });

    if (allActivities.length > 0) {
        const minDate = new Date(Math.min(...allActivities.map((a: any) => new Date(a.startDate).getTime())));
        const maxDate = new Date(Math.max(...allActivities.map((a: any) => new Date(a.deadline).getTime())));

        await tx.actionPlan.update({
            where: { id: planId },
            data: {
                startDate: minDate,
                endDate: maxDate
            }
        });
    }
}

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

export async function createActionPlan(data: { 
  name: string, 
  startDate?: string, 
  priority?: string,
  endDate?: string,
  activities?: {
    description: string;
    responsibleId: string;
    startDate: string;
    deadline: string;
  }[]
}) {
  const session = await getSession();
  if (!session || (session.role !== 'MANAGER' && session.role !== 'COORDINATOR' && session.role !== 'ADMIN')) {
    return { error: 'Unauthorized' };
  }

  // Workflow Logic: Coordinator -> REVISION, Manager/Admin -> ABIERTO
  const initialStatus = session.role === 'COORDINATOR' ? 'REVISION' : 'ABIERTO';

  try {
    const plan = await prisma.actionPlan.create({
      data: {
        name: data.name,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        priority: data.priority || 'MEDIA',
        status: initialStatus,
        activities: data.activities && data.activities.length > 0 ? {
          create: data.activities.map(act => ({
            description: act.description,
            responsibleId: act.responsibleId,
            startDate: new Date(act.startDate),
            deadline: new Date(act.deadline),
            status: 'PENDIENTE'
          }))
        } : undefined
      }
    });
    // Recalculate if activities were provided
    if (data.activities && data.activities.length > 0) {
      await syncPlanDates(prisma, plan.id, data.activities);
    }

    revalidatePath('/action-plans');
    return { success: true, plan };
  } catch (error) {
    console.error('Error creating plan:', error);
    return { error: 'Failed to create plan' };
  }
}

export async function updateActionPlanStatus(planId: string, status: string) {
    const session = await getSession();
    if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
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
  if (!session || (session.role !== 'MANAGER' && session.role !== 'COORDINATOR' && session.role !== 'ADMIN')) {
    return { error: 'Unauthorized' };
  }

  // Check Plan Status first
  const plan = await prisma.actionPlan.findUnique({
    where: { id: planId },
    select: { status: true }
  });

  if (!plan) return { error: 'Plan not found' };

  // Rule: Once approved (ABIERTO), structure cannot be modified (no new activities)
  // EXCEPT for Managers as per updated requirements.
  if (plan.status === 'CERRADO') {
    return { error: 'No se pueden agregar actividades a un plan cerrado.' };
  }

  if (plan.status === 'ABIERTO' && session.role !== 'MANAGER' && session.role !== 'ADMIN') {
    return { error: 'No se pueden agregar actividades a un plan aprobado.' };
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

    // Recalculate Plan Dates
    await syncPlanDates(prisma, planId);

    revalidatePath('/action-plans');
    return { success: true, activity };
  } catch (error) {
    console.error('Error creating activity:', error);
    return { error: 'Failed to create activity' };
  }
}

export async function updatePlanActivity(activityId: string, data: { 
  status?: string, 
  startDate?: string, 
  deadline?: string, 
  responsibleId?: string,
  description?: string 
}) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
  
    try {
      // Get activity to check plan status
      const existingActivity = await prisma.planActivity.findUnique({
        where: { id: activityId },
        include: { plan: { select: { status: true } } }
      });

      if (!existingActivity) return { error: 'Activity not found' };

      // Cannot modify activities of closed plans
      if (existingActivity.plan.status === 'CERRADO') {
        return { error: 'No se pueden modificar actividades de un plan cerrado.' };
      }

      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      
      // Only Managers/Admin can update dates, responsible, and description
      if (data.startDate && (session.role === 'MANAGER' || session.role === 'ADMIN')) {
          updateData.startDate = new Date(data.startDate);
      }
      if (data.deadline && (session.role === 'MANAGER' || session.role === 'ADMIN')) {
          updateData.deadline = new Date(data.deadline);
      }
      if (data.responsibleId && (session.role === 'MANAGER' || session.role === 'ADMIN')) {
          updateData.responsibleId = data.responsibleId;
      }
      if (data.description !== undefined && (session.role === 'MANAGER' || session.role === 'ADMIN' || session.role === 'COORDINATOR')) {
          updateData.description = data.description;
      }

      const activity = await prisma.planActivity.update({
        where: { id: activityId },
        data: updateData
      });

      // Recalculate if dates changed
      if (data.startDate || data.deadline) {
          await syncPlanDates(prisma, activity.planId);
      }
      
      revalidatePath('/action-plans');
      return { success: true, activity };
    } catch (error) {
      console.error('Error updating activity:', error);
      return { error: 'Failed to update activity' };
    }
}

export async function deletePlanActivity(activityId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN' && session.role !== 'COORDINATOR')) {
    return { error: 'Unauthorized' };
  }

  try {
    // Get activity to check plan status and get planId
    const activity = await prisma.planActivity.findUnique({
      where: { id: activityId },
      include: { plan: { select: { status: true } } }
    });

    if (!activity) return { error: 'Activity not found' };

    // Cannot delete activities from closed plans
    if (activity.plan.status === 'CERRADO') {
      return { error: 'No se pueden eliminar actividades de un plan cerrado.' };
    }

    // Only Managers can delete from approved plans
    if (activity.plan.status === 'ABIERTO' && session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return { error: 'Solo los managers pueden eliminar actividades de un plan aprobado.' };
    }

    const planId = activity.planId;

    // Delete the activity
    await prisma.planActivity.delete({
      where: { id: activityId }
    });

    // Recalculate plan dates
    await syncPlanDates(prisma, planId);

    revalidatePath('/action-plans');
    return { success: true };
  } catch (error) {
    console.error('Error deleting activity:', error);
    return { error: 'Failed to delete activity' };
  }
}

export async function updateActionPlan(planId: string, data: {
  name?: string,
  startDate?: string,
  priority?: string,
  status?: string,
  activities?: {
    description: string;
    responsibleId: string;
    startDate: string;
    deadline: string;
  }[]
}) {
  const session = await getSession();
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN' && session.role !== 'COORDINATOR')) {
    return { error: 'Unauthorized' };
  }

  try {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.priority) updateData.priority = data.priority;
    if (data.status) updateData.status = data.status;

    // Use a transaction to ensure atomicity
    const plan = await prisma.$transaction(async (tx) => {
      // 1. Update Plan Basic Info
      const updatedPlan = await tx.actionPlan.update({
        where: { id: planId },
        data: updateData
      });

      // 2. Update Activities if provided (Delete and Re-create for simplicity in sync with UI state)
      if (data.activities) {
        // Delete existing activities
        await tx.planActivity.deleteMany({
          where: { planId }
        });

        // Create new ones
        if (data.activities.length > 0) {
          await tx.planActivity.createMany({
            data: data.activities.map(act => ({
              planId,
              description: act.description,
              responsibleId: act.responsibleId,
              startDate: new Date(act.startDate),
              deadline: new Date(act.deadline),
              status: 'PENDIENTE'
            }))
          });
        }
      }

      // 3. If plan is being approved (ABIERTO), update all associated ActionTasks to EN_PLAN_DE_ACCION
      if (data.status === 'ABIERTO') {
        await tx.actionTask.updateMany({
          where: { actionPlanId: planId },
          data: { status: 'EN_PLAN_DE_ACCION' }
        });
      }

      // 4. Recalculate Dates if activities were synced
      if (data.activities && data.activities.length > 0) {
        await syncPlanDates(tx, planId, data.activities);
      }

      return updatedPlan;
    });

    revalidatePath('/action-plans');
    revalidatePath('/variation-analysis');
    return { success: true, plan };
  } catch (error) {
    console.error('Error updating action plan:', error);
    return { error: 'Failed to update plan' };
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
