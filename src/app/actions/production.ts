'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { getSession } from './auth';

export interface ProductionContext {
  machines: { id: string; name: string; operators: { id: string; name: string | null }[] }[];
  causes: { id: string; name: string }[];
  operators: { id: string; name: string | null }[];
}

export async function getProductionContext(areaId: string): Promise<ProductionContext> {
  const [machines, causes, operators] = await Promise.all([
    prisma.machine.findMany({
      where: { areaId },
      select: { 
        id: true, 
        name: true,
        operators: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.failureProgram.findMany({
      where: { areaId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.user.findMany({
      where: { 
        role: 'OPERATOR',
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ]);
  
  console.log(`[getProductionContext] Fetching for Area: ${areaId}`);
  console.log(`[getProductionContext] Found: ${machines.length} machines, ${causes.length} causes, ${operators.length} operators`);
  
  if (machines.length === 0) {
      console.warn(`[getProductionContext] WARNING: No machines found for area ${areaId}`);
  }

  // Explicitly map to plain objects to avoid serialization issues (like toStringTag)
  return {
    machines: machines.map(m => ({
      id: m.id,
      name: m.name,
      operators: m.operators.map(op => ({
        id: op.id,
        name: op.name
      }))
    })),
    causes: causes.map(c => ({
      id: c.id,
      name: c.name
    })),
    operators: operators.map(op => ({
      id: op.id,
      name: op.name
    }))
  };
}

export async function getShiftReport(areaId: string, date: string, shift: string) {
  // We used to do new Date(date) but that creates timezone issues.
  // Since we want to match EXACTLY the date string YYYY-MM-DD or specific stored instant.
  // The 'date' in database is DateTime. Prisma stores as UTC.
  // "2024-01-20" -> new Date("2024-01-20") -> "2024-01-20T00:00:00.000Z" (UTC).
  // This logic is mostly correct IF both saving and reading use `new Date(string_yyyy_mm_dd)`.
  
  const targetDate = new Date(`${date}T00:00:00.000Z`);
  
  const report = await prisma.shiftReport.findFirst({
    where: {
      areaId,
      shift,
      date: targetDate
    },
    include: {
      gestor: {
        select: { name: true, id: true }
      },
      items: {
        include: {
          details: {
            include: {
              variations: true
            }
          }
        }
      }
    }
  });

  if (!report) return null;

  // Deep explicit mapping for the report object
  return {
    id: report.id,
    areaId: report.areaId,
    date: report.date.toISOString(),
    shift: report.shift,
    status: report.status,
    gestorId: report.gestorId,
    gestor: report.gestor ? {
      id: report.gestor.id,
      name: report.gestor.name
    } : null,
    items: report.items.map((item: any) => ({
      id: item.id,
      machineId: item.machineId,
      operatorId: item.operatorId,
      status: item.status,
      details: item.details.map((detail: any) => ({
        id: detail.id,
        ot: detail.ot,
        efficiency: detail.efficiency,
        mtProg: detail.mtProg,
        mtProd: detail.mtProd,
        kgProd: detail.kgProd,
        kgDesp: detail.kgDesp,
        variations: detail.variations.map((v: any) => ({
          id: v.id,
          stage: v.stage,
          programId: v.programId,
          analysis: v.analysis
        }))
      }))
    }))
  };
}

export async function saveShiftReport(data: any) {
  const session = await getSession();
  if (!session || !session.userId) {
      return { error: 'Unauthorized: No session found' };
  }

  // logic to upsert the report structure
  // This is complex because we need to handle nested updates/creates/deletes
  // For simplicity in this "Draft" mode, we might delete items/details and recreate, or strict upsert.
  // A safer approach for drafts is "Update if exists, Create if not" for the Report,
  // and for items/details, we can use transaction.
  
  const { areaId, date, shift, items, status } = data;
  // Ensure consistent UTC midnight date from the input string (YYYY-MM-DD)
  // We append T00:00:00.000Z to force UTC interpretation, so "2024-01-20" becomes distinct instant.
  const targetDate = new Date(`${date}T00:00:00.000Z`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or Create Report
      let report = await tx.shiftReport.findFirst({
        where: { areaId, date: targetDate, shift }
      });

      if (!report) {
        report = await tx.shiftReport.create({
          data: { 
            areaId, 
            date: targetDate, 
            shift, 
            status: status || 'OPEN',
            gestorId: session.userId // Use session user
          }
        });
      } else {
        // STRICT OWNERSHIP CHECK
        // Only the creator (gestorId) can edit the report.
        if (report.gestorId && report.gestorId !== session.userId) {
            throw new Error(`Unauthorized: This report belongs to another manager. You cannot edit it.`);
        }

        await tx.shiftReport.update({
          where: { id: report.id },
          data: { 
            status: status || report.status,
            gestorId: session.userId 
          }
        });
      }

      // 2. Handle Items
      // We will loop through the incoming items. 
      // If an item exists for this machine in this report, update it.
      // If not, create it.
      // NOTE: This logic assumes we send the FULL state of the report from the client.
      
      // For simplicity in this first iteration, we can wipe items and recreate. 
      // BUT deleting might lose data if not careful. 
      // Let's try recursive upsert support or manual diffing. 
      // Manual diffing is safer.

      for (const item of items) {
        // item: { machineId, operatorId, details: [] }
    
        //Upsert Item (Machine connection)
        let dbItem = await tx.shiftReportItem.findFirst({
          where: { reportId: report.id, machineId: item.machineId }
        });

        const isUnprogrammed = item.operatorId === 'UNPROGRAMMED';

        if (!dbItem) {
          dbItem = await tx.shiftReportItem.create({
            data: {
              reportId: report.id,
              machineId: item.machineId,
              operatorId: isUnprogrammed ? null : item.operatorId,
              status: isUnprogrammed ? 'UNPROGRAMMED' : 'ACTIVE'
            }
          });
        } else {
           await tx.shiftReportItem.update({
             where: { id: dbItem.id },
             data: { 
               operatorId: isUnprogrammed ? null : item.operatorId,
               status: isUnprogrammed ? 'UNPROGRAMMED' : 'ACTIVE'
             }
           });
        }

        // Handle Details (OTs)
        await tx.shiftReportDetail.deleteMany({
          where: { itemId: dbItem.id }
        });

        // If unprogrammed, we might not want to save details/variations?
        // But let's allow it just in case they want to report *why* it's unprogrammed or partial metrics.
        
        for (const detail of item.details) {
          // Check if detail is "empty" to avoid saving empty rows?
          // User might want to save partial data.
          // But if ot is empty AND stats are empty, maybe skip?
          // Let's save everything for now to handle "empty rows" persistence.
          
          const createdDetail = await tx.shiftReportDetail.create({
            data: {
              itemId: dbItem.id,
              ot: detail.ot,
              efficiency: detail.efficiency ? parseFloat(detail.efficiency.toString()) : null,
              mtProg: detail.mtProg ? parseFloat(detail.mtProg.toString()) : null,
              mtProd: detail.mtProd ? parseFloat(detail.mtProd.toString()) : null,
              kgProd: detail.kgProd ? parseFloat(detail.kgProd.toString()) : null,
              kgDesp: detail.kgDesp ? parseFloat(detail.kgDesp.toString()) : null,
            }
          });

          // Handle Variations
          if (detail.variations && detail.variations.length > 0) {
            // Filter out completely empty variations
            const validVariations = detail.variations.filter((v: any) => v.causeId || v.analysis || v.stage);
            
            if (validVariations.length > 0) {
              for (const v of validVariations) {
                const createdVariation = await tx.shiftReportVariation.create({
                  data: {
                    detailId: createdDetail.id,
                    programId: v.causeId || null,
                    stage: v.stage || null,
                    analysis: v.analysis || null
                  },
                  include: {
                    program: true
                  }
                });

                // AUTO-CREATE ActionTask
                await tx.actionTask.create({
                  data: {
                    variationId: createdVariation.id,
                    ot: detail.ot || "N/A",
                    cause: createdVariation.program?.name || "No especificada",
                    details: createdVariation.analysis || "Sin análisis previo",
                    status: "POR_REVISAR"
                  }
                });
              }
            }
          }
        }
      }
      return report;
    });

    revalidatePath('/production');
    return { success: true, report: result };
  } catch (error) {
    console.error('Error saving report:', error);
    return { error: 'Failed to save report' };
  }
}

export async function closeShift(reportId: string) {
    await prisma.shiftReport.update({
        where: { id: reportId },
        data: { status: 'CLOSED' }
    });
    revalidatePath('/production');
    return { success: true };
}
