"use client"

import { useState, useEffect, useTransition } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Package, CheckCircle2, Clock, ArrowLeft, Loader2 } from "lucide-react"
import { markBoxAsReceived } from "@/actions/order.actions"
import Link from "next/link"

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="animate-in card empty-state my-10">
        <Package className="w-12 h-12 text-slate-200" />
        <p>Remessa não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      <Link href="/remessas" className="no-underline flex items-center gap-2 text-sm font-bold text-primary">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div>
        <h2 className="page-title">Envio {order.shipmentNumber}</h2>
        <p className="page-subtitle">
          {order.type} — {new Date(order.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {order.boxes?.map((box: any) => (
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card p-4 border-l-4 ${box.isReceived ? "border-l-emerald-400" : "border-l-amber-400"}`}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                {box.isReceived ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
                <span className="font-bold text-base text-slate-800">{box.boxNumber}</span>
              </div>

              {!box.isReceived && (
                <button
                  onClick={() => handleReceiveBox(box.id)}
                  disabled={isPending}
                  className="btn btn-sm text-white bg-emerald-500 hover:bg-emerald-600"
                  style={{ height: 32 }}
                >
                  Receber Caixa
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {box.items?.map((orderItem: any) => (
                <div key={orderItem.id} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">
                    {orderItem.item?.title || orderItem.itemId}
                  </span>
                  <span className="font-bold text-slate-800">x{orderItem.quantity}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
