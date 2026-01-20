
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const areas = await prisma.area.findMany();
  const impresion = areas.find(a => a.name.toLowerCase().includes('impresion'));
  
  if (!impresion) {
      console.log('NO_AREA');
      return;
  }
  
  const machines = await prisma.machine.findMany({ where: { areaId: impresion.id } });
  console.log(`AREA_ID:${impresion.id}`);
  console.log(`MACHINES:${machines.length}`);
}

main().finally(() => prisma.$disconnect());
