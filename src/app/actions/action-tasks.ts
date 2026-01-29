'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth';

export async function getActionTasks() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const tasks = await prisma.actionTask.findMany({
    include: {
      variationType: true,
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
      actionPlan: {
        include: {
          activities: {
            include: {
              responsible: true
            },
            orderBy: { startDate: 'asc' }
          }
        }
      } 
    },
    orderBy: { createdAt: 'desc' }
  });

  return tasks;
}

export async function getActionTaskById(taskId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const task = await prisma.actionTask.findUnique({
    where: { id: taskId },
    include: {
      variationType: true,
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
      actionPlan: {
        include: {
          activities: {
            include: {
              responsible: true
            },
            orderBy: { startDate: 'asc' }
          }
        }
      } 
    }
  });

  if (!task) {
    return { error: 'Task not found' };
  }

  return { task };
}

export async function updateTaskAnalysis(taskId: string, rca: string, cause?: string) {
  const session = await getSession();
  if (!session || (session.role?.toUpperCase() !== 'COORDINATOR' && session.role?.toUpperCase() !== 'MANAGER')) {
    return { error: 'Unauthorized: Only Coordinators or Managers can perform analysis' };
  }

  try {
    const data: any = {
      rootCauseAnalysis: rca,
      status: 'REVISADA'
    };

    if (cause) {
      data.cause = cause;
    }

    const task = await prisma.actionTask.update({
      where: { id: taskId },
      data
    });
    revalidatePath('/variation-analysis');
    return { success: true, task };
  } catch (error) {
    console.error('Error updating task analysis:', error);
    return { error: 'Failed to update analysis' };
  }
}

export async function revokeActionPlan(taskId: string) {
  const session = await getSession();
  if (!session || (session.role?.toUpperCase() !== 'MANAGER' && session.role?.toUpperCase() !== 'COORDINATOR' && session.role?.toUpperCase() !== 'ADMIN')) {
    return { error: 'Unauthorized: Only Managers, Coordinators, or Admins can revoke action plans' };
  }

  try {
    const task = await prisma.actionTask.update({
      where: { id: taskId },
      data: {
        status: 'POR_REVISAR',
        actionPlanId: null
      }
    });
    revalidatePath('/variation-analysis');
    return { success: true, task };
  } catch (error) {
    console.error('Error revoking action plan:', error);
    return { error: 'Failed to revoke plan' };
  }
}
