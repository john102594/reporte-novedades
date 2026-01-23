'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function submitDeviationReport(formData: FormData) {
  const otId = formData.get('otId') as string;
  const machineId = formData.get('machineId') as string;
  const type = formData.get('type') as string;
  const event = formData.get('event') as string;
  const rootCause = formData.get('rootCause') as string;
  const programId = formData.get('programId') as string;
  const failureType = formData.get('failureType') as string;
  const deviationValue = formData.get('deviationValue') as string;

  if (!otId || !event || !rootCause || !programId || !failureType) {
    return { error: 'All fields are required' };
  }

  try {
    // Get Program Name
    const program = await prisma.failureProgram.findUnique({ where: { id: programId } });

    await prisma.variationRecord.create({
      data: {
        otId,
        type: type || 'UNKNOWN',
        value: parseFloat(deviationValue || '0'), 
        threshold: 20, // fixed for now
        event,
        rootCause,
        failedProgram: program?.name || 'Unknown',
        failureType,
      },
    });

  } catch (error) {
    return { error: 'Failed to submit report' };
  }
  
  redirect(`/production/${machineId}`);
}
