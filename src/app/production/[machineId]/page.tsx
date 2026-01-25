import React from 'react';
import prisma from '@/lib/prisma';
import { OTManager } from '@/components/production/ot-manager';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ machineId: string }>;
}

export default async function MachinePage({ params }: PageProps) {
  const { machineId } = await params;

  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: {
        area: true,
        orders: {
            where: { status: 'OPEN' },
            take: 1
        }
    }
  });

  if (!machine) return notFound();

  const activeOrder = machine.orders[0] || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div>
           <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{machine.area.name}</span>
           <h1 className="text-4xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">{machine.name}</h1>
        </div>
        <div className="text-right">
           <div className="text-sm text-muted-foreground">Status</div>
           <div className={`text-lg font-bold ${activeOrder ? 'text-emerald-400' : 'text-gray-500'}`}>
             {activeOrder ? '• Running' : '• Stopped'}
           </div>
        </div>
      </div>

      <OTManager machineId={machine.id} activeOrder={activeOrder} />
    </div>
  );
}
