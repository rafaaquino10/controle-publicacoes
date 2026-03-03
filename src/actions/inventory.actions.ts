"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { MovementType } from "@/lib/types"

export async function registerStockIn(data: {
  itemId: string
  congregationId: string
  userId: string
  locationId: string
  quantity: number
  type: MovementType
  notes?: string
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          userId: data.userId,
          locationId: data.locationId,
          type: data.type,
          quantity: data.quantity,
          notes: data.notes,
        },
      })

      const registry = await tx.inventory.upsert({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.locationId,
          },
        },
        update: {
          currentQuantity: { increment: data.quantity },
        },
        create: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          locationId: data.locationId,
          currentQuantity: data.quantity,
        },
      })

      revalidatePath("/estoque")
      return { success: true, inventory: registry }
    })
  } catch (error) {
    console.error("Erro no registro de entrada:", error)
    return { success: false, error: "Falha ao registrar entrada no estoque." }
  }
}

export async function registerStockOut(data: {
  itemId: string
  congregationId: string
  userId: string
  locationId: string
  quantity: number
  type: MovementType
  notes?: string
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.locationId,
          },
        },
      })

      if (!current || current.currentQuantity < data.quantity) {
        throw new Error("Saldo insuficiente no local selecionado.")
      }

      await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          userId: data.userId,
          locationId: data.locationId,
          type: data.type,
          quantity: -data.quantity,
          notes: data.notes,
        },
      })

      const registry = await tx.inventory.update({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.locationId,
          },
        },
        data: {
          currentQuantity: { decrement: data.quantity },
        },
      })

      revalidatePath("/estoque")
      return { success: true, inventory: registry }
    })
  } catch (error: any) {
    console.error("Erro na saída:", error.message)
    return { success: false, error: error.message }
  }
}

export async function transferStock(data: {
  itemId: string
  congregationId: string
  userId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  notes?: string
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const source = await tx.inventory.findUnique({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.fromLocationId,
          },
        },
      })

      if (!source || source.currentQuantity < data.quantity) {
        throw new Error("Saldo insuficiente no local de origem.")
      }

      // Saida da origem
      await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          userId: data.userId,
          locationId: data.fromLocationId,
          type: "TRANSFER_DISPLAY",
          quantity: -data.quantity,
          notes: data.notes || `Transferência para outro local`,
        },
      })

      await tx.inventory.update({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.fromLocationId,
          },
        },
        data: { currentQuantity: { decrement: data.quantity } },
      })

      // Entrada no destino
      await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          userId: data.userId,
          locationId: data.toLocationId,
          type: "TRANSFER_IN",
          quantity: data.quantity,
          notes: data.notes || `Transferência de outro local`,
        },
      })

      await tx.inventory.upsert({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.toLocationId,
          },
        },
        update: { currentQuantity: { increment: data.quantity } },
        create: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          locationId: data.toLocationId,
          currentQuantity: data.quantity,
        },
      })

      revalidatePath("/estoque")
      return { success: true }
    })
  } catch (error: any) {
    console.error("Erro na transferencia:", error.message)
    return { success: false, error: error.message }
  }
}

export async function adjustInventory(data: {
  itemId: string
  congregationId: string
  userId: string
  locationId: string
  newQuantity: number
  notes: string
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.locationId,
          },
        },
      })

      const oldQty = current?.currentQuantity ?? 0
      const diff = data.newQuantity - oldQty

      await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          userId: data.userId,
          locationId: data.locationId,
          type: "COUNT_CORRECTION",
          quantity: diff,
          notes: data.notes,
        },
      })

      const registry = await tx.inventory.upsert({
        where: {
          itemId_congregationId_locationId: {
            itemId: data.itemId,
            congregationId: data.congregationId,
            locationId: data.locationId,
          },
        },
        update: { currentQuantity: data.newQuantity },
        create: {
          itemId: data.itemId,
          congregationId: data.congregationId,
          locationId: data.locationId,
          currentQuantity: data.newQuantity,
        },
      })

      revalidatePath("/estoque")
      return { success: true, inventory: registry, diff }
    })
  } catch (error: any) {
    console.error("Erro no ajuste:", error.message)
    return { success: false, error: error.message }
  }
}

export async function getInventorySummary(congregationId: string) {
  try {
    return await prisma.inventory.findMany({
      where: { congregationId },
      include: {
        item: { include: { defaultLocation: true } },
        location: true,
      },
      orderBy: { item: { title: "asc" } },
    })
  } catch (error) {
    console.error("View de estoque falhou:", error)
    return []
  }
}

export async function getConsolidatedInventory(congregationId: string) {
  try {
    const inventory = await prisma.inventory.findMany({
      where: { congregationId },
      include: {
        item: true,
        location: true,
      },
      orderBy: { item: { title: "asc" } },
    })

    // Agrupa por item, somando quantidades de todos os locais
    const consolidated = new Map<string, {
      item: typeof inventory[0]["item"]
      totalQuantity: number
      avgConsumption: number
      locations: Array<{ location: typeof inventory[0]["location"]; quantity: number }>
    }>()

    for (const inv of inventory) {
      const existing = consolidated.get(inv.itemId)
      if (existing) {
        existing.totalQuantity += inv.currentQuantity
        existing.avgConsumption = Math.max(existing.avgConsumption, inv.averageMonthlyConsumption)
        existing.locations.push({ location: inv.location, quantity: inv.currentQuantity })
      } else {
        consolidated.set(inv.itemId, {
          item: inv.item,
          totalQuantity: inv.currentQuantity,
          avgConsumption: inv.averageMonthlyConsumption,
          locations: [{ location: inv.location, quantity: inv.currentQuantity }],
        })
      }
    }

    return Array.from(consolidated.values())
  } catch (error) {
    console.error("Erro no inventario consolidado:", error)
    return []
  }
}
