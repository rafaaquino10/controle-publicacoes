"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createHubOrder(data: {
  shipmentNumber: string
  type: "COMMON" | "SPECIAL"
  creatorCongregationId: string
  items: Array<{
    itemId: string
    quantity: number
    boxNumber: string
    destinationCongregationId?: string
  }>
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          shipmentNumber: data.shipmentNumber,
          type: data.type,
          creatorCongregationId: data.creatorCongregationId,
          status: "PENDING",
        },
      })

      const boxesMap = new Map<string, typeof data.items>()
      for (const item of data.items) {
        if (!boxesMap.has(item.boxNumber)) {
          boxesMap.set(item.boxNumber, [])
        }
        boxesMap.get(item.boxNumber)!.push(item)
      }

      for (const [boxNum, boxItems] of boxesMap.entries()) {
        const box = await tx.orderBox.create({
          data: {
            orderId: order.id,
            boxNumber: boxNum,
            isReceived: false,
          },
        })

        await tx.orderItem.createMany({
          data: boxItems.map((bItem) => ({
            orderBoxId: box.id,
            itemId: bItem.itemId,
            quantity: bItem.quantity,
            destinationCongregationId: bItem.destinationCongregationId,
          })),
        })
      }

      revalidatePath("/remessas")
      return { success: true, order }
    })
  } catch (error) {
    console.error("Falha ao registrar Pedido:", error)
    return { success: false, error: "Conflito ao processar a estrutura do Pedido." }
  }
}

export async function markBoxAsReceived(
  boxId: string,
  currentUserId: string,
  targetLocationId?: string
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const box = await tx.orderBox.update({
        where: { id: boxId },
        data: { isReceived: true },
        include: { items: { include: { item: true } }, order: true },
      })

      for (const orderItem of box.items) {
        const targetCongregation = orderItem.destinationCongregationId || box.order.creatorCongregationId
        const locationId = targetLocationId || orderItem.item.defaultLocationId

        await tx.stockMovement.create({
          data: {
            itemId: orderItem.itemId,
            congregationId: targetCongregation,
            userId: currentUserId,
            locationId,
            type: "RECEIVE_SHIPMENT",
            quantity: orderItem.quantity,
            notes: `Remessa ${box.order.shipmentNumber} - ${box.boxNumber}`,
          },
        })

        if (locationId) {
          await tx.inventory.upsert({
            where: {
              itemId_congregationId_locationId: {
                itemId: orderItem.itemId,
                congregationId: targetCongregation,
                locationId,
              },
            },
            update: { currentQuantity: { increment: orderItem.quantity } },
            create: {
              itemId: orderItem.itemId,
              congregationId: targetCongregation,
              locationId,
              currentQuantity: orderItem.quantity,
            },
          })
        }
      }

      const allBoxes = await tx.orderBox.findMany({ where: { orderId: box.orderId } })
      const allReceived = allBoxes.every((b) => b.isReceived)

      if (allReceived) {
        await tx.order.update({
          where: { id: box.orderId },
          data: { status: "RECEIVED" },
        })
      }

      revalidatePath("/remessas")
      revalidatePath("/estoque")
      return { success: true, allBoxesReceived: allReceived }
    })
  } catch (error) {
    console.error("Erro ao receber caixa:", error)
    return { success: false, error: "Erro durante o recebimento." }
  }
}

export async function getOrders(congregationId: string) {
  try {
    return await prisma.order.findMany({
      where: { creatorCongregationId: congregationId },
      include: {
        boxes: {
          include: { items: { include: { item: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("Erro ao buscar remessas:", error)
    return []
  }
}

export async function getOrderByShipmentNumber(shipmentNumber: string) {
  try {
    return await prisma.order.findUnique({
      where: { shipmentNumber },
      include: {
        boxes: {
          include: { items: { include: { item: true } } },
        },
      },
    })
  } catch (error) {
    console.error("Erro ao buscar remessa:", error)
    return null
  }
}

// ─── Busca inteligente para fluxo de entrada ────────────────────────
export async function findPendingShipment(barcode: string) {
  try {
    // Limpar barcode: remover sufixos como -6, espaços, etc.
    const cleaned = barcode.replace(/[-\s].*/g, "").trim()

    // Buscar em Orders pendentes ou em trânsito
    const order = await prisma.order.findFirst({
      where: {
        shipmentNumber: cleaned,
        status: { in: ["PENDING", "IN_TRANSIT"] },
      },
      include: {
        boxes: {
          include: { items: { include: { item: true } } },
          orderBy: { boxNumber: "asc" },
        },
      },
    })

    if (!order) return { found: false as const }

    // Tentar identificar caixa específica pelo sufixo do barcode (ex: -6 = caixa 6)
    const suffixMatch = barcode.match(/-(\d+)$/)
    const boxHint = suffixMatch ? parseInt(suffixMatch[1]) : null

    return {
      found: true as const,
      order: {
        id: order.id,
        shipmentNumber: order.shipmentNumber,
        type: order.type,
        status: order.status,
        boxes: order.boxes.map((box) => ({
          id: box.id,
          boxNumber: box.boxNumber,
          isReceived: box.isReceived,
          items: box.items.map((oi) => ({
            id: oi.id,
            quantity: oi.quantity,
            item: {
              id: oi.item.id,
              pubCode: oi.item.pubCode,
              langCode: oi.item.langCode,
              title: oi.item.title,
              imageUrl: oi.item.imageUrl,
            },
          })),
        })),
      },
      boxHint,
    }
  } catch (error) {
    console.error("Erro ao buscar remessa pendente:", error)
    return { found: false as const, error: "Erro na busca." }
  }
}

// ─── Entrada rápida (sem remessa pré-cadastrada) ─────────────────────
export async function quickStockEntry(data: {
  pubCode: string
  langCode: string
  quantity: number
  congregationId: string
  userId: string
}) {
  try {
    // Buscar item por pubCode + langCode (formato NORMAL como padrão)
    const item = await prisma.item.findFirst({
      where: {
        pubCode: { equals: data.pubCode, mode: "insensitive" },
        langCode: data.langCode,
      },
    })

    if (!item) {
      return { success: false, error: `Publicação "${data.pubCode}-${data.langCode}" não encontrada no catálogo.` }
    }

    return await prisma.$transaction(async (tx) => {
      // Criar movimentação de entrada
      await tx.stockMovement.create({
        data: {
          itemId: item.id,
          congregationId: data.congregationId,
          userId: data.userId,
          locationId: item.defaultLocationId,
          type: "RECEIVE_SHIPMENT",
          quantity: data.quantity,
          notes: `Entrada rápida — ${data.pubCode}-${data.langCode} ×${data.quantity}`,
        },
      })

      // Upsert inventário
      if (item.defaultLocationId) {
        await tx.inventory.upsert({
          where: {
            itemId_congregationId_locationId: {
              itemId: item.id,
              congregationId: data.congregationId,
              locationId: item.defaultLocationId,
            },
          },
          update: { currentQuantity: { increment: data.quantity } },
          create: {
            itemId: item.id,
            congregationId: data.congregationId,
            locationId: item.defaultLocationId,
            currentQuantity: data.quantity,
          },
        })
      }

      revalidatePath("/estoque")
      revalidatePath("/entrada")
      return {
        success: true,
        item: {
          id: item.id,
          pubCode: item.pubCode,
          langCode: item.langCode,
          title: item.title,
          imageUrl: item.imageUrl,
        },
        quantity: data.quantity,
      }
    })
  } catch (error) {
    console.error("Erro na entrada rápida:", error)
    return { success: false, error: "Erro ao registrar entrada." }
  }
}

export async function updateOrderStatus(orderId: string, status: "IN_TRANSIT" | "RECEIVED") {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    })
    revalidatePath("/remessas")
    return { success: true }
  } catch (error) {
    console.error("Erro ao atualizar status:", error)
    return { success: false, error: "Falha ao atualizar status." }
  }
}
