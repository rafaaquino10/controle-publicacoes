import { getConsolidatedInventory } from "@/actions/inventory.actions"
import { requireAuth } from "@/lib/auth-utils"
import { Package } from "lucide-react"
import Link from "next/link"
import ItemImage from "@/components/ItemImage"
import CongregationSelector from "@/components/CongregationSelector"
import { Suspense } from "react"

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ cong?: string }> }) {
  const user = await requireAuth()
  const isSS = user.role === "SS"
  const defaultCongId = user.congregationId || "vila-yara-id"
  const params = await searchParams
  const congId = (isSS && params.cong) ? params.cong : defaultCongId

  const allInventory = await getConsolidatedInventory(congId)

  const inventory = isSS
    ? allInventory
    : allInventory.filter((inv) => !inv.item.isSpecialOrder)

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

      {/* Lista de itens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
        {inventory.map((inv) => (
          <Link
            key={inv.item.id}
            href={`/estoque/${encodeURIComponent(inv.item.id)}`}
            className="no-underline"
          >
            <div className="card p-3 flex gap-3 items-center hover:bg-[var(--surface-bg)] transition-colors cursor-pointer">
              <ItemImage
                src={inv.item.imageUrl}
                alt={inv.item.title}
                pubCode={inv.item.pubCode}
                langCode={inv.item.langCode}
                width={44}
                height={58}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold m-0 truncate" style={{ color: "var(--text-primary)" }}>
                  {inv.item.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="badge badge-slate">{inv.item.pubCode}</span>
                  <span className="text-[10px] font-medium uppercase" style={{ color: "var(--text-muted)" }}>
                    {inv.item.langCode}
                  </span>
                  {inv.item.isSpecialOrder && <span className="badge badge-amber">Especial</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold m-0" style={{ color: "var(--text-primary)" }}>
                  {inv.totalQuantity}
                </p>
                {inv.avgConsumption > 0 && (
                  <p className="text-[10px] m-0" style={{ color: "var(--text-muted)" }}>
                    {inv.avgConsumption}/mês
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}

        {inventory.length === 0 && (
          <div className="card p-8 text-center">
            <Package className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm m-0" style={{ color: "var(--text-muted)" }}>
              Nenhuma publicação no estoque.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
