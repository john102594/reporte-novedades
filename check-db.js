const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const atCount = await prisma.actionTask.count()
    const vCount = await prisma.shiftReportVariation.count()
    const rCount = await prisma.shiftReport.count()
    console.log(`ActionTask count: ${atCount}`)
    console.log(`ShiftReportVariation count: ${vCount}`)
    console.log(`ShiftReport count: ${rCount}`)
    
    if (vCount > 0) {
      const variations = await prisma.shiftReportVariation.findMany({
        take: 5,
        include: {
          detail: true,
          program: true,
          actionTask: true
        }
      })
      console.log('Sample variations (last 5):')
      variations.forEach(v => {
          console.log(`- ID: ${v.id}, OT: ${v.detail?.ot}, Program: ${v.program?.name}, HasTask: ${!!v.actionTask}`)
      })
    }
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
