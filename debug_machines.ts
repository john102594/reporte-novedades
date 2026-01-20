
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  
  // 1. List all areas to find "Impresion"
  const areas = await prisma.area.findMany();
  console.log('Areas found:', areas);

  const impresion = areas.find(a => a.name.toLowerCase().includes('impresion'));
  
  if (!impresion) {
      console.error('Could not find area "Impresion"');
      return;
  }

  console.log(`Checking Area: ${impresion.name} (${impresion.id})`);

  // 2. Count machines in that area
  const machines = await prisma.machine.findMany({
      where: { areaId: impresion.id }
  });

  console.log(`Machines count: ${machines.length}`);
  machines.forEach(m => console.log(` - ${m.name} (${m.id})`));

  // 3. Check for specific shift report
  const date = new Date('2026-01-17T00:00:00.000Z');
  const report = await prisma.shiftReport.findFirst({
      where: {
          areaId: impresion.id,
          date: date,
          shift: 'T1'
      },
      include: { items: true }
  });
  
  console.log('Shift Report:', report ? 'FOUND' : 'NOT FOUND');
  if (report) {
      console.log(`Report ID: ${report.id}`);
      console.log(`Items count: ${report.items.length}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
