import { getOrders } from "@/actions/order.actions"
import { requireAuth } from "@/lib/auth-utils"
import Link from "next/link"
import { Package, Clock, Truck, CheckCircle2, Plus } from "lucide-react"

export default async function RemessasPage() {
  const user = await requireAuth()
  const congId = user.congregationId || "vila-yara-id"
  const orders = await getOrders(congId)

  const statusConfig: Record<string, { label: string; icon: typeof Clock; badgeClass: string }> = {
    PENDING: { label: "Pendente", icon: Clock, badgeClass: "badge-amber" },
    IN_TRANSIT: { label: "Em Trânsito", icon: Truck, badgeClass: "badge-blue" },
    RECEIVED: { label: "Recebida", icon: CheckCircle2, badgeClass: "badge-green" },
  }

  return (
    <div className="animate-in flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Remessas</h2>
          <p className="page-subtitle">{orders.length} remessas registradas</p>
        </div>
        <Link href="/entrada" className="no-underline btn btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Nova
        </Link>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {orders.map((order) => {
          const config = statusConfig[order.status] || statusConfig.PENDING
          const StatusIcon = config.icon
          const receivedBoxes = order.boxes.filter((b) => b.isReceived).length
          const totalBoxes = order.boxes.length
          const totalItems = order.boxes.reduce(
            (sum, box) => sum + box.items.reduce((s, i) => s + i.quantity, 0), 0
          )

          return (
            <Link
              key={order.id}
              href={`/remessas/${order.id}`}
              className="no-underline card p-4 flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-base m-0" style={{ color: "var(--text-primary)" }}>
                    Envio {order.shipmentNumber}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")} — {order.type}
                  </p>
                </div>
                <span className={`badge ${config.badgeClass} flex items-center gap-1`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {config.label}
                </span>
              </div>

              <div className="flex gap-5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span><strong style={{ color: "var(--text-primary)" }}>{totalBoxes}</strong> caixa(s)</span>
                <span><strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> itens</span>
                <span style={{ color: receivedBoxes === totalBoxes ? "var(--color-success)" : "var(--color-warning)" }}>
                  <strong>{receivedBoxes}/{totalBoxes}</strong> recebidas
                </span>
              </div>
            </Link>
          )
        })}

        {orders.length === 0 && (
          <div className="card empty-state">
            <Package className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
            <p>Nenhuma remessa registrada.</p>
          </div>
        )}
      </div>
    </div>
  )
}
