'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth';
import { getAllowedAreaIds } from '@/lib/abac';

interface ActivityFilters {
  status?: string;
  responsibleId?: string;
}

export async function getAllActivities(filters?: ActivityFilters) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const where: any = {};

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters?.responsibleId && filters.responsibleId !== 'ALL') {
      where.responsibleId = filters.responsibleId;
    }

    // ABAC: Filter activities by plan's linked tasks that belong to user's allowed areas
    const allowedAreaIds = await getAllowedAreaIds();
    if (allowedAreaIds !== null) {
      where.plan = {
        tasks: {
          some: {
            OR: [
              {
                variation: {
                  detail: {
                    item: {
                      report: {
                        areaId: { in: allowedAreaIds }
                      }
                    }
                  }
                }
              },
              {
                additionalVariation: {
                  areaId: { in: allowedAreaIds }
                }
              }
            ]
          }
        }
      };
    }

    const activities = await prisma.planActivity.findMany({
      where,
      include: {
        responsible: {
          select: { id: true, name: true, role: true }
        },
        plan: {
          select: { 
            id: true, 
            name: true, 
            status: true, 
            priority: true,
            tasks: {
              select: {
                variation: {
                  select: {
                    detail: {
                      select: {
                        item: {
                          select: {
                            report: {
                              select: {
                                areaId: true
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                additionalVariation: {
                  select: {
                    areaId: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDIENTE first, then EN_PROCESO, then FINALIZADA
        { deadline: 'asc' }
      ]
    });

    return { success: true, activities };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return { error: 'Failed to fetch activities' };
  }
}

export async function updateActivityStatus(activityId: string, status: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const activity = await prisma.planActivity.update({
      where: { id: activityId },
      data: { status }
    });

    revalidatePath('/activities');
    revalidatePath('/action-plans');
    return { success: true, activity };
  } catch (error) {
    console.error('Error updating activity status:', error);
    return { error: 'Failed to update activity status' };
  }
}

export async function updateActivity(activityId: string, data: { responsibleId?: string; deadline?: string; description?: string }) {
  const session = await getSession();
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    return { error: 'Unauthorized - Only managers can edit activities' };
  }

  try {
    const updateData: any = {};
    if (data.responsibleId) updateData.responsibleId = data.responsibleId;
    if (data.deadline) updateData.deadline = new Date(data.deadline);
    if (data.description) updateData.description = data.description;

    const activity = await prisma.planActivity.update({
      where: { id: activityId },
      data: updateData
    });

    revalidatePath('/activities');
    revalidatePath('/action-plans');
    return { success: true, activity };
  } catch (error) {
    console.error('Error updating activity:', error);
    return { error: 'Failed to update activity' };
  }
}
