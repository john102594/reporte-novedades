
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  try {
    // Delete in order to avoid foreign key constraints
    await prisma.planActivity.deleteMany();
    await prisma.actionTask.deleteMany();
    await prisma.actionPlan.deleteMany();
    await prisma.additionalVariationOperator.deleteMany();
    await prisma.additionalVariation.deleteMany();
    await prisma.variationRecord.deleteMany(); 
    await prisma.shiftReportVariation.deleteMany();
    await prisma.shiftReportDetail.deleteMany();
    await prisma.shiftReportItem.deleteMany();
    await prisma.shiftReport.deleteMany();
    await prisma.productionOrder.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.failureProgram.deleteMany();
    await prisma.machine.deleteMany();
    await prisma.operator.deleteMany();
    await prisma.area.deleteMany();
    await prisma.user.deleteMany();
    console.log('🧹 Database cleaned');
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }

  // 1. Create Area
  const area = await prisma.area.upsert({
    where: { name: 'Impresión' },
    update: {},
    create: { name: 'Impresión' },
  });
  console.log('🏭 Area created:', area.name);

  // 2. Create Machines
  const machineNames = ['Impresora 1', 'Impresora 3', 'Impresora 5', 'Impresora 7', 'Impresora 9', 'Impresora 10'];
  const machines = [];
  
  for (const name of machineNames) {
    // Upsert to avoid duplicates if re-running without clear
    const machine = await prisma.machine.create({ // Using create usually throws if unique constraint, but name isn't unique in schema, assumed new run
       data: {
        name,
        areaId: area.id,
      }
    });
    machines.push(machine);

    // 2.1 Create Standard for Machine
    await prisma.standard.create({
        data: {
            machineId: machine.id,
            t1_setup_min: 45, // 45 min setup
            t5_run_speed_mpm: 120, // 120 m/min
            t2_calibration_min: 15,
            t3_toning_min: 20,
            t4_approval_min: 10
        }
    });
  }
  console.log(`🖨️  Created ${machines.length} machines with Standards`);

  // 3. Create Causes
  const causeNames = [
    'Falla Eléctrica', 'Falla Mecánica', 'Falta de Material', 
    'Error de Operación', 'Problema de Calidad', 'Mantenimiento Preventivo',
    'Ajuste de Máquina', 'Limpieza', 'Cambio de Referencia', 'Otros'
  ];

  for (const name of causeNames) {
    await prisma.failureProgram.create({
      data: {
        name,
        areaId: area.id
      }
    });
  }
  console.log(`⚠️  Created ${causeNames.length} causes`);

  // 4. Create Operators on Operator Table (Not User table)
  // We need 4 operators per machine.
  // We have 6 machines: Impresora 1..10
  // Total operators needed: 6 * 4 = 24
  
  const operatorIds = [];
  let opCount = 1;
  const totalOperators = machines.length * 4;

  for (let i = 1; i <= totalOperators; i++) {
    const operator = await prisma.operator.create({
      data: {
        name: `Operario ${i}`,
        status: 'ACTIVE',
        areaId: area.id // All in Impresion
      }
    });
    operatorIds.push(operator.id);
  }
  console.log(`👷 Created ${totalOperators} Operators in Operator table`);

  // 5. Assign 4 Operators per Machine
  let opIndex = 0;
  for (const machine of machines) {
    const assignedOps = [];
    for(let k=0; k<4; k++) {
        // Ensure we don't go out of bounds if something is off, 
        // using modulo just in case but with exact count it should be fine
        if (opIndex < operatorIds.length) {
            assignedOps.push({ id: operatorIds[opIndex] });
            opIndex++;
        }
    }
    
    await prisma.machine.update({
        where: { id: machine.id },
        data: {
            operators: {
                connect: assignedOps
            }
        }
    });
  }
  console.log(`🔗 Assigned 4 distinct operators to each machine`);

  // 6. Create Management Users
  await prisma.user.create({
    data: { name: 'Admin User', username: 'admin', role: 'ADMIN', password: 'admin' }
  });
  await prisma.user.create({
    data: { name: 'Manager User', username: 'JRODRI', role: 'MANAGER', password: '123' }
  });
  await prisma.user.create({
    data: { name: 'Gestor User', username: 'GESTOR1', role: 'GESTOR', password: '123' }
  });
  await prisma.user.create({
    data: { name: 'Coordinador User', username: 'COORD1', role: 'COORDINATOR', password: '123' }
  });

  console.log('👑 Created Admin/Management users (JRODRI, GESTOR1, COORD1)');
  // 7. Create Sample Shift Report (23-01-2026, T1, GESTOR1)
  const gestor = await prisma.user.findFirst({ where: { username: 'GESTOR1' } });
  
  if (gestor) {
    // Determine report date - use local midnight to avoid timezone shifts if possible, or UTC
    const reportDate = new Date('2026-01-23T00:00:00.000Z'); 
    
    // Create Report
    const report = await prisma.shiftReport.create({
      data: {
        date: reportDate,
        shift: 'T1',
        areaId: area.id,
        status: 'CLOSED', // Report is finalized
        gestorId: gestor.id
      }
    });

    console.log(`📝 Created Shift Report for ${reportDate.toISOString()} - T1`);

    // Create Items for proper machines (1, 3, 5)
    // We already have 'machines' array from step 2
    const machinesToReport = machines.slice(0, 3); // First 3 machines

    for (const machine of machinesToReport) {
      // Find an operator for this machine
      const machineWithOps = await prisma.machine.findUnique({
        where: { id: machine.id },
        include: { operators: true }
      });
      const operator = machineWithOps?.operators[0];

      // Create Item
      const item = await prisma.shiftReportItem.create({
        data: {
          reportId: report.id,
          machineId: machine.id,
          operatorId: operator?.id,
          status: 'ACTIVE'
        }
      });

      // Create Detail (Metrics)
      // Efficiency ~85-95, Waste ~2-5%
      const efficiency = 85 + Math.random() * 10;
      const kgDesp = 10 + Math.random() * 5;
      
      const detail = await prisma.shiftReportDetail.create({
        data: {
          itemId: item.id,
          ot: `OT-${Math.floor(1000 + Math.random() * 9000)}`,
          efficiency: parseFloat(efficiency.toFixed(1)),
          mtProg: 5000,
          mtProd: 4800,
          kgProd: 100,
          kgDesp: parseFloat(kgDesp.toFixed(1))
        }
      });

      // Add a Variation if efficiency is lowish or random
      if (efficiency < 90) {
        // Find a cause
        const cause = await prisma.failureProgram.findFirst({
            where: { name: 'Falla Mecánica' }
        });
        
        await prisma.shiftReportVariation.create({
            data: {
                detailId: detail.id,
                stage: 'T5', // Production stage
                programId: cause?.id,
                analysis: 'Rodillo con vibración. Se ajustó presión pero persiste levemente.'
            }
        });
      }
    }
    console.log('📊 Added Details and Variations to Report');
  }

  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
