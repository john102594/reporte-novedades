'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth';

export async function getActionTasks() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const tasks = await prisma.actionTask.findMany({
    include: {
      variation: {
        include: {
          detail: {
            include: {
              item: {
                include: {
                  report: {
                    include: {
                      area: true
                    }
                  }
                }
              }
            }
          }
        }
      },
      responsible: true,
      activities: {
        include: {
          responsible: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return tasks;
}

export async function updateTaskAnalysis(taskId: string, rca: string, responsibleId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'COORDINATOR' && session.role !== 'MANAGER')) {
    return { error: 'Unauthorized: Only Coordinators or Managers can perform analysis' };
  }

  try {
    const task = await prisma.actionTask.update({
      where: { id: taskId },
      data: {
        rootCauseAnalysis: rca,
        responsibleId: responsibleId,
        status: 'REVISADA'
      }
    });
    revalidatePath('/action-plans');
    return { success: true, task };
  } catch (error) {
    console.error('Error updating task analysis:', error);
    return { error: 'Failed to update analysis' };
  }
}



export async function updateTaskCause(taskId: string, newCause: string) {
  const session = await getSession();
  if (!session || (session.role !== 'COORDINATOR' && session.role !== 'MANAGER')) {
    return { error: 'Unauthorized: Only Coordinators or Managers can update the cause' };
  }

  try {
    const task = await prisma.actionTask.update({
      where: { id: taskId },
      data: {
        cause: newCause,
      }
    });
    revalidatePath('/action-plans');
    return { success: true, task };
  } catch (error) {
    console.error('Error updating task cause:', error);
    return { error: 'Failed to update cause' };
  }
}

export async function approveActionPlan(taskId: string) {
  const session = await getSession();
  if (!session || session.role !== 'MANAGER') {
    return { error: 'Unauthorized: Only Managers can approve action plans' };
  }

  try {
    const task = await prisma.actionTask.update({
      where: { id: taskId },
      data: {
        status: 'EN_PLAN_DE_ACCION'
      }
    });
    revalidatePath('/action-plans');
    return { success: true, task };
  } catch (error) {
    console.error('Error approving action plan:', error);
    return { error: 'Failed to approve plan' };
  }
}

export async function createActivity(taskId: string, data: { description: string, deadline: string, responsibleId: string }) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const activity = await prisma.actionTaskActivity.create({
      data: {
        taskId,
        description: data.description,
        deadline: new Date(data.deadline),
        responsibleId: data.responsibleId,
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

export async function updateActivityStatus(activityId: string, status: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const activity = await prisma.actionTaskActivity.update({
      where: { id: activityId },
      data: { status }
    });
    revalidatePath('/action-plans');
    return { success: true, activity };
  } catch (error) {
    console.error('Error updating activity:', error);
    return { error: 'Failed to update activity' };
  }
}

export async function approveActivity(activityId: string) {
  const session = await getSession();
  if (!session || session.role !== 'MANAGER') {
    return { error: 'Unauthorized: Only Managers can finalize activities' };
  }

  try {
    const activity = await prisma.actionTaskActivity.update({
      where: { id: activityId },
      data: { status: 'FINALIZADA' }
    });

    // Check if all activities in the task are finalized
    const updatedActivity = await prisma.actionTaskActivity.findUnique({
      where: { id: activityId },
      include: { task: { include: { activities: true } } }
    });

    if (updatedActivity?.task.activities.every(a => a.status === 'FINALIZADA')) {
      await prisma.actionTask.update({
        where: { id: updatedActivity.taskId },
        data: { status: 'FINALIZADA' }
      });
    }

    revalidatePath('/action-plans');
    return { success: true, activity };
  } catch (error) {
    console.error('Error approving activity:', error);
    return { error: 'Failed to approve activity' };
  }
}
