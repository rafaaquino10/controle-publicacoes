"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import LabelScanner from "@/components/LabelScanner"
import type { LabelData } from "@/lib/label-ocr"
import ItemImage from "@/components/ItemImage"
import {
  Package, CheckCircle2, Loader2, AlertTriangle,
  ScanLine, PenLine, Search, ArrowLeft, Plus, Minus,
} from "lucide-react"
import { findPendingShipment, markBoxAsReceived, quickStockEntry } from "@/actions/order.actions"
import { searchItems } from "@/actions/item.actions"

type Mode = "CHOOSE" | "SCAN" | "MANUAL"
type ScanState = "SCANNING" | "CONFIRM" | "QUICK_ENTRY" | "SUCCESS"

type BoxData = {
  id: string
  boxNumber: string
  isReceived: boolean
  items: Array<{
    id: string
    quantity: number
    item: { id: string; pubCode: string; langCode: string; title: string; imageUrl: string | null }
  }>
}

type OrderData = {
  id: string
  shipmentNumber: string
  type: string
  status: string
  boxes: BoxData[]
}

type SearchResult = {
  id: string
  pubCode: string
  langCode: string
  title: string
  imageUrl: string | null
  categoryTags: string
}

type HistoryEntry = { label: string; time: string; items: string }

export default function EntradaPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [mode, setMode] = useState<Mode>("CHOOSE")
  const [scanState, setScanState] = useState<ScanState>("SCANNING")
  const [isPending, startTransition] = useTransition()
  const [scannerActive, setScannerActive] = useState(false)

  // Scan flow
  const [order, setOrder] = useState<OrderData | null>(null)
  const [selectedBox, setSelectedBox] = useState<BoxData | null>(null)
  const [scannedNumber, setScannedNumber] = useState("")
  const [quickPubCode, setQuickPubCode] = useState("")
  const [quickLangCode, setQuickLangCode] = useState("T")
  const [quickQuantity, setQuickQuantity] = useState("")

  // Manual flow
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null)
  const [manualQty, setManualQty] = useState(1)

  // Shared
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addHistory = (label: string, items: string) => {
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    setHistory((prev) => [{ label, time, items }, ...prev].slice(0, 20))
  }

  // ─── Navigation ───────────────────────────────────────
  const goToChoose = useCallback(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setMode("CHOOSE")
    setScanState("SCANNING")
    setScannerActive(false)
    setOrder(null)
    setSelectedBox(null)
    setError("")
    setQuickPubCode("")
    setQuickLangCode("T")
    setQuickQuantity("")
    setScannedNumber("")
    setSelectedItem(null)
    setManualQty(1)
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
  }, [])

  const enterScanMode = () => {
    setMode("SCAN")
    setScanState("SCANNING")
    setScannerActive(true)
    setError("")
  }

  const enterManualMode = () => {
    setMode("MANUAL")
    setSelectedItem(null)
    setManualQty(1)
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
    setError("")
  }

  const showSuccess = (message: string, thenMode: Mode = "CHOOSE") => {
    setSuccessMessage(message)
    setScanState("SUCCESS")
    setScannerActive(false)
    if (thenMode === "SCAN") {
      // Continuous scan: go back to scanning after 2s
      successTimerRef.current = setTimeout(() => {
        setScanState("SCANNING")
        setScannerActive(true)
        setError("")
        setOrder(null)
        setSelectedBox(null)
      }, 2000)
    } else {
      successTimerRef.current = setTimeout(() => goToChoose(), 3000)
    }
  }

  // ─── OCR / Label handlers ────────────────────────────
  const handleLabelResult = useCallback((data: LabelData) => {
    setError("")

    if (data.confidence === "none") {
      setError("Não foi possível ler a etiqueta. Tente novamente ou preencha manualmente.")
      return
    }

    // Pre-fill quick entry fields with whatever OCR found
    if (data.pubCode) setQuickPubCode(data.pubCode)
    if (data.langCode) setQuickLangCode(data.langCode)
    if (data.quantity) setQuickQuantity(String(data.quantity))

    if (data.shipmentNumber) {
      setScannerActive(false)
      startTransition(async () => {
        const result = await findPendingShipment(data.shipmentNumber!)

        if (result.found && result.order) {
          setOrder(result.order)
          const unreceived = result.order.boxes.filter((b: BoxData) => !b.isReceived)
          if (data.boxNumber) {
            const hinted = unreceived.find((b: BoxData) => b.boxNumber.includes(`${data.boxNumber}`))
            setSelectedBox(hinted || unreceived[0] || null)
          } else {
            setSelectedBox(unreceived[0] || null)
          }
          setScanState("CONFIRM")
        } else {
          setScannedNumber(data.shipmentNumber!)
          setScanState("QUICK_ENTRY")
        }
      })
    } else {
      // No shipment number but has some data — go to quick entry
      setScannerActive(false)
      setScannedNumber("")
      setScanState("QUICK_ENTRY")
    }
  }, [])

  const handleConfirmReceive = () => {
    if (!selectedBox || !user?.id) return
    startTransition(async () => {
      const result = await markBoxAsReceived(selectedBox.id, user.id)
      if (result.success) {
        const summary = selectedBox.items.map((oi) => `+${oi.quantity} ${oi.item.pubCode}-${oi.item.langCode}`).join(", ")
        addHistory(`${order?.shipmentNumber} · ${selectedBox.boxNumber}`, summary)
        showSuccess(`Entrada registrada! ${summary}`, "SCAN")
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
        addHistory("Entrada rápida", summary)
        showSuccess(`Entrada registrada! ${summary}`, "SCAN")
      } else if ("error" in result) {
        setError(result.error || "Erro ao registrar.")
      }
    })
  }

  // ─── Manual handlers ──────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    startTransition(async () => {
      const items = await searchItems(searchQuery.trim())
      setSearchResults(items as SearchResult[])
      setHasSearched(true)
      setSelectedItem(null)
    })
  }

  const handleManualConfirm = () => {
    if (!selectedItem || !user?.congregationId || !user?.id || manualQty < 1) return
    startTransition(async () => {
      const result = await quickStockEntry({
        pubCode: selectedItem.pubCode,
        langCode: selectedItem.langCode,
        quantity: manualQty,
        congregationId: user.congregationId,
        userId: user.id,
      })
      if (result.success && "item" in result && result.item) {
        const summary = `+${manualQty} ${result.item.pubCode}-${result.item.langCode}`
        addHistory("Entrada manual", summary)
        setSelectedItem(null)
        setManualQty(1)
        setSearchQuery("")
        setSearchResults([])
        setHasSearched(false)
        showSuccess(`Entrada registrada! ${summary}`, "CHOOSE")
      } else if ("error" in result) {
        setError(result.error || "Erro ao registrar.")
      }
    })
  }

  // ─── RENDER ───────────────────────────────────────────

  return (
    <div className="animate-in flex flex-col gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        {mode !== "CHOOSE" && (
          <button
            onClick={goToChoose}
            className="flex items-center justify-center w-9 h-9 rounded-lg border-none cursor-pointer"
            style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="page-title">Registro de Entrada</h2>
          <p className="page-subtitle m-0">
            {mode === "CHOOSE" && "Como deseja registrar?"}
            {mode === "SCAN" && scanState === "SCANNING" && "Fotografe a etiqueta da caixa"}
            {mode === "SCAN" && scanState === "CONFIRM" && "Confira os dados e confirme"}
            {mode === "SCAN" && scanState === "QUICK_ENTRY" && "Remessa não encontrada"}
            {mode === "SCAN" && scanState === "SUCCESS" && ""}
            {mode === "MANUAL" && !selectedItem && "Busque a publicação pelo nome ou código"}
            {mode === "MANUAL" && selectedItem && "Informe a quantidade recebida"}
          </p>
        </div>
      </div>

      {/* ═══ CHOOSE MODE ═══ */}
      {mode === "CHOOSE" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={enterScanMode}
            className="card p-6 flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-transform border-none"
            style={{ background: "var(--surface-card)" }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}
            >
              <ScanLine className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold m-0 leading-tight" style={{ color: "var(--text-primary)" }}>
                Escanear
              </p>
              <p className="text-xs m-0 mt-1" style={{ color: "var(--text-muted)" }}>
                Ler etiqueta da caixa
              </p>
            </div>
          </button>

          <button
            onClick={enterManualMode}
            className="card p-6 flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-transform border-none"
            style={{ background: "var(--surface-card)" }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}
            >
              <PenLine className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold m-0 leading-tight" style={{ color: "var(--text-primary)" }}>
                Manual
              </p>
              <p className="text-xs m-0 mt-1" style={{ color: "var(--text-muted)" }}>
                Buscar e adicionar
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ═══ SCAN MODE ═══ */}
      {mode === "SCAN" && scanState === "SCANNING" && (
        <>
          <LabelScanner onResult={handleLabelResult} active={scannerActive} />
          {error && (
            <div className="card p-4 flex flex-col items-center gap-3 animate-in text-center">
              <AlertTriangle className="w-6 h-6" style={{ color: "var(--color-warning, #d97706)" }} />
              <p className="text-sm m-0" style={{ color: "var(--text-secondary)" }}>{error}</p>
              <button
                onClick={() => { setScannerActive(false); setScannedNumber(""); setScanState("QUICK_ENTRY"); setError("") }}
                className="btn btn-outline btn-sm text-sm"
              >
                <PenLine className="w-4 h-4" /> Preencher manualmente
              </button>
            </div>
          )}
          {isPending && (
            <div className="card p-6 flex flex-col items-center gap-3 animate-in">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} />
              <p className="text-sm font-medium m-0" style={{ color: "var(--text-secondary)" }}>Buscando remessa...</p>
            </div>
          )}
        </>
      )}

      {/* CONFIRM */}
      {mode === "SCAN" && scanState === "CONFIRM" && order && selectedBox && (
        <div className="card p-0 overflow-hidden animate-in">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
            <Package className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <div>
              <p className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>Envio {order.shipmentNumber}</p>
              <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>{selectedBox.boxNumber}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            {selectedBox.items.map((oi) => (
              <div key={oi.id} className="flex items-center gap-3">
                <ItemImage src={oi.item.imageUrl} alt={oi.item.title} pubCode={oi.item.pubCode} langCode={oi.item.langCode} width={48} height={64} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold m-0 truncate" style={{ color: "var(--text-primary)" }}>{oi.item.title}</p>
                  <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>{oi.item.pubCode}-{oi.item.langCode}</p>
                  <p className="text-sm font-black m-0 mt-0.5" style={{ color: "var(--color-primary)" }}>Quantidade: {oi.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          {order.boxes.filter((b) => !b.isReceived).length > 1 && (
            <div className="px-4 pb-3">
              <label className="section-label mb-1.5 block">Selecionar caixa:</label>
              <select value={selectedBox.id} onChange={(e) => { const box = order.boxes.find((b) => b.id === e.target.value); if (box) setSelectedBox(box) }} className="select w-full">
                {order.boxes.filter((b) => !b.isReceived).map((b) => (<option key={b.id} value={b.id}>{b.boxNumber}</option>))}
              </select>
            </div>
          )}
          {error && <div className="px-4 pb-3"><div className="alert-warn text-sm">{error}</div></div>}
          <div className="px-4 pb-4 flex flex-col gap-2">
            <button onClick={handleConfirmReceive} disabled={isPending} className="btn w-full font-bold" style={{ height: "48px", borderRadius: "10px", background: "var(--color-success, #059669)", color: "white", fontSize: "16px" }}>
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {isPending ? "Registrando..." : "Confirmar Entrada"}
            </button>
            <button onClick={() => { setScanState("SCANNING"); setScannerActive(true); setError("") }} disabled={isPending} className="btn btn-outline w-full text-sm" style={{ height: "40px", borderRadius: "10px" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM — all boxes received */}
      {mode === "SCAN" && scanState === "CONFIRM" && order && !selectedBox && (
        <div className="card p-6 flex flex-col items-center gap-3 animate-in text-center">
          <CheckCircle2 className="w-12 h-12" style={{ color: "var(--color-success, #059669)" }} />
          <p className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>Envio {order.shipmentNumber}</p>
          <p className="text-sm m-0" style={{ color: "var(--text-muted)" }}>Todas as caixas já foram recebidas.</p>
          <button onClick={() => { setScanState("SCANNING"); setScannerActive(true) }} className="btn btn-primary mt-2">Escanear outra</button>
        </div>
      )}

      {/* QUICK_ENTRY */}
      {mode === "SCAN" && scanState === "QUICK_ENTRY" && (
        <form onSubmit={handleQuickEntry} className="card p-4 flex flex-col gap-3 animate-in">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5" style={{ color: "var(--color-warning, #d97706)" }} />
            <div>
              <p className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>Remessa não encontrada</p>
              <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>Código: {scannedNumber}</p>
            </div>
          </div>
          <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>Preencha os dados da etiqueta para registrar direto no estoque.</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="section-label mb-1.5 block">Código da publicação</label>
              <input type="text" value={quickPubCode} onChange={(e) => setQuickPubCode(e.target.value)} placeholder="ex: mi26" required className="input" />
            </div>
            <div>
              <label className="section-label mb-1.5 block">Idioma</label>
              <select value={quickLangCode} onChange={(e) => setQuickLangCode(e.target.value)} className="select">
                <option value="T">T (PT)</option>
                <option value="E">E (EN)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="section-label mb-1.5 block">Quantidade</label>
            <input type="number" value={quickQuantity} onChange={(e) => setQuickQuantity(e.target.value)} placeholder="ex: 1440" required min="1" className="input" />
          </div>
          {error && <div className="alert-warn text-sm">{error}</div>}
          <button type="submit" disabled={isPending} className="btn w-full font-bold" style={{ height: "48px", borderRadius: "10px", background: "var(--color-success, #059669)", color: "white", fontSize: "16px" }}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {isPending ? "Registrando..." : "Registrar Entrada"}
          </button>
          <button type="button" onClick={() => { setScanState("SCANNING"); setScannerActive(true); setError("") }} disabled={isPending} className="btn btn-outline w-full text-sm" style={{ height: "40px", borderRadius: "10px" }}>
            Voltar ao Scanner
          </button>
        </form>
      )}

      {/* SUCCESS (scan mode) */}
      {mode === "SCAN" && scanState === "SUCCESS" && (
        <div className="card p-6 flex flex-col items-center gap-3 animate-in text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-success, #059669) 15%, transparent)" }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: "var(--color-success, #059669)" }} />
          </div>
          <p className="text-lg font-black m-0" style={{ color: "var(--text-primary)" }}>{successMessage}</p>
          <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>Preparando próximo scan...</p>
        </div>
      )}

      {/* ═══ MANUAL MODE ═══ */}
      {mode === "MANUAL" && !selectedItem && (
        <div className="flex flex-col gap-3 animate-in">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome ou código da publicação..."
                className="input w-full"
                style={{ paddingLeft: "36px" }}
                autoFocus
              />
            </div>
            <button type="submit" disabled={isPending} className="btn btn-primary btn-sm" style={{ height: "42px", paddingInline: "16px" }}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
            </button>
          </form>

          {/* Results */}
          {hasSearched && searchResults.length === 0 && (
            <div className="card p-6 text-center">
              <p className="text-sm m-0" style={{ color: "var(--text-muted)" }}>Nenhuma publicação encontrada.</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setManualQty(1); setError("") }}
                  className="card p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform border-none text-left"
                  style={{ background: "var(--surface-card)" }}
                >
                  <ItemImage src={item.imageUrl} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} width={40} height={54} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold m-0 truncate" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                    <p className="text-xs m-0" style={{ color: "var(--text-muted)" }}>{item.pubCode}-{item.langCode} · {item.categoryTags}</p>
                  </div>
                  <Plus className="w-5 h-5 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANUAL — item selected, set quantity */}
      {mode === "MANUAL" && selectedItem && (
        <div className="card p-4 flex flex-col gap-4 animate-in">
          <div className="flex items-center gap-3">
            <ItemImage src={selectedItem.imageUrl} alt={selectedItem.title} pubCode={selectedItem.pubCode} langCode={selectedItem.langCode} width={56} height={76} />
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold m-0" style={{ color: "var(--text-primary)" }}>{selectedItem.title}</p>
              <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{selectedItem.pubCode}-{selectedItem.langCode}</p>
            </div>
          </div>

          {/* Quantity selector */}
          <div>
            <label className="section-label mb-2 block">Quantidade recebida</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setManualQty((q) => Math.max(1, q - 1))}
                className="w-11 h-11 rounded-lg flex items-center justify-center border-none cursor-pointer"
                style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }}
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                value={manualQty}
                onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="input text-center font-bold text-lg"
                style={{ width: "100px" }}
              />
              <button
                type="button"
                onClick={() => setManualQty((q) => q + 1)}
                className="w-11 h-11 rounded-lg flex items-center justify-center border-none cursor-pointer"
                style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && <div className="alert-warn text-sm">{error}</div>}

          <button
            onClick={handleManualConfirm}
            disabled={isPending}
            className="btn w-full font-bold"
            style={{ height: "48px", borderRadius: "10px", background: "var(--color-success, #059669)", color: "white", fontSize: "16px" }}
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {isPending ? "Registrando..." : `Dar entrada de ${manualQty} unidade${manualQty > 1 ? "s" : ""}`}
          </button>
          <button
            onClick={() => { setSelectedItem(null); setError("") }}
            disabled={isPending}
            className="btn btn-outline w-full text-sm"
            style={{ height: "40px", borderRadius: "10px" }}
          >
            Escolher outra publicação
          </button>
        </div>
      )}

      {/* SUCCESS (manual mode) */}
      {mode === "MANUAL" && scanState === "SUCCESS" && (
        <div className="card p-6 flex flex-col items-center gap-3 animate-in text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-success, #059669) 15%, transparent)" }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: "var(--color-success, #059669)" }} />
          </div>
          <p className="text-lg font-black m-0" style={{ color: "var(--text-primary)" }}>{successMessage}</p>
          <button onClick={goToChoose} className="btn btn-primary btn-sm mt-1">Voltar</button>
        </div>
      )}

      {/* ═══ HISTORY ═══ */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label m-0">Histórico recente</h3>
          {history.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: "color-mix(in srgb, var(--color-success, #059669) 5%, transparent)" }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-success, #059669)" }} />
              <div className="flex-1 min-w-0">
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{entry.label}</span>
                <span className="mx-1.5" style={{ color: "var(--text-muted)" }}>·</span>
                <span style={{ color: "var(--text-secondary)" }}>{entry.items}</span>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{entry.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
