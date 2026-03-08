"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { buildCdnImageUrl } from "@/lib/cdn-url"

export async function createNewItem(data: {
  pubCode: string
  langCode: string
  format: string
  title: string
  categoryTags: string
  isSpecialOrder: boolean
  isOrderable: boolean
  defaultLocationId?: string
}) {
  try {
    const id = `${data.pubCode}|${data.langCode}|${data.format}`
    const imageUrl = buildCdnImageUrl(data.pubCode, data.langCode)

    const item = await prisma.item.create({
      data: {
        id,
        imageUrl,
        ...data,
      },
    })

    revalidatePath("/catalogo")
    return { success: true, item }
  } catch (error) {
    console.error("Erro ao criar item:", error)
    return { success: false, error: "Falha ao cadastrar item." }
  }
}

export async function getAllItems() {
  try {
    const items = await prisma.item.findMany({
      include: { defaultLocation: true },
      orderBy: { title: "asc" },
    })
    return items
  } catch (error) {
    console.error("Erro ao buscar itens:", error)
    return []
  }
}

export async function getItemById(id: string) {
  try {
    return await prisma.item.findUnique({ where: { id } })
  } catch (error) {
    console.error("Erro ao buscar item:", error)
    return null
  }
}

export async function searchItems(query: string) {
  try {
    return await prisma.item.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { pubCode: { contains: query } },
          { categoryTags: { contains: query } },
        ],
      },
      include: { defaultLocation: true },
      orderBy: { title: "asc" },
    })
  } catch (error) {
    console.error("Erro ao buscar itens:", error)
    return []
  }
}

export async function importItemsFromCSV(
  rows: Array<{
    pubCode: string
    langCode: string
    format: string
    title: string
    categoryTags: string
    isSpecialOrder: boolean
    isOrderable: boolean
  }>
) {
  try {
    let created = 0
    let skipped = 0

    for (const row of rows) {
      const id = `${row.pubCode}|${row.langCode}|${row.format}`
      const imageUrl = buildCdnImageUrl(row.pubCode, row.langCode)

      const existing = await prisma.item.findUnique({ where: { id } })
      if (existing) {
        skipped++
        continue
      }

      await prisma.item.create({
        data: { id, imageUrl, ...row },
      })
      created++
    }

    revalidatePath("/catalogo")
    return { success: true, created, skipped }
  } catch (error) {
    console.error("Erro ao importar CSV:", error)
    return { success: false, error: "Falha na importação CSV." }
  }
}
