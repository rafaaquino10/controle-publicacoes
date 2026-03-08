"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { SubStockType } from "@/lib/types"

export async function createLocation(data: {
  name: string
  description?: string
  labelCode?: string
  subStockType?: SubStockType
  congregationId: string
}) {
  try {
    const loc = await prisma.location.create({ data })
    revalidatePath("/configuracoes/locais")
    return { success: true, location: loc }
  } catch (error) {
    console.error("Erro ao criar Location:", error)
    return { success: false, error: "Falha ao cadastrar local." }
  }
}

export async function updateLocation(
  id: string,
  data: {
    name?: string
    description?: string
    labelCode?: string
    subStockType?: SubStockType
  }
) {
  try {
    const loc = await prisma.location.update({ where: { id }, data })
    revalidatePath("/configuracoes/locais")
    return { success: true, location: loc }
  } catch (error) {
    console.error("Erro ao atualizar Location:", error)
    return { success: false, error: "Falha ao atualizar local." }
  }
}

export async function deleteLocation(id: string) {
  try {
    await prisma.location.delete({ where: { id } })
    revalidatePath("/configuracoes/locais")
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar Location:", error)
    return { success: false, error: "Falha ao remover local. Verifique se nao ha itens vinculados." }
  }
}

export async function getLocations(congregationId: string) {
  try {
    return await prisma.location.findMany({
      where: { congregationId },
      orderBy: { labelCode: "asc" },
    })
  } catch (error) {
    console.error("Erro ao buscar Locations:", error)
    return []
  }
}
