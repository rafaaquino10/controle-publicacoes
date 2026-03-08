import { getOrders } from "@/actions/order.actions"
import { requireAuth } from "@/lib/auth-utils"
import Link from "next/link"
import { Package, Clock, Truck, CheckCircle2, Plus } from "lucide-react"
import { Card, Badge, Button, EmptyState } from "@/components/ui"
import { cn } from "@/lib/cn"

export default async function RemessasPage() {
  const user = await requireAuth()
  const congId = user.congregationId || "vila-yara-id"
  const orders = await getOrders(congId)

  const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: "amber" | "blue" | "green" }> = {
    PENDING: { label: "Pendente", icon: Clock, variant: "amber" },
    IN_TRANSIT: { label: "Em Trânsito", icon: Truck, variant: "blue" },
    RECEIVED: { label: "Recebida", icon: CheckCircle2, variant: "green" },
  }

  return (
    <div className="animate-in flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)]">Remessas</h1>
          <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">{orders.length} remessas registradas</p>
        </div>
        <Link href="/entrada" className="no-underline">
          <Button size="sm" icon={<Plus size={16} />}>Nova</Button>
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
          const allReceived = receivedBoxes === totalBoxes

          return (
            <Link
              key={order.id}
              href={`/remessas/${order.id}`}
              className="no-underline"
            >
              <Card variant="interactive" className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[16px] m-0 text-[var(--text-primary)]">
                      Envio {order.shipmentNumber}
                    </p>
                    <p className="text-[11px] m-0 mt-0.5 text-[var(--text-muted)]">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")} — {order.type}
                    </p>
                  </div>
                  <Badge variant={config.variant}>
                    <StatusIcon size={14} />
                    {config.label}
                  </Badge>
                </div>

                <div className="flex gap-5 text-[12px] text-[var(--text-secondary)]">
                  <span><strong className="text-[var(--text-primary)]">{totalBoxes}</strong> caixa(s)</span>
                  <span><strong className="text-[var(--text-primary)]">{totalItems}</strong> itens</span>
                  <span className={allReceived ? "text-[var(--color-success)]" : "text-[var(--color-warn)]"}>
                    <strong>{receivedBoxes}/{totalBoxes}</strong> recebidas
                  </span>
                </div>
              </Card>
            </Link>
          )
        })}

        {orders.length === 0 && (
          <Card variant="elevated">
            <EmptyState
              icon={<Package size={28} />}
              title="Nenhuma remessa"
              description="Registre entradas para criar remessas."
            />
          </Card>
        )}
      </div>
    </div>
  )
}
