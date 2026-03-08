import { getConsolidatedInventory } from "@/actions/inventory.actions"
import { requireAuth } from "@/lib/auth-utils"
import { Package } from "lucide-react"
import Link from "next/link"
import ItemImage from "@/components/ItemImage"
import CongregationSelector from "@/components/CongregationSelector"
import StockSearch from "@/components/StockSearch"
import { Suspense } from "react"

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ cong?: string; filter?: string }> }) {
  const user = await requireAuth()
  const isSS = user.role === "SS"
  const defaultCongId = user.congregationId || "vila-yara-id"
  const params = await searchParams
  const congId = (isSS && params.cong) ? params.cong : defaultCongId
  const filter = params.filter || ""

  const allInventory = await getConsolidatedInventory(congId)

  const inventory = isSS
    ? allInventory
    : allInventory.filter((inv) => !inv.item.isSpecialOrder)

  // Pre-serialize for the client search component
  const items = inventory.map((inv) => ({
    id: inv.item.id,
    title: inv.item.title,
    pubCode: inv.item.pubCode,
    langCode: inv.item.langCode,
    imageUrl: inv.item.imageUrl,
    isSpecialOrder: inv.item.isSpecialOrder,
    totalQuantity: inv.totalQuantity,
    avgConsumption: inv.avgConsumption,
    category: inv.item.categoryTags,
  }))

  return (
    <div className="animate-in flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Estoque</h2>
          <p className="page-subtitle">{inventory.length} publicações no acervo</p>
        </div>
        <div className="flex gap-2">
          <Link href="/entrada" className="no-underline btn btn-primary btn-sm">Entrada</Link>
          <Link href="/saida" className="no-underline btn btn-outline btn-sm">Saída</Link>
        </div>
      </div>

      {/* Seletor de congregação (SS only) */}
      {isSS && (
        <Suspense fallback={null}>
          <CongregationSelector defaultCongId={defaultCongId} />
        </Suspense>
      )}

      {/* Client-side search + filtered list */}
      <StockSearch items={items} initialFilter={filter} />
    </div>
  )
}
