import { PrismaClient } from "@prisma/client"

/**
 * Script one-off para zerar todos os estoques e dados fake do seed.
 * Execução: npx tsx prisma/reset-stock.ts
 */
const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Iniciando reset de estoque...\n")

  // 1. Deletar movimentações de estoque
  const movements = await prisma.stockMovement.deleteMany()
  console.log(`✅ StockMovement: ${movements.count} registros deletados`)

  // 2. Zerar quantidades de inventário
  const inventory = await prisma.inventory.updateMany({
    data: {
      currentQuantity: 0,
      averageMonthlyConsumption: 0,
    },
  })
  console.log(`✅ Inventory: ${inventory.count} registros zerados`)

  // 3. Deletar pedidos (OrderItem → OrderBox → Order, cascata cuida dos filhos)
  const orders = await prisma.order.deleteMany()
  console.log(`✅ Order (+ OrderBox + OrderItem via cascade): ${orders.count} pedidos deletados`)

  // 4. Deletar relatórios mensais
  const reports = await prisma.monthlyReport.deleteMany()
  console.log(`✅ MonthlyReport: ${reports.count} relatórios deletados`)

  // 5. Deletar pedidos especiais (SpecialRequestItem cascade via onDelete)
  const specialRequests = await prisma.specialRequest.deleteMany()
  console.log(`✅ SpecialRequest (+ items via cascade): ${specialRequests.count} registros deletados`)

  console.log("\n🎉 Reset concluído! Todos os estoques estão zerados.")
}

main()
  .catch((e) => {
    console.error("❌ Erro durante reset:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
