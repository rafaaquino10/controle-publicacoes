"use server"

import { prisma } from "@/lib/prisma"

export async function getAllCongregations() {
  try {
    return await prisma.congregation.findMany({
      orderBy: { name: "asc" },
    })
  } catch (error) {
    console.error("Erro ao buscar congregações:", error)
    return []
  }
}
