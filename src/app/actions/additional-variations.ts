'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth';
import { getAllowedAreaIds, validateAreaAccess, canPerformAction } from '@/lib/abac';

// Types for additional variations
export type VariationStatus = 'PENDIENTE' | 'EN_ANALISIS' | 'RESUELTO';

export interface CreateAdditionalVariationInput {
  ot: string;
  typeId: string; // Reference to VariationType
  quantity: number;
  description?: string;
  causeId?: string; // New: Selected FailureProgram
  operatorIds: string[];
  areaId: string; // Required for isolation
}

export interface AdditionalVariationFilters {
  ot?: string;
  typeId?: string;
  status?: VariationStatus;
  operatorId?: string;
  startDate?: Date;
  endDate?: Date;
  areaId?: string;
}

interface OperatorInfo {
  id: string; 
  name: string; // Removed null
  shifts: string[];
  areaId: string;
}

// Get operators who worked on a specific OT
export async function getOperatorsByOT(ot: string) {
  // Find all ShiftReportDetails with this OT
  const details = await prisma.shiftReportDetail.findMany({
    where: { ot },
    include: {
      item: {
        include: {
          operator: {
            select: { id: true, name: true, areaId: true }
          },
          report: {
            select: { date: true, shift: true }
          }
        }
      }
    }
  });

  // Extract unique operators
  const operatorMap = new Map<string, OperatorInfo>();
  
  for (const detail of details) {
    if (detail.item.operator) {
      const op = detail.item.operator;
      const shiftInfo = `${detail.item.report.date.toLocaleDateString()} - ${detail.item.report.shift}`;
      
      if (operatorMap.has(op.id)) {
        const existing = operatorMap.get(op.id)!;
        if (!existing.shifts.includes(shiftInfo)) {
          existing.shifts.push(shiftInfo);
        }
      } else {
        operatorMap.set(op.id, {
          id: op.id,
          name: op.name,
          shifts: [shiftInfo],
          areaId: op.areaId // Now available on Operator model
        });
      }
    }
  }

  return Array.from(operatorMap.values());
}

// Check if OT exists in any report
export async function checkOTExists(ot: string) {
  const count = await prisma.shiftReportDetail.count({
    where: { ot }
  });
  return count > 0;
}

// Get variation types (for dropdowns) - with area filtering
export async function getVariationTypes(options?: { 
  category?: 'OPERATIVA' | 'ADICIONAL';
  visibleToGestor?: boolean;
  areaId?: string; // Filter by specific area
}) {
  const allowedIds = await getAllowedAreaIds();
  const where: any = { isActive: true };
  
  if (options?.category) {
    where.category = options.category;
  }
  
  if (options?.visibleToGestor !== undefined) {
    where.visibleToGestor = options.visibleToGestor;
  }
  
  // ABAC: Filter by areas assigned to the type AND user's allowed areas
  // Types with NO areas assigned are considered global (visible to all)
  if (allowedIds !== null) {
    // Non-admin: filter by allowed areas OR types with no area restrictions
    where.OR = [
      { areas: { none: {} } }, // Global types (no areas assigned)
      { 
        areas: { 
          some: { 
            areaId: options?.areaId 
              ? { in: [options.areaId].filter(id => allowedIds.includes(id)) }
              : { in: allowedIds } 
          } 
        } 
      }
    ];
  } else if (options?.areaId) {
    // Admin with specific area filter
    where.OR = [
      { areas: { none: {} } }, // Global types
      { areas: { some: { areaId: options.areaId } } }
    ];
  }
  
  const types = await prisma.variationType.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    include: {
      areas: {
        include: { area: { select: { id: true, name: true } } }
      }
    }
  });
  
  return types.map(t => ({
    id: t.id,
    name: t.name,
    code: t.code,
    description: t.description,
    category: t.category,
    visibleToGestor: t.visibleToGestor,
    areas: t.areas.map(a => ({ id: a.area.id, name: a.area.name }))
  }));
}

// Get causes (FailurePrograms) for dropdown
export async function getCauses() {
  const causes = await prisma.failureProgram.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  });
  return causes;
}

// Create a new additional variation with ActionTask
export async function createAdditionalVariation(input: CreateAdditionalVariationInput) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { error: 'No autorizado' };
  }

  // Check user role - only COORDINATOR and MANAGER can create
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, name: true }
  });

  const allowedRoles = ['COORDINATOR', 'MANAGER', 'ADMIN'];
  if (!user || !allowedRoles.includes(user.role)) {
    return { error: 'Solo Coordinador o Manager pueden crear variaciones adicionales' };
  }

  // Check OT exists
  const otExists = await checkOTExists(input.ot);
  if (!otExists) {
    return { error: 'La OT no existe en ningún reporte' };
  }

  // Get variation type info
  const variationType = await prisma.variationType.findUnique({
    where: { id: input.typeId }
  });
  
  if (!variationType) {
    return { error: 'Tipo de variación no válido' };
  }
  
  // Get Cause Name if ID provided
  let causeName = variationType.name;
  if (input.causeId) {
    const cause = await prisma.failureProgram.findUnique({
      where: { id: input.causeId }
    });
    if (cause) causeName = cause.name;
  }

  try {
    // Use transaction to create variation and ActionTask together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the additional variation
      const variation = await tx.additionalVariation.create({
        data: {
          ot: input.ot,
          typeId: input.typeId,
          quantity: input.quantity,
          description: input.description,
          createdById: session.userId,
          areaId: input.areaId,
          responsibleOperators: {
            create: input.operatorIds.map(operatorId => ({
              operatorId
            }))
          }
        },
        include: {
          responsibleOperators: {
            include: {
              operator: { select: { id: true, name: true } }
            }
          },
          type: true,
          createdBy: { select: { id: true, name: true } }
        }
      });

      // 2. Create ActionTask for workflow integration
      const operatorNames = variation.responsibleOperators
        .map(ro => ro.operator.name || 'Desconocido')
        .join(', ');
        
      const actionTask = await tx.actionTask.create({
        data: {
          variationTypeId: variationType.id,
          ot: input.ot,
          cause: causeName, // Use explicit cause or fallback to type name
          details: `${variationType.name}: ${input.quantity} kg.\nOperadores: ${operatorNames}`,
          status: 'POR_REVISAR'
        }
      });

      // 3. Link ActionTask to AdditionalVariation
      await tx.additionalVariation.update({
        where: { id: variation.id },
        data: { actionTaskId: actionTask.id }
      });

      return { variation, actionTask };
    });

    revalidatePath('/additional-variations');
    revalidatePath('/variation-analysis');
    revalidatePath('/kanban');
    
    return { success: true, variation: result.variation, actionTaskId: result.actionTask.id };
  } catch (error) {
    console.error('Error creating additional variation:', error);
    return { error: 'Error al crear la variación' };
  }
}

// Get additional variations with filters
export async function getAdditionalVariations(filters?: AdditionalVariationFilters) {
  const where: any = {};

  if (filters?.ot) {
    where.ot = { contains: filters.ot };
  }

  if (filters?.typeId) {
    where.typeId = filters.typeId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.operatorId) {
    where.responsibleOperators = {
      some: { operatorId: filters.operatorId }
    };
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  // Filter by Area (Isolation) using ABAC
  const allowedIds = await getAllowedAreaIds();
  if (allowedIds !== null) {
    where.areaId = { in: allowedIds };
  }

  const variations = await prisma.additionalVariation.findMany({
    where,
    include: {
      responsibleOperators: {
        include: {
          operator: { select: { id: true, name: true } }
        }
      },
      type: true,
      createdBy: { select: { id: true, name: true } },
      actionTask: { select: { id: true, status: true, cause: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Map to plain objects
  return variations.map(v => ({
    id: v.id,
    ot: v.ot,
    type: {
      id: v.type.id,
      name: v.type.name,
      code: v.type.code,
      category: v.type.category
    },
    quantity: v.quantity,
    description: v.description,
    status: v.status as VariationStatus,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    createdBy: v.createdBy ? { id: v.createdBy.id, name: v.createdBy.name } : null,
    responsibleOperators: v.responsibleOperators.map(ro => ({
      id: ro.operator.id,
      name: ro.operator.name
    })),
    actionTask: v.actionTask ? { id: v.actionTask.id, status: v.actionTask.status, cause: v.actionTask.cause } : null
  }));
}

// Update additional variation status
export async function updateAdditionalVariation(
  id: string, 
  data: { status?: VariationStatus; description?: string }
) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { error: 'No autorizado' };
  }

  try {
    const variation = await prisma.additionalVariation.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.description !== undefined && { description: data.description })
      }
    });

    revalidatePath('/additional-variations');
    return { success: true, variation };
  } catch (error) {
    console.error('Error updating additional variation:', error);
    return { error: 'Error al actualizar la variación' };
  }
}

// Get OT summary with all waste types
export async function getOTSummary(ot: string) {
  // 1. Get gestor-reported data
  const gestorData = await prisma.shiftReportDetail.findMany({
    where: { ot },
    include: {
      item: {
        include: {
          operator: { select: { id: true, name: true } },
          report: { select: { date: true, shift: true, gestor: { select: { id: true, name: true } } } }
        }
      }
    }
  });

  // 2. Get additional variations
  const additionalVariations = await prisma.additionalVariation.findMany({
    where: { ot },
    include: {
      responsibleOperators: {
        include: {
          operator: { select: { id: true, name: true } }
        }
      },
      type: true,
      createdBy: { select: { id: true, name: true } }
    }
  });

  // Calculate totals
  const gestorWaste = gestorData.reduce((sum, d) => sum + (d.kgDesp || 0), 0);
  const gestorProduced = gestorData.reduce((sum, d) => sum + (d.kgProd || 0), 0);

  // Group by variation type
  const variationsByType = additionalVariations.reduce((acc, v) => {
    const code = v.type.code;
    if (!acc[code]) {
      acc[code] = { name: v.type.name, total: 0, items: [] };
    }
    acc[code].total += v.quantity;
    acc[code].items.push(v);
    return acc;
  }, {} as Record<string, { name: string; total: number; items: any[] }>);

  return {
    ot,
    gestorReports: gestorData.map(d => ({
      date: d.item.report.date.toISOString(),
      shift: d.item.report.shift,
      gestor: d.item.report.gestor,
      operator: d.item.operator,
      kgProd: d.kgProd,
      kgDesp: d.kgDesp,
      efficiency: d.efficiency
    })),
    additionalVariations: additionalVariations.map(v => ({
      id: v.id,
      type: { id: v.type.id, name: v.type.name, code: v.type.code },
      quantity: v.quantity,
      description: v.description,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy,
      operators: v.responsibleOperators.map(ro => ro.operator)
    })),
    variationsByType,
    totals: {
      gestorWaste,
      additionalWasteTotal: Object.values(variationsByType).reduce((sum, t) => sum + t.total, 0),
      kgProduced: gestorProduced
    }
  };
}

// --- VARIATION TYPE MASTER CRUD ---

export async function createVariationType(data: {
  name: string;
  code: string;
  description?: string;
  category: 'OPERATIVA' | 'ADICIONAL';
  visibleToGestor: boolean;
  sortOrder?: number;
  areaIds?: string[]; // Optional: areas where this type is visible
}) {
  const session = await getSession();
  if (!session) return { error: 'No autorizado' };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
    return { error: 'Solo Manager o Admin pueden crear tipos de variación' };
  }

  try {
    const type = await prisma.variationType.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        category: data.category,
        visibleToGestor: data.visibleToGestor,
        sortOrder: data.sortOrder || 0,
        // Create area relationships if provided
        ...(data.areaIds && data.areaIds.length > 0 && {
          areas: {
            create: data.areaIds.map(areaId => ({ areaId }))
          }
        })
      },
      include: {
        areas: { include: { area: { select: { id: true, name: true } } } }
      }
    });
    
    revalidatePath('/masters/variation-types');
    return { success: true, type };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: 'Ya existe un tipo con ese nombre o código' };
    }
    return { error: 'Error al crear tipo de variación' };
  }
}

export async function updateVariationType(
  id: string,
  data: Partial<{
    name: string;
    code: string;
    description: string;
    category: 'OPERATIVA' | 'ADICIONAL';
    visibleToGestor: boolean;
    isActive: boolean;
    sortOrder: number;
    areaIds: string[]; // Update area assignments
  }>
) {
  const session = await getSession();
  if (!session) return { error: 'No autorizado' };

  try {
    // Extract areaIds from data for separate handling
    const { areaIds, ...updateData } = data;
    
    // If areaIds is provided, update area relationships in a transaction
    if (areaIds !== undefined) {
      await prisma.$transaction([
        // Delete existing area relationships
        prisma.variationTypeArea.deleteMany({
          where: { variationTypeId: id }
        }),
        // Create new area relationships
        ...(areaIds.length > 0 ? [
          prisma.variationTypeArea.createMany({
            data: areaIds.map(areaId => ({ variationTypeId: id, areaId }))
          })
        ] : [])
      ]);
    }
    
    // Update other fields if any
    const type = await prisma.variationType.update({
      where: { id },
      data: updateData,
      include: {
        areas: { include: { area: { select: { id: true, name: true } } } }
      }
    });
    
    revalidatePath('/masters/variation-types');
    return { success: true, type };
  } catch (error) {
    return { error: 'Error al actualizar tipo de variación' };
  }
}

export async function deleteVariationType(id: string) {
  const session = await getSession();
  if (!session) return { error: 'No autorizado' };

  // Check if type is in use
  const inUse = await prisma.additionalVariation.count({
    where: { typeId: id }
  });

  if (inUse > 0) {
    return { error: `No se puede eliminar: ${inUse} variaciones usan este tipo. Desactívelo en su lugar.` };
  }

  try {
    await prisma.variationType.delete({ where: { id } });
    revalidatePath('/masters/variation-types');
    return { success: true };
  } catch (error) {
    return { error: 'Error al eliminar tipo de variación' };
  }
}
