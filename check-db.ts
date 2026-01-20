import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const atCount = await prisma.actionTask.count()
  const vCount = await prisma.shiftReportVariation.count()
  const rCount = await prisma.shiftReport.count()
  console.log(`ActionTask count: ${atCount}`)
  console.log(`ShiftReportVariation count: ${vCount}`)
  console.log(`ShiftReport count: ${rCount}`)
  
  if (vCount > 0 && atCount === 0) {
    console.log('Detected missing ActionTasks for existing Variations.')
    const variations = await prisma.shiftReportVariation.findMany({
      include: {
        detail: true,
        program: true
      }
    })
    console.log('Sample variations:', JSON.stringify(variations.slice(0, 2), null, 2))
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
