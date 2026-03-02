"use client"

import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import SmartScanner from "@/components/SmartScanner"
import { FileCheck2, PackagePlus, Package, Search, Loader2 } from "lucide-react"
import { getOrderByShipmentNumber, createHubOrder } from "@/actions/order.actions"

export default function EntradaPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const router = useRouter()

  const [lastScan, setLastScan] = useState<string | null>(null)
  const [shipmentNumber, setShipmentNumber] = useState("")
  const [showManualInput, setShowManualInput] = useState(false)
  const [showNewOrderForm, setShowNewOrderForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [searchError, setSearchError] = useState("")

  const [newOrder, setNewOrder] = useState({
    shipmentNumber: "",
    type: "COMMON" as "COMMON" | "SPECIAL",
    boxes: [{ boxNumber: "Caixa 1 de 1", items: [{ itemId: "", quantity: 1 }] }],
  })

  function handleScan(code: string) {
    setLastScan(code)
  }

  function handleShipmentDetected(data: { shipmentNumber: string; boxInfo?: string }) {
    setShipmentNumber(data.shipmentNumber)
    searchShipment(data.shipmentNumber)
  }

  function searchShipment(number: string) {
    setSearchError("")
    startTransition(async () => {
      const order = await getOrderByShipmentNumber(number)
      if (order) {
        router.push(`/remessas/${order.id}`)
      } else {
        setSearchError("Remessa não encontrada. Deseja cadastrar manualmente?")
        setNewOrder((prev) => ({ ...prev, shipmentNumber: number }))
      }
    })
  }

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault()
    if (shipmentNumber.trim()) searchShipment(shipmentNumber.trim())
  }

  function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.congregationId) return

    startTransition(async () => {
      const items = newOrder.boxes.flatMap((box) =>
        box.items
          .filter((i) => i.itemId)
          .map((i) => ({ itemId: i.itemId, quantity: i.quantity, boxNumber: box.boxNumber }))
      )

      const result = await createHubOrder({
        shipmentNumber: newOrder.shipmentNumber,
        type: newOrder.type,
        creatorCongregationId: user.congregationId,
        items,
      })

      if (result.success && "order" in result && result.order) {
        router.push(`/remessas/${result.order.id}`)
      }
    })
  }

  return (
    <div className="animate-in flex flex-col gap-5 pb-8">
      <div>
        <h2 className="page-title">Registro de Entrada</h2>
        <p className="page-subtitle">
          Capture a <strong>Nota de Envio</strong> ou busque manualmente.
        </p>
      </div>

      {/* Scanner - mobile only */}
      <div className="md:hidden">
        <SmartScanner onScanSuccess={handleScan} onShipmentDetected={handleShipmentDetected} />
      </div>
      <div className="hidden md:block">
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          <p className="text-sm font-medium m-0">Use o celular para escanear códigos de barras</p>
          <p className="text-xs mt-1 m-0">Ou utilize as opções manuais abaixo</p>
        </div>
      </div>

      <div className="divider">
        <span>Opções Manuais</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setShowManualInput(true); setShowNewOrderForm(false) }}
          className="card p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-transform border-none"
          style={{ background: "var(--surface-card)" }}
        >
          <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }}>
            <FileCheck2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-center leading-tight m-0" style={{ color: "var(--text-secondary)" }}>
            Digitar<br />Nota de Envio
          </p>
        </button>

        <button
          onClick={() => { setShowNewOrderForm(true); setShowManualInput(false) }}
          className="card p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-transform border-none"
          style={{ background: "var(--surface-card)" }}
        >
          <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }}>
            <PackagePlus className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-center leading-tight m-0" style={{ color: "var(--text-secondary)" }}>
            Cadastrar<br />Nova Remessa
          </p>
        </button>
      </div>

      {/* Busca Manual */}
      {showManualInput && (
        <form
          onSubmit={handleManualSearch}
          className="card p-4 flex flex-col gap-3 animate-in"
        >
          <h3 className="text-sm font-bold m-0 flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <Search className="w-4 h-4" />
            Buscar Remessa por Número
          </h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="section-label mb-1.5 block" htmlFor="entrada-shipment">
                Nº da Nota de Envio
              </label>
              <input
                id="entrada-shipment"
                type="text"
                value={shipmentNumber}
                onChange={(e) => setShipmentNumber(e.target.value)}
                required
                className="input"
              />
            </div>
            <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
            </button>
          </div>
          {searchError && (
            <div className="alert-warn text-sm">
              {searchError}
              <button
                type="button"
                onClick={() => { setShowNewOrderForm(true); setShowManualInput(false) }}
                className="ml-2 font-bold bg-transparent border-none cursor-pointer underline text-sm"
                style={{ color: "var(--color-primary)" }}
              >
                Cadastrar
              </button>
            </div>
          )}
        </form>
      )}

      {/* Formulário de Nova Remessa */}
      {showNewOrderForm && (
        <form
          onSubmit={handleCreateOrder}
          className="card p-4 flex flex-col gap-3 animate-in"
        >
          <h3 className="text-sm font-bold m-0 flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <Package className="w-4 h-4" />
            Nova Remessa
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-label mb-1.5 block" htmlFor="new-order-number">
                Nº da Nota de Envio
              </label>
              <input
                id="new-order-number"
                value={newOrder.shipmentNumber}
                onChange={(e) => setNewOrder({ ...newOrder, shipmentNumber: e.target.value })}
                required
                className="input"
              />
            </div>
            <div>
              <label className="section-label mb-1.5 block">Tipo</label>
              <select
                value={newOrder.type}
                onChange={(e) => setNewOrder({ ...newOrder, type: e.target.value as "COMMON" | "SPECIAL" })}
                className="select"
              >
                <option value="COMMON">Comum</option>
                <option value="SPECIAL">Especial</option>
              </select>
            </div>
          </div>
          <p className="text-xs font-medium m-0" style={{ color: "var(--text-muted)" }}>
            Você pode adicionar os itens depois na tela da remessa.
          </p>
          <button type="submit" disabled={isPending} className="btn btn-primary">
            {isPending ? "Criando..." : "Cadastrar Remessa"}
          </button>
        </form>
      )}
    </div>
  )
}
