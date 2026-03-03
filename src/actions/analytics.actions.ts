"use server"

import { prisma } from "@/lib/prisma"

export async function calculateMonthlyConsumption(congregationId: string, itemId: string) {
  try {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const outMovements = await prisma.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        congregationId,
        itemId,
        type: { in: ["ISSUE_PUBLISHER", "ISSUE_GROUP"] },
        timestamp: { gte: threeMonthsAgo },
      },
    })

    // quantity e negativo nas saidas, entao pegamos o absoluto
    const totalOut = Math.abs(outMovements._sum.quantity || 0)
    const cleanAverage = parseFloat((totalOut / 3).toFixed(2))

    // Atualiza todos os registros de inventario desse item
    await prisma.inventory.updateMany({
      where: { itemId, congregationId },
      data: { averageMonthlyConsumption: cleanAverage },
    })

    return cleanAverage
  } catch (error) {
    console.error("Falha ao calcular média móvel:", error)
    return 0
  }
}

export async function getDashboardAlerts(congregationId: string) {
  try {
    const inventory = await prisma.inventory.findMany({
      where: { congregationId },
      include: { item: true, location: true },
    })

    // Consolida por item (soma de todos os locais)
    const byItem = new Map<string, {
      id: string
      item: typeof inventory[0]["item"]
      currentQuantity: number
      averageMonthlyConsumption: number
    }>()

    for (const inv of inventory) {
      const existing = byItem.get(inv.itemId)
      if (existing) {
        existing.currentQuantity += inv.currentQuantity
        existing.averageMonthlyConsumption = Math.max(
          existing.averageMonthlyConsumption,
          inv.averageMonthlyConsumption
        )
      } else {
        byItem.set(inv.itemId, {
          id: inv.id,
          item: inv.item,
          currentQuantity: inv.currentQuantity,
          averageMonthlyConsumption: inv.averageMonthlyConsumption,
        })
      }
    }

    const items = Array.from(byItem.values())
    const stockOut = items.filter((i) => i.currentQuantity === 0)
    const runningLow = items.filter(
      (i) => i.currentQuantity > 0 && i.currentQuantity <= i.averageMonthlyConsumption
    )

    return { stockOut, runningLow }
  } catch (error) {
    console.error("Falha ao gerar alertas:", error)
    return { stockOut: [], runningLow: [] }
  }
}

export async function getClosingReportByLanguage(congregationId: string, langCode: string) {
  try {
    return await prisma.inventory.findMany({
      where: {
        congregationId,
        item: { langCode },
      },
      orderBy: { item: { title: "asc" } },
      include: {
        item: { select: { title: true, format: true, pubCode: true } },
        location: { select: { name: true, labelCode: true } },
      },
    })
  } catch (error) {
    console.error("Erro no Fechamento:", error)
    return []
  }
}

export async function getPendingShipmentsCount(congregationId: string) {
  try {
    return await prisma.order.count({
      where: {
        creatorCongregationId: congregationId,
        status: { in: ["PENDING", "IN_TRANSIT"] },
      },
    })
  } catch (error) {
    console.error("Erro ao contar remessas pendentes:", error)
    return 0
  }
}

export async function getMonthlyConsumptionHistory(
  congregationId: string,
  months: number = 6
) {
  try {
    const result: Array<{ month: string; total: number }> = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const movements = await prisma.stockMovement.aggregate({
        _sum: { quantity: true },
        where: {
          congregationId,
          type: { in: ["ISSUE_PUBLISHER", "ISSUE_GROUP"] },
          timestamp: { gte: start, lte: end },
        },
      })

      const monthLabel = start.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      result.push({
        month: monthLabel,
        total: Math.abs(movements._sum.quantity || 0),
      })
    }

    return result
  } catch (error) {
    console.error("Erro no historico de consumo:", error)
    return []
  }
}
