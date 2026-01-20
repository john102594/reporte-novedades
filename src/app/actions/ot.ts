'use server';

import prisma from '@/lib/prisma';

export async function searchOT(otNumber: string) {
  if (!otNumber) return { error: 'OT number is required' };

  try {
    const details = await prisma.shiftReportDetail.findMany({
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
            program: true
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
    });

    return { success: true, data: details };
  } catch (error) {
    console.error('Error searching OT:', error);
    return { error: 'Failed to search OT' };
  }
}
