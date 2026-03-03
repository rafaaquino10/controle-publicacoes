"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/types"

export async function listUsers(congregationId: string) {
  try {
    return await prisma.user.findMany({
      where: { congregationId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        invitedBy: { select: { name: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    })
  } catch (error) {
    console.error("Erro ao listar usuários:", error)
    return []
  }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    })
    revalidatePath("/configuracoes/usuarios")
    return { success: true }
  } catch (error) {
    console.error("Erro ao alterar status:", error)
    return { success: false, error: "Falha ao alterar status do usuário." }
  }
}

export async function changeUserRole(userId: string, newRole: Role) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    })
    revalidatePath("/configuracoes/usuarios")
    return { success: true }
  } catch (error) {
    console.error("Erro ao alterar role:", error)
    return { success: false, error: "Falha ao alterar papel do usuário." }
  }
}
