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
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 className="page-title">Pedidos Nominais</h2>
        <p className="page-subtitle">Solicitações individuais de publicações</p>
      </div>
      <SpecialRequestsClient requests={serialized} items={itemOptions} congId={congId} />
    </div>
  )
}
