import { requireAuth } from "@/lib/auth-utils"
import { getSpecialRequests, getOrderableItems } from "@/actions/special-request.actions"
import SpecialRequestsClient from "./SpecialRequestsClient"

export default async function SpecialRequestsPage({ searchParams }: { searchParams: Promise<{ cong?: string }> }) {
  const user = await requireAuth()
  const isSS = user.role === "SS"
  const congId = (isSS && (await searchParams).cong) || user.congregationId || "vila-yara-id"

  const [requests, items] = await Promise.all([
    getSpecialRequests(congId),
    getOrderableItems(congId),
  ])

  const serialized = requests.map((r) => ({
    id: r.id,
    personName: r.personName,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    registeredBy: r.registeredBy.name || "—",
    items: r.items.map((ri) => ({
      id: ri.id,
      title: ri.item.title,
      pubCode: ri.item.pubCode,
      quantity: ri.quantity,
    })),
  }))

  const itemOptions = items.map((i) => ({
    id: i.id,
    title: i.title,
    pubCode: i.pubCode,
    category: i.categoryTags,
    langCode: i.langCode,
  }))

  return (
    <div className="animate-in flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)]">Pedidos Nominais</h1>
        <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">Solicitações individuais de publicações</p>
      </div>
      <SpecialRequestsClient requests={serialized} items={itemOptions} congId={congId} />
    </div>
  )
}
