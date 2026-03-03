"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { ReportStatus } from "@/lib/types"

export async function createMonthlyReport(data: {
  period: string // "2026-03"
  congregationId: string
  langCode: string
  generatedById: string
}) {
  try {
    // Verificar se ha remessas pendentes
    const pendingOrders = await prisma.order.count({
      where: {
        creatorCongregationId: data.congregationId,
        status: { in: ["PENDING", "IN_TRANSIT"] },
      },
    })

    // Snapshot do inventario
    const inventory = await prisma.inventory.findMany({
      where: {
        congregationId: data.congregationId,
        item: { langCode: data.langCode },
      },
      include: {
        item: { select: { title: true, pubCode: true, format: true } },
        location: { select: { name: true, labelCode: true } },
      },
    })

    const report = await prisma.monthlyReport.upsert({
      where: {
        period_congregationId_langCode: {
          period: data.period,
          congregationId: data.congregationId,
          langCode: data.langCode,
        },
      },
      update: {
        data: JSON.stringify({ inventory, pendingOrders }),
        status: "DRAFT",
      },
      create: {
        period: data.period,
        congregationId: data.congregationId,
        langCode: data.langCode,
        generatedById: data.generatedById,
        data: JSON.stringify({ inventory, pendingOrders }),
        status: "DRAFT",
      },
    })

    revalidatePath("/relatorios")
    return { success: true, report, hasPendingOrders: pendingOrders > 0 }
  } catch (error) {
    console.error("Erro ao gerar relatorio:", error)
    return { success: false, error: "Falha ao gerar relatorio." }
  }
}

export async function finalizeReport(reportId: string) {
  try {
    const report = await prisma.monthlyReport.findUnique({
      where: { id: reportId },
    })

    if (!report) return { success: false, error: "Relatório não encontrado." }

    // Verificar remessas pendentes antes de finalizar
    const pendingOrders = await prisma.order.count({
      where: {
        creatorCongregationId: report.congregationId,
        status: { in: ["PENDING", "IN_TRANSIT"] },
      },
    })

    if (pendingOrders > 0) {
      return {
        success: false,
        error: `Existem ${pendingOrders} remessa(s) pendente(s). Finalize o recebimento antes de fechar o inventario.`,
      }
    }

    await prisma.monthlyReport.update({
      where: { id: reportId },
      data: { status: "FINAL" },
    })

    revalidatePath("/relatorios")
    return { success: true }
  } catch (error) {
    console.error("Erro ao finalizar relatorio:", error)
    return { success: false, error: "Falha ao finalizar relatorio." }
  }
}

export async function getReports(congregationId: string) {
  try {
    return await prisma.monthlyReport.findMany({
      where: { congregationId },
      include: { generatedBy: { select: { name: true } } },
      orderBy: { period: "desc" },
    })
  } catch (error) {
    console.error("Erro ao buscar relatorios:", error)
    return []
  }
}

export async function getReportById(reportId: string) {
  try {
    return await prisma.monthlyReport.findUnique({
      where: { id: reportId },
      include: {
        congregation: true,
        generatedBy: { select: { name: true } },
      },
    })
  } catch (error) {
    console.error("Erro ao buscar relatorio:", error)
    return null
  }
}
