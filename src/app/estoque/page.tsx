import { getConsolidatedInventory } from "@/actions/inventory.actions"
import { requireAuth } from "@/lib/auth-utils"
import CongregationSelector from "@/components/CongregationSelector"
import StockSearch from "@/components/StockSearch"
import { Button } from "@/components/ui"
import Link from "next/link"
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
          <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)]">Estoque</h1>
          <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">{inventory.length} publicações no acervo</p>
        </div>
        <div className="flex gap-2">
          <Link href="/entrada" className="no-underline">
            <Button size="sm">Entrada</Button>
          </Link>
          <Link href="/saida" className="no-underline">
            <Button variant="secondary" size="sm">Saída</Button>
          </Link>
        </div>
      </div>

      {isSS && (
        <Suspense fallback={null}>
          <CongregationSelector defaultCongId={defaultCongId} />
        </Suspense>
      )}

      <StockSearch items={items} initialFilter={filter} />
    </div>
  )
}
