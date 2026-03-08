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
