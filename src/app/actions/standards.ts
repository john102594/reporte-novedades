'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

  try {
    // Check if standard exists for this machine
    const existing = await prisma.standard.findFirst({
      where: { machineId: data.machineId }
    });

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
  try {
    await prisma.standard.delete({ where: { id } });
    revalidatePath('/masters/standards');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete standard' };
  }
}
