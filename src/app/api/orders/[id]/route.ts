import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      boxes: {
        include: { items: { include: { item: true } } },
        orderBy: { boxNumber: "asc" },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(order)
}
