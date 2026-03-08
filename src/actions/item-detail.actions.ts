"use server"

import { prisma } from "@/lib/prisma"

export async function getItemDetail(itemId: string, congregationId: string) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { defaultLocation: true },
    })

    if (!item) return null

    const inventory = await prisma.inventory.findMany({
      where: { itemId, congregationId },
      include: { location: true },
    })

    const totalQuantity = inventory.reduce((sum, inv) => sum + inv.currentQuantity, 0)
    const avgConsumption = Math.max(...inventory.map((inv) => inv.averageMonthlyConsumption), 0)

    return {
      item,
      inventory,
      totalQuantity,
      avgConsumption,
    }
  } catch (error) {
    console.error("Erro ao buscar detalhe do item:", error)
    return null
  }
}

export async function getItemMonthlyConsumption(itemId: string, congregationId: string, months: number = 6) {
  try {
    const result: Array<{ month: string; total: number }> = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const movements = await prisma.stockMovement.aggregate({
        _sum: { quantity: true },
        where: {
          itemId,
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
    console.error("Erro no historico de consumo por item:", error)
    return []
  }
}

export async function getItemMovementHistory(itemId: string, congregationId: string, limit: number = 20) {
  try {
    return await prisma.stockMovement.findMany({
      where: { itemId, congregationId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    })
  } catch (error) {
    console.error("Erro no historico de movimentacoes:", error)
    return []
  }
}
