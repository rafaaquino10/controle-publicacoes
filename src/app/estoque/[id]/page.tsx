import { requireAuth } from "@/lib/auth-utils"
import { getItemDetail, getItemMonthlyConsumption, getItemMovementHistory } from "@/actions/item-detail.actions"
import ItemImage from "@/components/ItemImage"
import Breadcrumb from "@/components/Breadcrumb"
import { Card, Badge, GroupedList, GroupedRow, Button, EmptyState } from "@/components/ui"
import Link from "next/link"
import { ArrowUpRight, ArrowDownLeft, MapPin, Package } from "lucide-react"
import { cn } from "@/lib/cn"

const typeLabels: Record<string, string> = {
  RECEIVE_SHIPMENT:  "Entrada (remessa)",
  ISSUE_PUBLISHER:   "Saída (publicadores)",
  ISSUE_GROUP:       "Saída (grupo)",
  ISSUE_CART:        "Saída (carrinho)",
  TRANSFER_IN:       "Transferência (entrada)",
  ADJUSTMENT:        "Ajuste",
  COUNT_CORRECTION:  "Correção de contagem",
}

const formatLabels: Record<string, string> = {
  NORMAL:      "Normal",
  LARGE_PRINT: "Letra Grande",
  BRAILLE:     "Braille",
}

export default async function ItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cong?: string }>
}) {
  const { id } = await params
  const user = await requireAuth()
  const defaultCongId = user.congregationId || "vila-yara-id"
  const sp = await searchParams
  const congId = (user.role === "SS" && sp.cong) ? sp.cong : defaultCongId
  const decodedId = decodeURIComponent(id)

  const [detail, consumption, movements] = await Promise.all([
    getItemDetail(decodedId, congId),
    getItemMonthlyConsumption(decodedId, congId, 6),
    getItemMovementHistory(decodedId, congId, 20),
  ])

  if (!detail) {
    return (
      <div className="animate-in flex flex-col items-center py-16">
        <EmptyState
          icon={<Package size={28} />}
          title="Item não encontrado"
          action={
            <Link href="/estoque" className="no-underline">
              <Button size="sm">Voltar ao Estoque</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const { item, inventory, totalQuantity, avgConsumption } = detail
  const hasConsumption = consumption.length > 0 && consumption.some((c) => c.total > 0)
  const maxConsumption = Math.max(...consumption.map((c) => c.total), 1)
  const encodedItemId = encodeURIComponent(item.id)

  return (
    <div className="animate-in flex flex-col gap-5">
      <Breadcrumb items={[
        { label: "Estoque", href: "/estoque" },
        { label: item.title },
      ]} />

      {/* Header: image + info */}
      <div className="flex flex-col md:flex-row gap-5">
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <ItemImage
            src={item.imageUrl}
            alt={item.title}
            pubCode={item.pubCode}
            langCode={item.langCode}
            width={120}
            height={160}
          />
        </div>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold m-0 leading-snug text-[var(--text-primary)]">
            {item.title}
          </h1>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <Badge variant="slate">{item.pubCode}</Badge>
            <Badge variant="slate">{item.langCode}</Badge>
            <Badge variant="primary">{formatLabels[item.format] || item.format}</Badge>
            <Badge variant="green">{item.categoryTags}</Badge>
            {item.isSpecialOrder && <Badge variant="amber">Especial</Badge>}
          </div>

          {/* Stock stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 m-0 text-[var(--text-muted)]">
                Total em Estoque
              </p>
              <p className="text-[32px] font-bold m-0 text-[var(--text-primary)] leading-none tabular-nums">
                {totalQuantity}
              </p>
            </div>
            {avgConsumption > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 m-0 text-[var(--text-muted)]">
                  Consumo Mensal
                </p>
                <p className="text-[32px] font-bold m-0 text-[var(--text-secondary)] leading-none tabular-nums">
                  {avgConsumption}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <Link href={`/entrada?item=${encodedItemId}`} className="no-underline">
              <Button size="sm" icon={<ArrowDownLeft size={16} />}>Dar Entrada</Button>
            </Link>
            <Link href={`/saida?item=${encodedItemId}`} className="no-underline">
              <Button variant="danger" size="sm" icon={<ArrowUpRight size={16} />}>Registrar Saída</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stock by location */}
      <GroupedList header="Estoque por Local">
        {inventory.length > 0 ? (
          inventory.map((inv) => (
            <div key={inv.id}>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin size={16} className="flex-shrink-0 text-[var(--color-primary)]" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold m-0 text-[var(--text-primary)]">
                      {inv.location?.name || "Geral"}
                    </p>
                    {inv.location?.description && (
                      <p className="text-[11px] m-0 mt-0.5 text-[var(--text-muted)]">
                        {inv.location.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[18px] font-bold flex-shrink-0 ml-3 text-[var(--text-primary)] tabular-nums">
                  {inv.currentQuantity}
                </span>
              </div>
              {inv.location?.imageUrl && (
                <img
                  src={inv.location.imageUrl}
                  alt={inv.location.name}
                  className="w-full h-[120px] object-cover border-t border-[var(--border-color)]"
                />
              )}
            </div>
          ))
        ) : (
          <div className="px-4 py-3">
            <p className="text-[14px] text-[var(--text-muted)] m-0">Sem registros de inventário.</p>
          </div>
        )}
      </GroupedList>

      {/* Consumption chart */}
      {hasConsumption && (
        <Card variant="elevated" className="p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-4">
            Consumo Mensal (6 meses)
          </h3>
          <div className="flex items-end gap-2 h-24">
            {consumption.map((c, i) => {
              const pct = (c.total / maxConsumption) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] tabular-nums">{c.total}</span>
                  <div
                    className="w-full rounded-sm bg-[var(--color-primary)]"
                    style={{ height: `${Math.max(pct, 6)}%`, minHeight: 4 }}
                  />
                  <span className="text-[9px] font-semibold text-[var(--text-muted)]">{c.month}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Movement history */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-2 px-1">
          Histórico Recente
        </p>
        {movements.length > 0 ? (
          <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden">
            {movements.map((mov, i) => {
              const isOut = mov.quantity < 0
              const isLast = i === movements.length - 1
              return (
                <div
                  key={mov.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    !isLast && "border-b border-[var(--border-color)]"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      isOut ? "bg-[#ff3b30]/10 text-[#ff3b30]" : "bg-[#34c759]/10 text-[#34c759]"
                    )}
                  >
                    {isOut ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold m-0 text-[var(--text-primary)]">
                      {typeLabels[mov.type] || mov.type}
                    </p>
                    <p className="text-[11px] m-0 text-[var(--text-muted)]">
                      {mov.user?.name || "Sistema"} &middot; {new Date(mov.timestamp).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[14px] font-bold tabular-nums",
                      isOut ? "text-[#ff3b30]" : "text-[#34c759]"
                    )}
                  >
                    {isOut ? "" : "+"}{mov.quantity}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-[var(--surface-card)] rounded-[10px] px-4 py-3">
            <p className="text-[14px] text-[var(--text-muted)] m-0">Nenhuma movimentação registrada.</p>
          </div>
        )}
      </div>
    </div>
  )
}
