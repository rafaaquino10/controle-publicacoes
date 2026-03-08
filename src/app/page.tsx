import { auth } from "@/lib/auth"
import { getRecentActivity, getPendingShipments, getPendingShipmentsCount } from "@/actions/analytics.actions"
import Link from "next/link"
import { Suspense } from "react"
import CongregationSelector from "@/components/CongregationSelector"
import {
  Package, ArrowUpRight, ArrowDownLeft, FileText,
  ClipboardList, BookOpen, Truck, Clock, ChevronRight,
} from "lucide-react"

const typeLabels: Record<string, string> = {
  RECEIVE_SHIPMENT: "Entrada",
  ISSUE_PUBLISHER: "Saída (publicadores)",
  ISSUE_GROUP: "Saída (grupo)",
  ISSUE_CART: "Saída (carrinho)",
  TRANSFER_IN: "Transferência",
  TRANSFER_DISPLAY: "Mostruário",
  ADJUSTMENT: "Ajuste",
  COUNT_CORRECTION: "Correção",
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ cong?: string }> }) {
  const session = await auth()
  const user = session?.user as any
  const userRole = user?.role || "SERVO"
  const isSS = userRole === "SS"
  const defaultCongId = user?.congregationId || "vila-yara-id"
  const params = await searchParams
  const congId = (isSS && params.cong) ? params.cong : defaultCongId

  const [recentActivity, pendingShipments, pendingCount] = await Promise.all([
    getRecentActivity(congId, 8),
    getPendingShipments(congId, 3),
    getPendingShipmentsCount(congId),
  ])

  const today = new Date()
  const dayOfMonth = today.getDate()
  const showBetelReminder = isSS && dayOfMonth <= 10

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 16px" }}>
      {/* Saudacao */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
          Olá, {user?.name?.split(" ")[0] || "Servo"}
        </h2>
        <p style={{ fontSize: 13, margin: "4px 0 0", color: "var(--text-muted)" }}>
          O que vamos fazer hoje?
        </p>
      </div>

      {/* Seletor de congregacao (SS only) */}
      {isSS && (
        <Suspense fallback={null}>
          <CongregationSelector defaultCongId={defaultCongId} />
        </Suspense>
      )}

      {/* Lembrete Betel — so nos primeiros 10 dias do mes */}
      {showBetelReminder && (
        <Link href="/relatorios" className="no-underline">
          <div
            className="card-interactive"
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderLeft: "3px solid var(--color-warn)",
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "color-mix(in srgb, var(--color-warn) 12%, transparent)",
                color: "var(--color-warn)",
              }}
            >
              <FileText size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Inventário Betel
              </p>
              <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-muted)" }}>
                Prazo até dia 10 — faltam {10 - dayOfMonth} dia(s)
              </p>
            </div>
            <ChevronRight size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          </div>
        </Link>
      )}

      {/* Acoes rapidas */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 10px" }}>
          Ações Rápidas
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href="/entrada" className="quick-action no-underline">
            <div
              className="quick-action-icon"
              style={{ background: "color-mix(in srgb, var(--color-success) 12%, transparent)", color: "var(--color-success)" }}
            >
              <ArrowDownLeft size={22} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.3 }}>
              Dar Entrada
            </span>
          </Link>

          <Link href="/saida" className="quick-action no-underline">
            <div
              className="quick-action-icon"
              style={{ background: "color-mix(in srgb, var(--color-error) 12%, transparent)", color: "var(--color-error)" }}
            >
              <ArrowUpRight size={22} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.3 }}>
              Registrar Saída
            </span>
          </Link>

          {isSS ? (
            <>
              <Link href="/relatorios" className="quick-action no-underline">
                <div
                  className="quick-action-icon"
                  style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}
                >
                  <FileText size={22} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.3 }}>
                  Relatório
                </span>
              </Link>

              <Link href="/catalogo" className="quick-action no-underline">
                <div
                  className="quick-action-icon"
                  style={{ background: "color-mix(in srgb, var(--color-warn) 12%, transparent)", color: "var(--color-warn)" }}
                >
                  <BookOpen size={22} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.3 }}>
                  Catálogo
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/estoque" className="quick-action no-underline">
                <div
                  className="quick-action-icon"
                  style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}
                >
                  <Package size={22} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.3 }}>
                  Ver Estoque
                </span>
              </Link>

              <Link href="/pedidos-nominais" className="quick-action no-underline">
                <div
                  className="quick-action-icon"
                  style={{ background: "color-mix(in srgb, var(--color-warn) 12%, transparent)", color: "var(--color-warn)" }}
                >
                  <ClipboardList size={22} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.3 }}>
                  Pedidos Nominais
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Remessas pendentes */}
      {pendingCount > 0 && (
        <div>
          <div className="flex items-center justify-between" style={{ margin: "0 0 10px" }}>
            <p className="flex items-center gap-1.5 m-0" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              <Truck size={13} /> Remessas Pendentes
            </p>
            {pendingCount > 3 && (
              <Link href="/remessas" className="no-underline" style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)" }}>
                Ver todas ({pendingCount})
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {pendingShipments.map((order) => (
              <Link key={order.id} href={`/remessas/${order.id}`} className="no-underline">
                <div
                  className="card-interactive"
                  style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                        color: "var(--color-primary)",
                      }}
                    >
                      <Package size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p className="m-0 truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {order.shipmentNumber}
                      </p>
                      <p className="m-0" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {order._count.boxes} caixa(s) · {order.status === "IN_TRANSIT" ? "Em trânsito" : "Pendente"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Atividade recente */}
      <div>
        <p className="flex items-center gap-1.5 m-0" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 10px" }}>
          <Clock size={13} /> Atividade Recente
        </p>
        {recentActivity.length > 0 ? (
          <div className="card" style={{ overflow: "hidden" }}>
            {recentActivity.map((mov, i) => {
              const isOut = mov.quantity < 0
              const isLast = i === recentActivity.length - 1
              return (
                <Link
                  key={mov.id}
                  href={`/estoque/${encodeURIComponent(mov.item.id)}`}
                  className="no-underline flex items-center gap-3"
                  style={{
                    padding: "10px 14px",
                    borderBottom: isLast ? "none" : "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isOut
                        ? "color-mix(in srgb, var(--color-error) 10%, transparent)"
                        : "color-mix(in srgb, var(--color-success) 10%, transparent)",
                      color: isOut ? "var(--color-error)" : "var(--color-success)",
                    }}
                  >
                    {isOut ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="m-0 truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {mov.item.title}
                    </p>
                    <p className="m-0" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {typeLabels[mov.type] || mov.type} · {mov.user?.name || "Sistema"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p
                      className="m-0"
                      style={{
                        fontSize: 14, fontWeight: 700,
                        color: isOut ? "var(--color-error)" : "var(--color-success)",
                      }}
                    >
                      {isOut ? "" : "+"}{mov.quantity}
                    </p>
                    <p className="m-0" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {formatRelativeDate(mov.timestamp)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: "24px 16px", textAlign: "center" }}>
            <p className="m-0" style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Nenhuma movimentação registrada ainda.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelativeDate(date: Date) {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `${diffMin}min`
  if (diffH < 24) return `${diffH}h`
  if (diffD === 1) return "ontem"
  if (diffD < 7) return `${diffD}d`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}
