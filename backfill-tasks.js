const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Starting backfill for ActionTasks...')
    
    const variations = await prisma.shiftReportVariation.findMany({
      where: {
        actionTask: null
      },
      include: {
        detail: true,
        program: true
      }
    })

    console.log(`Found ${variations.length} variations without ActionTask.`)

    for (const v of variations) {
      await prisma.actionTask.create({
        data: {
          variationId: v.id,
          ot: v.detail?.ot || "N/A",
          cause: v.program?.name || "No especificada",
          details: v.analysis || "Sin análisis previo",
          status: "POR_REVISAR"
        }
      })
      console.log(`Created ActionTask for Variation ID: ${v.id}`)
    }

    console.log('Backfill completed successfully.')
  } catch (err) {
    console.error('Error during backfill:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
