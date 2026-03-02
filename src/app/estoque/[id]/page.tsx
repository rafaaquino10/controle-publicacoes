import { requireAuth } from "@/lib/auth-utils"
import { getItemDetail, getItemMonthlyConsumption, getItemMovementHistory } from "@/actions/item-detail.actions"
import ItemImage from "@/components/ItemImage"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Package, MapPin, ArrowDownLeft } from "lucide-react"

const typeLabels: Record<string, string> = {
  RECEIVE_SHIPMENT:  "Entrada (remessa)",
  ISSUE_PUBLISHER:   "Saída (publicadores)",
  ISSUE_GROUP:       "Saída (grupo)",
  TRANSFER_DISPLAY:  "Transferência (mostruário)",
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
      <div className="animate-in flex flex-col gap-4 items-center py-16">
        <p className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>Item não encontrado</p>
        <Link href="/estoque" className="btn btn-primary btn-sm no-underline">Voltar ao Estoque</Link>
      </div>
    )
  }

  const { item, inventory, totalQuantity, avgConsumption } = detail
  const hasConsumption = consumption.length > 0 && consumption.some((c) => c.total > 0)
  const maxConsumption = Math.max(...consumption.map((c) => c.total), 1)

  return (
    <div className="animate-in flex flex-col gap-5">
      {/* Botão voltar */}
      <Link
        href="/estoque"
        className="no-underline flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Estoque
      </Link>

      {/* Header: imagem + info */}
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
          <h1 className="text-lg font-bold m-0 leading-snug" style={{ color: "var(--text-primary)" }}>
            {item.title}
          </h1>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="badge badge-slate">{item.pubCode}</span>
            <span className="badge badge-slate">{item.langCode}</span>
            <span className="badge badge-navy">{formatLabels[item.format] || item.format}</span>
            <span className="badge badge-green">{item.categoryTags}</span>
            {item.isSpecialOrder && <span className="badge badge-amber">Especial</span>}
          </div>

          {/* Total em estoque */}
          <div className="mt-4">
            <p className="text-xs font-semibold mb-1 m-0" style={{ color: "var(--text-muted)" }}>
              Total em Estoque
            </p>
            <p className="text-3xl font-bold m-0" style={{ color: "var(--text-primary)" }}>
              {totalQuantity}
            </p>
            {avgConsumption > 0 && (
              <p className="text-xs mt-1 m-0" style={{ color: "var(--text-muted)" }}>
                Média: {avgConsumption}/mês
              </p>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2 mt-4">
            <Link href="/entrada" className="no-underline btn btn-primary btn-sm">
              <Package className="w-4 h-4" /> Dar Entrada
            </Link>
            <Link href="/saida" className="no-underline btn btn-danger btn-sm">
              <ArrowUpRight className="w-4 h-4" /> Registrar Saída
            </Link>
          </div>
        </div>
      </div>

      {/* Estoque por local */}
      <div className="card p-4">
        <h3 className="section-label mb-3">Estoque por Local</h3>
        <div className="flex flex-col gap-2">
          {inventory.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  {inv.location?.labelCode || inv.location?.name || "Geral"}
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {inv.currentQuantity}
              </span>
            </div>
          ))}
          {inventory.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sem registros de inventário.</p>
          )}
        </div>
      </div>

      {/* Gráfico de consumo mensal */}
      {hasConsumption && (
        <div className="card p-4">
          <h3 className="section-label mb-4">Consumo Mensal (6 meses)</h3>
          <div className="flex items-end gap-2 h-24">
            {consumption.map((c, i) => {
              const pct = (c.total / maxConsumption) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{c.total}</span>
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${Math.max(pct, 6)}%`,
                      minHeight: 4,
                      background: "var(--color-primary)",
                    }}
                  />
                  <span className="text-[9px] font-semibold" style={{ color: "var(--text-muted)" }}>{c.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Histórico de movimentações */}
      <div className="card p-4">
        <h3 className="section-label mb-3">Histórico Recente</h3>
        <div className="flex flex-col gap-2">
          {movements.map((mov) => {
            const isOut = mov.quantity < 0
            return (
              <div
                key={mov.id}
                className="flex items-center gap-3 py-2 border-b"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isOut
                      ? "color-mix(in srgb, var(--color-error) 10%, transparent)"
                      : "color-mix(in srgb, var(--color-success) 10%, transparent)",
                    color: isOut ? "var(--color-error)" : "var(--color-success)",
                  }}
                >
                  {isOut ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold m-0" style={{ color: "var(--text-primary)" }}>
                    {typeLabels[mov.type] || mov.type}
                  </p>
                  <p className="text-[11px] m-0" style={{ color: "var(--text-muted)" }}>
                    {mov.user?.name || "Sistema"} &middot; {new Date(mov.timestamp).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: isOut ? "var(--color-error)" : "var(--color-success)" }}
                >
                  {isOut ? "" : "+"}{mov.quantity}
                </span>
              </div>
            )
          })}
          {movements.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhuma movimentação registrada.</p>
          )}
        </div>
      </div>
    </div>
  )
}
