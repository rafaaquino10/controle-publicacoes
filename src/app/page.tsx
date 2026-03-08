import { auth } from "@/lib/auth"
import { getRecentActivity, getPendingShipments, getPendingShipmentsCount } from "@/actions/analytics.actions"
import Link from "next/link"
import { Suspense } from "react"
import CongregationSelector from "@/components/CongregationSelector"
import { Card, Alert, GroupedList, GroupedRow, EmptyState } from "@/components/ui"
import { cn } from "@/lib/cn"
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

  const quickActions = isSS
    ? [
        { href: "/entrada", icon: ArrowDownLeft, label: "Dar Entrada", color: "bg-[#34c759]/12 text-[#34c759]" },
        { href: "/saida", icon: ArrowUpRight, label: "Registrar Saída", color: "bg-[#ff3b30]/12 text-[#ff3b30]" },
        { href: "/relatorios", icon: FileText, label: "Relatório", color: "bg-[var(--color-primary)]/12 text-[var(--color-primary)]" },
        { href: "/catalogo", icon: BookOpen, label: "Catálogo", color: "bg-[#ff9500]/12 text-[#ff9500]" },
      ]
    : [
        { href: "/entrada", icon: ArrowDownLeft, label: "Dar Entrada", color: "bg-[#34c759]/12 text-[#34c759]" },
        { href: "/saida", icon: ArrowUpRight, label: "Registrar Saída", color: "bg-[#ff3b30]/12 text-[#ff3b30]" },
        { href: "/estoque", icon: Package, label: "Ver Estoque", color: "bg-[var(--color-primary)]/12 text-[var(--color-primary)]" },
        { href: "/pedidos-nominais", icon: ClipboardList, label: "Pedidos Nominais", color: "bg-[#ff9500]/12 text-[#ff9500]" },
      ]

  return (
    <div className="animate-in flex flex-col gap-5">
      {/* Greeting — large title iOS style */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight m-0 text-[var(--text-primary)]">
          Olá, {user?.name?.split(" ")[0] || "Servo"}
        </h1>
        <p className="text-[15px] mt-1 m-0 text-[var(--text-muted)]">
          O que vamos fazer hoje?
        </p>
      </div>

      {/* Congregation selector (SS only) */}
      {isSS && (
        <Suspense fallback={null}>
          <CongregationSelector defaultCongId={defaultCongId} />
        </Suspense>
      )}

      {/* Betel reminder */}
      {showBetelReminder && (
        <Link href="/relatorios" className="no-underline">
          <Alert variant="warning">
            <div className="flex items-center justify-between gap-2 w-full">
              <div>
                <p className="font-semibold m-0 text-[13px]">Inventário Betel</p>
                <p className="text-[12px] m-0 mt-0.5 opacity-80">
                  Prazo até dia 10 — faltam {10 - dayOfMonth} dia(s)
                </p>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 opacity-50" />
            </div>
          </Alert>
        </Link>
      )}

      {/* Quick actions — 2x2 grid */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-2.5">
          Ações Rápidas
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href} className="no-underline">
                <Card
                  variant="interactive"
                  className="flex flex-col items-center justify-center gap-2 py-5 px-3 min-h-[100px]"
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", action.color)}>
                    <Icon size={24} />
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--text-secondary)] text-center leading-tight">
                    {action.label}
                  </span>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pending shipments */}
      {pendingCount > 0 && (
        <GroupedList
          header={`Remessas Pendentes`}
        >
          {pendingShipments.map((order) => (
            <GroupedRow
              key={order.id}
              href={`/remessas/${order.id}`}
              icon={<Package size={15} />}
              iconBg="bg-[var(--color-primary)]"
              label={order.shipmentNumber}
              value={`${order._count.boxes} cx`}
              chevron
            />
          ))}
          {pendingCount > 3 && (
            <GroupedRow
              href="/remessas"
              label={`Ver todas (${pendingCount})`}
              chevron
              className="justify-center"
            />
          )}
        </GroupedList>
      )}

      {/* Recent activity */}
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-2.5">
          <Clock size={13} /> Atividade Recente
        </p>
        {recentActivity.length > 0 ? (
          <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden">
            {recentActivity.map((mov, i) => {
              const isOut = mov.quantity < 0
              const isLast = i === recentActivity.length - 1
              return (
                <Link
                  key={mov.id}
                  href={`/estoque/${encodeURIComponent(mov.item.id)}`}
                  className={cn(
                    "no-underline flex items-center gap-3 px-4 py-2.5",
                    "transition-colors duration-100 active:bg-[var(--surface-bg)]",
                    !isLast && "border-b border-[var(--border-color)]"
                  )}
                >
                  <div
                    className={cn(
                      "w-[30px] h-[30px] rounded-lg flex-shrink-0 flex items-center justify-center",
                      isOut ? "bg-[#ff3b30]/10 text-[#ff3b30]" : "bg-[#34c759]/10 text-[#34c759]"
                    )}
                  >
                    {isOut ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 truncate text-[14px] font-semibold text-[var(--text-primary)]">
                      {mov.item.title}
                    </p>
                    <p className="m-0 text-[12px] text-[var(--text-muted)]">
                      {typeLabels[mov.type] || mov.type} · {mov.user?.name || "Sistema"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        "m-0 text-[15px] font-bold tabular-nums",
                        isOut ? "text-[#ff3b30]" : "text-[#34c759]"
                      )}
                    >
                      {isOut ? "" : "+"}{mov.quantity}
                    </p>
                    <p className="m-0 text-[10px] text-[var(--text-muted)]">
                      {formatRelativeDate(mov.timestamp)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <Card variant="elevated">
            <EmptyState
              icon={<Clock size={28} />}
              title="Nenhuma movimentação"
              description="As movimentações aparecerão aqui."
            />
          </Card>
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
