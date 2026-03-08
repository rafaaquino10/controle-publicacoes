"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"

export async function getSpecialRequests(congregationId: string) {
  return prisma.specialRequest.findMany({
    where: { congregationId },
    include: {
      items: { include: { item: true } },
      registeredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createSpecialRequest(data: {
  personName: string
  congregationId: string
  items: { itemId: string; quantity: number }[]
  notes?: string
}) {
  const user = await requireAuth()

  return prisma.specialRequest.create({
    data: {
      personName: data.personName,
      congregationId: data.congregationId,
      registeredById: user.id,
      notes: data.notes || null,
      items: {
        create: data.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })),
      },
    },
  })
}

export async function updateSpecialRequestStatus(id: string, status: string) {
  await requireAuth()
  return prisma.specialRequest.update({
    where: { id },
    data: { status },
  })
}

export async function deleteSpecialRequest(id: string) {
  await requireAuth()
  return prisma.specialRequest.delete({ where: { id } })
}

export async function getOrderableItems(congregationId: string) {
  return prisma.item.findMany({
    where: { isOrderable: true },
    orderBy: [{ categoryTags: "asc" }, { title: "asc" }],
    select: {
      id: true,
      pubCode: true,
      title: true,
      categoryTags: true,
      langCode: true,
    },
  })
}
