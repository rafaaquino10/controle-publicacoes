"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import SmartScanner from "@/components/SmartScanner"
import ItemImage from "@/components/ItemImage"
import { Package, CheckCircle2, Loader2, AlertTriangle, ScanLine } from "lucide-react"
import { findPendingShipment, markBoxAsReceived, quickStockEntry } from "@/actions/order.actions"

type PageState = "SCANNING" | "CONFIRM" | "QUICK_ENTRY" | "SUCCESS"

type BoxData = {
  id: string
  boxNumber: string
  isReceived: boolean
  items: Array<{
    id: string
    quantity: number
    item: {
      id: string
      pubCode: string
      langCode: string
      title: string
      imageUrl: string | null
    }
  }>
}

type OrderData = {
  id: string
  shipmentNumber: string
  type: string
  status: string
  boxes: BoxData[]
}

type HistoryEntry = {
  label: string
  time: string
  items: string
}

export default function EntradaPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [state, setState] = useState<PageState>("SCANNING")
  const [isPending, startTransition] = useTransition()
  const [scannerActive, setScannerActive] = useState(true)

  // CONFIRM state
  const [order, setOrder] = useState<OrderData | null>(null)
  const [selectedBox, setSelectedBox] = useState<BoxData | null>(null)

  // QUICK_ENTRY state
  const [scannedNumber, setScannedNumber] = useState("")
  const [quickPubCode, setQuickPubCode] = useState("")
  const [quickLangCode, setQuickLangCode] = useState("T")
  const [quickQuantity, setQuickQuantity] = useState("")

  // SUCCESS state
  const [successMessage, setSuccessMessage] = useState("")
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Error
  const [error, setError] = useState("")

  const addHistory = (label: string, items: string) => {
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    setHistory((prev) => [{ label, time, items }, ...prev].slice(0, 20))
  }

  const goToScanning = useCallback(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setState("SCANNING")
    setOrder(null)
    setSelectedBox(null)
    setError("")
    setQuickPubCode("")
    setQuickLangCode("T")
    setQuickQuantity("")
    setScannedNumber("")
    setScannerActive(true)
  }, [])

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setState("SUCCESS")
    setScannerActive(false)
    successTimerRef.current = setTimeout(() => {
      goToScanning()
    }, 3000)
  }

  const handleScanResult = useCallback((data: { raw: string; shipmentNumber: string; boxHint?: number }) => {
    setScannerActive(false)
    setError("")

    startTransition(async () => {
      const result = await findPendingShipment(data.raw)

      if (result.found && result.order) {
        setOrder(result.order)

        // Try to auto-select unreceived box
        const unreceived = result.order.boxes.filter((b) => !b.isReceived)

        if (data.boxHint) {
          // Try to match box by hint number
          const hinted = unreceived.find((b) => b.boxNumber.includes(`${data.boxHint}`))
          setSelectedBox(hinted || unreceived[0] || null)
        } else {
          setSelectedBox(unreceived[0] || null)
        }

        setState("CONFIRM")
      } else {
        // No order found — show quick entry
        setScannedNumber(data.shipmentNumber)
        setState("QUICK_ENTRY")
      }
    })
  }, [])

  const handleConfirmReceive = () => {
    if (!selectedBox || !user?.id) return

    startTransition(async () => {
      const result = await markBoxAsReceived(selectedBox.id, user.id)

      if (result.success) {
        const itemsSummary = selectedBox.items
          .map((oi) => `+${oi.quantity} ${oi.item.pubCode}-${oi.item.langCode}`)
          .join(", ")
        addHistory(
          `${order?.shipmentNumber} · ${selectedBox.boxNumber}`,
          itemsSummary
        )
        showSuccess(`Entrada registrada! ${itemsSummary}`)
      } else {
        setError("Erro ao registrar entrada. Tente novamente.")
      }
    })
  }

  const handleQuickEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.congregationId || !user?.id) return

    const qty = parseInt(quickQuantity)
    if (!qty || qty <= 0) return

    startTransition(async () => {
      const result = await quickStockEntry({
        pubCode: quickPubCode.trim(),
        langCode: quickLangCode,
        quantity: qty,
        congregationId: user.congregationId,
        userId: user.id,
      })

      if (result.success && "item" in result && result.item) {
        const summary = `+${qty} ${result.item.pubCode}-${result.item.langCode}`
        addHistory(`Entrada rapida`, summary)
        showSuccess(`Entrada registrada! ${summary}`)
      } else if ("error" in result) {
        setError(result.error || "Erro ao registrar.")
      }
    })
  }

  return (
    <div className="animate-in flex flex-col gap-4 pb-8">
      {/* Header */}
      <div>
        <h2 className="page-title">Registro de Entrada</h2>
        <p className="page-subtitle">
          {state === "SCANNING" && "Escaneie a etiqueta da caixa"}
          {state === "CONFIRM" && "Confira e confirme o recebimento"}
          {state === "QUICK_ENTRY" && "Remessa nao encontrada — entrada manual"}
          {state === "SUCCESS" && "Entrada registrada com sucesso"}
        </p>
      </div>

      {/* Scanner — visible in SCANNING state */}
      {state === "SCANNING" && (
        <SmartScanner
          onScanResult={handleScanResult}
          continuous
          active={scannerActive}
        />
      )}

      {/* Loading overlay after scan */}
      {state === "SCANNING" && isPending && (
        <div className="card p-6 flex flex-col items-center gap-3 animate-in">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} />
          <p className="text-sm font-medium m-0" style={{ color: "var(--text-secondary)" }}>
            Buscando remessa...
          </p>
        </div>
      )}

      {/* CONFIRM — Card de confirmacao */}
      {state === "CONFIRM" && order && selectedBox && (
        <div className="card p-0 overflow-hidden animate-in">
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
            <Package className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <div>
              <p className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>
                Envio {order.shipmentNumber}
              </p>
              <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>
                {selectedBox.boxNumber}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="px-4 py-3 flex flex-col gap-3">
            {selectedBox.items.map((oi) => (
              <div key={oi.id} className="flex items-center gap-3">
                <ItemImage
                  src={oi.item.imageUrl}
                  alt={oi.item.title}
                  pubCode={oi.item.pubCode}
                  langCode={oi.item.langCode}
                  width={48}
                  height={64}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold m-0 truncate" style={{ color: "var(--text-primary)" }}>
                    {oi.item.title}
                  </p>
                  <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>
                    {oi.item.pubCode}-{oi.item.langCode}
                  </p>
                  <p className="text-sm font-black m-0 mt-0.5" style={{ color: "var(--color-primary)" }}>
                    Quantidade: {oi.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* If order has more unreceived boxes, show selector */}
          {order.boxes.filter((b) => !b.isReceived).length > 1 && (
            <div className="px-4 pb-3">
              <label className="section-label mb-1.5 block">Selecionar caixa:</label>
              <select
                value={selectedBox.id}
                onChange={(e) => {
                  const box = order.boxes.find((b) => b.id === e.target.value)
                  if (box) setSelectedBox(box)
                }}
                className="select w-full"
              >
                {order.boxes
                  .filter((b) => !b.isReceived)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.boxNumber}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {error && (
            <div className="px-4 pb-3">
              <div className="alert-warn text-sm">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 pb-4 flex flex-col gap-2">
            <button
              onClick={handleConfirmReceive}
              disabled={isPending}
              className="btn w-full font-bold"
              style={{
                height: "48px",
                borderRadius: "10px",
                background: "var(--color-success, #059669)",
                color: "white",
                fontSize: "16px",
              }}
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {isPending ? "Registrando..." : "Confirmar Entrada"}
            </button>
            <button
              onClick={goToScanning}
              disabled={isPending}
              className="btn btn-outline w-full text-sm"
              style={{ height: "40px", borderRadius: "10px" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM — All boxes received */}
      {state === "CONFIRM" && order && !selectedBox && (
        <div className="card p-6 flex flex-col items-center gap-3 animate-in text-center">
          <CheckCircle2 className="w-12 h-12" style={{ color: "var(--color-success, #059669)" }} />
          <p className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>
            Envio {order.shipmentNumber}
          </p>
          <p className="text-sm m-0" style={{ color: "var(--text-muted)" }}>
            Todas as caixas desta remessa ja foram recebidas.
          </p>
          <button onClick={goToScanning} className="btn btn-primary mt-2">
            Escanear outra
          </button>
        </div>
      )}

      {/* QUICK_ENTRY — Formulario rapido */}
      {state === "QUICK_ENTRY" && (
        <form onSubmit={handleQuickEntry} className="card p-4 flex flex-col gap-3 animate-in">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5" style={{ color: "var(--color-warning, #d97706)" }} />
            <div>
              <p className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>
                Remessa nao encontrada
              </p>
              <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>
                Codigo escaneado: {scannedNumber}
              </p>
            </div>
          </div>

          <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>
            Preencha os dados da etiqueta para registrar a entrada diretamente no estoque.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="section-label mb-1.5 block" htmlFor="quick-pubcode">
                Codigo da publicacao
              </label>
              <input
                id="quick-pubcode"
                type="text"
                value={quickPubCode}
                onChange={(e) => setQuickPubCode(e.target.value)}
                placeholder="ex: mi26"
                required
                className="input"
              />
            </div>
            <div>
              <label className="section-label mb-1.5 block" htmlFor="quick-lang">
                Idioma
              </label>
              <select
                id="quick-lang"
                value={quickLangCode}
                onChange={(e) => setQuickLangCode(e.target.value)}
                className="select"
              >
                <option value="T">T (Portugues)</option>
                <option value="E">E (Ingles)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="section-label mb-1.5 block" htmlFor="quick-qty">
              Quantidade
            </label>
            <input
              id="quick-qty"
              type="number"
              value={quickQuantity}
              onChange={(e) => setQuickQuantity(e.target.value)}
              placeholder="ex: 1440"
              required
              min="1"
              className="input"
            />
          </div>

          {/* Preview — show image if pubCode is filled */}
          {quickPubCode.trim() && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "color-mix(in srgb, var(--color-primary) 5%, transparent)" }}>
              <ItemImage
                src={null}
                alt={quickPubCode}
                pubCode={quickPubCode.trim()}
                langCode={quickLangCode}
                width={40}
                height={54}
              />
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                <p className="m-0 font-bold">{quickPubCode.trim()}-{quickLangCode}</p>
                {quickQuantity && <p className="m-0">Quantidade: {quickQuantity}</p>}
              </div>
            </div>
          )}

          {error && <div className="alert-warn text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isPending}
            className="btn w-full font-bold"
            style={{
              height: "48px",
              borderRadius: "10px",
              background: "var(--color-success, #059669)",
              color: "white",
              fontSize: "16px",
            }}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {isPending ? "Registrando..." : "Registrar Entrada"}
          </button>
          <button
            type="button"
            onClick={goToScanning}
            disabled={isPending}
            className="btn btn-outline w-full text-sm"
            style={{ height: "40px", borderRadius: "10px" }}
          >
            Voltar ao Scanner
          </button>
        </form>
      )}

      {/* SUCCESS — Feedback */}
      {state === "SUCCESS" && (
        <div className="card p-6 flex flex-col items-center gap-3 animate-in text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--color-success, #059669) 15%, transparent)" }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: "var(--color-success, #059669)" }} />
          </div>
          <p className="text-lg font-black m-0" style={{ color: "var(--text-primary)" }}>
            {successMessage}
          </p>
          <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>
            Voltando ao scanner em 3 segundos...
          </p>
          <button onClick={goToScanning} className="btn btn-primary btn-sm mt-1">
            <ScanLine className="w-4 h-4" />
            Escanear agora
          </button>
        </div>
      )}

      {/* Historico recente */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label m-0">Historico recente</h3>
          {history.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: "color-mix(in srgb, var(--color-success, #059669) 5%, transparent)" }}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-success, #059669)" }} />
              <div className="flex-1 min-w-0">
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {entry.label}
                </span>
                <span className="mx-1.5" style={{ color: "var(--text-muted)" }}>·</span>
                <span style={{ color: "var(--text-secondary)" }}>{entry.items}</span>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {entry.time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
