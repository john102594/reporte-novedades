'use server';

import prisma from '@/lib/prisma';

export async function searchOT(otNumber: string) {
  if (!otNumber) return { error: 'OT number is required' };

  try {
    const [details, additionalVariations] = await Promise.all([
      prisma.shiftReportDetail.findMany({
        where: {
          ot: {
            contains: otNumber,
          },
        },
        include: {
          item: {
            include: {
              machine: true,
              operator: {
                select: { id: true, name: true }
              },
              report: {
                include: {
                  gestor: {
                    select: { id: true, name: true }
                  },
                  area: true
                }
              }
            }
          },
          variations: {
            include: {
              program: true,
              variationType: true
            }
          }
        },
        orderBy: {
          item: {
            report: {
              date: 'desc'
            }
          }
        }
      }),
      prisma.additionalVariation.findMany({
        where: {
          ot: {
            contains: otNumber
          }
        },
        include: {
          type: true,
          createdBy: {
             select: { id: true, name: true }
          },
          responsibleOperators: {
            include: {
              operator: {
                 select: { id: true, name: true }
              }
            }
          },
          actionTask: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    return { success: true, data: { details, additionalVariations } };
  } catch (error) {
    console.error('Error searching OT:', error);
    return { error: 'Failed to search OT' };
  }
}
