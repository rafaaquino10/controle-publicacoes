"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import type { Role } from "@/lib/types"

export async function createInvite(data: {
  role: Role
  congregationId: string
  createdById: string
  expiresInHours?: number
}) {
  try {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours || 72))

    const invite = await prisma.invite.create({
      data: {
        token: uuidv4(),
        role: data.role,
        congregationId: data.congregationId,
        createdById: data.createdById,
        expiresAt,
      },
    })

    revalidatePath("/configuracoes/usuarios")
    return { success: true, invite }
  } catch (error) {
    console.error("Erro ao criar convite:", error)
    return { success: false, error: "Falha ao criar convite." }
  }
}

export async function getInviteByToken(token: string) {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { congregation: true, createdBy: { select: { name: true } } },
    })

    if (!invite) return { valid: false, error: "Convite não encontrado." }
    if (invite.usedAt) return { valid: false, error: "Convite já utilizado." }
    if (invite.expiresAt < new Date()) return { valid: false, error: "Convite expirado." }

    return { valid: true, invite }
  } catch (error) {
    console.error("Erro ao buscar convite:", error)
    return { valid: false, error: "Erro ao validar convite." }
  }
}

export async function acceptInviteWithCredentials(data: {
  token: string
  name: string
  email: string
  password: string
}) {
  try {
    const { valid, invite, error } = await getInviteByToken(data.token)
    if (!valid || !invite) return { success: false, error }

    // Verifica se email ja existe
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existing) {
      return { success: false, error: "Email ja cadastrado no sistema." }
    }

    const passwordHash = await hash(data.password, 12)

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: invite.role,
          congregationId: invite.congregationId,
          invitedById: invite.createdById,
          isActive: true,
        },
      })

      await tx.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedByEmail: data.email },
      })

      return { success: true, user: { id: user.id, email: user.email } }
    })
  } catch (error) {
    console.error("Erro ao aceitar convite:", error)
    return { success: false, error: "Falha ao criar conta." }
  }
}

export async function revokeInvite(inviteId: string) {
  try {
    await prisma.invite.delete({ where: { id: inviteId } })
    revalidatePath("/configuracoes/usuarios")
    return { success: true }
  } catch (error) {
    console.error("Erro ao revogar convite:", error)
    return { success: false, error: "Falha ao revogar convite." }
  }
}

export async function listPendingInvites(congregationId: string) {
  try {
    return await prisma.invite.findMany({
      where: {
        congregationId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("Erro ao listar convites:", error)
    return []
  }
}
