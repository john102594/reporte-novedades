'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { canPerformAction, validateAreaAccess } from '@/lib/abac';

interface StandardData {
  machineId: string;
  t1_setup_min: number;
  t5_run_speed_mpm: number;
  t2_calibration_min?: number;
  t3_toning_min?: number;
  t4_approval_min?: number;
}

export async function upsertStandard(data: StandardData) {
  if (!data.machineId) return { error: 'Machine is required' };

  // Get the machine to validate area access
  const machine = await prisma.machine.findUnique({
    where: { id: data.machineId },
    select: { areaId: true }
  });

  if (!machine) return { error: 'Machine not found' };

  // Check if standard exists for this machine
  const existing = await prisma.standard.findFirst({
    where: { machineId: data.machineId }
  });

  // ABAC: Check role permission (edit if exists, create if new)
  const action = existing ? 'edit:standard' : 'create:standard';
  const roleCheck = await canPerformAction(action);
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // ABAC: Validate area access via machine
  const areaCheck = await validateAreaAccess(machine.areaId);
  if (!areaCheck.allowed) return { error: areaCheck.reason };

  try {
    if (existing) {
      await prisma.standard.update({
        where: { id: existing.id },
        data: {
          t1_setup_min: data.t1_setup_min,
          t5_run_speed_mpm: data.t5_run_speed_mpm,
          t2_calibration_min: data.t2_calibration_min,
          t3_toning_min: data.t3_toning_min,
          t4_approval_min: data.t4_approval_min,
        }
      });
    } else {
      await prisma.standard.create({
        data: {
          machineId: data.machineId,
          t1_setup_min: data.t1_setup_min,
          t5_run_speed_mpm: data.t5_run_speed_mpm,
          t2_calibration_min: data.t2_calibration_min,
          t3_toning_min: data.t3_toning_min,
          t4_approval_min: data.t4_approval_min,
        }
      });
    }
    
    revalidatePath('/masters/standards');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to save standards.' };
  }
}

export async function deleteStandard(id: string) {
  // ABAC: Check role permission
  const roleCheck = await canPerformAction('delete:standard');
  if (!roleCheck.allowed) return { error: roleCheck.reason };

  // Find standard and validate area access via machine
  const standard = await prisma.standard.findUnique({
    where: { id },
    include: { machine: { select: { areaId: true } } }
  });

  if (!standard) return { error: 'Standard not found' };

  const areaCheck = await validateAreaAccess(standard.machine.areaId);
  if (!areaCheck.allowed) return { error: areaCheck.reason };

  try {
    await prisma.standard.delete({ where: { id } });
    revalidatePath('/masters/standards');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete standard' };
  }
}
