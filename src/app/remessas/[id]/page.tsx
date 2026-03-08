"use client"

import { useState, useEffect, useTransition } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Package, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { markBoxAsReceived } from "@/actions/order.actions"
import { Card, Button, EmptyState } from "@/components/ui"
import { cn } from "@/lib/cn"

export default function RemessaDetailPage() {
  const params = useParams()
  const orderId = params.id as string
  const { data: session } = useSession()
  const user = session?.user as any

  const [order, setOrder] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadOrder() }, [orderId])

  async function loadOrder() {
    const res = await fetch(`/api/orders/${orderId}`)
    if (res.ok) setOrder(await res.json())
    setLoading(false)
  }

  function handleReceiveBox(boxId: string) {
    if (!user?.id) return
    startTransition(async () => {
      await markBoxAsReceived(boxId, user.id)
      await loadOrder()
    })
  }

  if (loading) {
    return (
      <div className="animate-in flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="animate-in my-10">
        <Card variant="elevated">
          <EmptyState
            icon={<Package size={28} />}
            title="Remessa não encontrada"
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)]">
          Envio {order.shipmentNumber}
        </h1>
        <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">
          {order.type} — {new Date(order.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {order.boxes?.map((box: any) => (
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              variant="elevated"
              className={cn(
                "p-4 border-l-4",
                box.isReceived ? "border-l-[var(--color-success)]" : "border-l-[var(--color-warn)]"
              )}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {box.isReceived ? (
                    <CheckCircle2 size={20} className="text-[var(--color-success)]" />
                  ) : (
                    <Clock size={20} className="text-[var(--color-warn)]" />
                  )}
                  <span className="font-bold text-[16px] text-[var(--text-primary)]">{box.boxNumber}</span>
                </div>

                {!box.isReceived && (
                  <Button
                    size="sm"
                    onClick={() => handleReceiveBox(box.id)}
                    disabled={isPending}
                    className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90"
                  >
                    Receber Caixa
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {box.items?.map((orderItem: any) => (
                  <div key={orderItem.id} className="flex justify-between items-center text-[14px]">
                    <span className="text-[var(--text-secondary)] font-medium">
                      {orderItem.item?.title || orderItem.itemId}
                    </span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">x{orderItem.quantity}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
