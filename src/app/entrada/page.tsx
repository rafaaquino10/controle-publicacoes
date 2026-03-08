"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import LabelScanner from "@/components/LabelScanner"
import type { LabelData } from "@/lib/label-ocr"
import ItemImage from "@/components/ItemImage"
import { Card, Button, Alert } from "@/components/ui"
import { cn } from "@/lib/cn"
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

  const handleLabelResult = useCallback((data: LabelData) => {
    setError("")
    if (data.confidence === "none") {
      setError("Não foi possível ler a etiqueta. Tente novamente ou preencha manualmente.")
      return
    }
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

  return (
    <div className="animate-in flex flex-col gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        {mode !== "CHOOSE" && (
          <button
            onClick={goToChoose}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-[10px] border-none cursor-pointer",
              "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            )}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)]">
            Registro de Entrada
          </h1>
          <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">
            {mode === "CHOOSE" && "Como deseja registrar?"}
            {mode === "SCAN" && scanState === "SCANNING" && "Aponte para a etiqueta da caixa"}
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
          <button onClick={enterScanMode} className="bg-transparent border-none p-0 cursor-pointer">
            <Card variant="interactive" className="p-6 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                <ScanLine size={28} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold m-0 text-[var(--text-primary)]">Escanear</p>
                <p className="text-[12px] m-0 mt-1 text-[var(--text-muted)]">Ler etiqueta da caixa</p>
              </div>
            </Card>
          </button>

          <button onClick={enterManualMode} className="bg-transparent border-none p-0 cursor-pointer">
            <Card variant="interactive" className="p-6 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                <PenLine size={28} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold m-0 text-[var(--text-primary)]">Manual</p>
                <p className="text-[12px] m-0 mt-1 text-[var(--text-muted)]">Buscar e adicionar</p>
              </div>
            </Card>
          </button>
        </div>
      )}

      {/* ═══ SCAN MODE — SCANNING ═══ */}
      {mode === "SCAN" && scanState === "SCANNING" && (
        <>
          <LabelScanner onResult={handleLabelResult} active={scannerActive} />
          {error && (
            <Card variant="elevated" className="p-4 flex flex-col items-center gap-3 animate-in text-center">
              <AlertTriangle size={24} className="text-[var(--color-warn)]" />
              <p className="text-[14px] m-0 text-[var(--text-secondary)]">{error}</p>
              <Button
                variant="outline"
                size="sm"
                icon={<PenLine size={16} />}
                onClick={() => { setScannerActive(false); setScannedNumber(""); setScanState("QUICK_ENTRY"); setError("") }}
              >
                Preencher manualmente
              </Button>
            </Card>
          )}
          {isPending && (
            <Card variant="elevated" className="p-6 flex flex-col items-center gap-3 animate-in">
              <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
              <p className="text-[14px] font-medium m-0 text-[var(--text-secondary)]">Buscando remessa...</p>
            </Card>
          )}
        </>
      )}

      {/* CONFIRM */}
      {mode === "SCAN" && scanState === "CONFIRM" && order && selectedBox && (
        <Card variant="elevated" className="overflow-hidden animate-in p-0">
          <div className="px-4 py-3 flex items-center gap-2 bg-[var(--color-primary)]/8">
            <Package size={20} className="text-[var(--color-primary)]" />
            <div>
              <p className="text-[14px] font-bold m-0 text-[var(--text-primary)]">Envio {order.shipmentNumber}</p>
              <p className="text-[12px] m-0 text-[var(--text-muted)]">{selectedBox.boxNumber}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            {selectedBox.items.map((oi) => (
              <div key={oi.id} className="flex items-center gap-3">
                <ItemImage src={oi.item.imageUrl} alt={oi.item.title} pubCode={oi.item.pubCode} langCode={oi.item.langCode} width={48} height={64} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold m-0 truncate text-[var(--text-primary)]">{oi.item.title}</p>
                  <p className="text-[12px] m-0 text-[var(--text-muted)]">{oi.item.pubCode}-{oi.item.langCode}</p>
                  <p className="text-[14px] font-black m-0 mt-0.5 text-[var(--color-primary)]">Quantidade: {oi.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          {order.boxes.filter((b) => !b.isReceived).length > 1 && (
            <div className="px-4 pb-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Selecionar caixa:</label>
              <select
                value={selectedBox.id}
                onChange={(e) => { const box = order.boxes.find((b) => b.id === e.target.value); if (box) setSelectedBox(box) }}
                className="select w-full"
              >
                {order.boxes.filter((b) => !b.isReceived).map((b) => (
                  <option key={b.id} value={b.id}>{b.boxNumber}</option>
                ))}
              </select>
            </div>
          )}
          {error && <div className="px-4 pb-3"><Alert variant="warning">{error}</Alert></div>}
          <div className="px-4 pb-4 flex flex-col gap-2">
            <Button
              onClick={handleConfirmReceive}
              disabled={isPending}
              loading={isPending}
              fullWidth
              size="lg"
              icon={!isPending ? <CheckCircle2 size={20} /> : undefined}
              className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90"
            >
              {isPending ? "Registrando..." : "Confirmar Entrada"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setScanState("SCANNING"); setScannerActive(true); setError("") }}
              disabled={isPending}
              fullWidth
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* CONFIRM — all boxes received */}
      {mode === "SCAN" && scanState === "CONFIRM" && order && !selectedBox && (
        <Card variant="elevated" className="p-6 flex flex-col items-center gap-3 animate-in text-center">
          <CheckCircle2 size={48} className="text-[var(--color-success)]" />
          <p className="text-[14px] font-bold m-0 text-[var(--text-primary)]">Envio {order.shipmentNumber}</p>
          <p className="text-[14px] m-0 text-[var(--text-muted)]">Todas as caixas já foram recebidas.</p>
          <Button onClick={() => { setScanState("SCANNING"); setScannerActive(true) }} className="mt-2">
            Escanear outra
          </Button>
        </Card>
      )}

      {/* QUICK_ENTRY */}
      {mode === "SCAN" && scanState === "QUICK_ENTRY" && (
        <form onSubmit={handleQuickEntry}>
          <Card variant="elevated" className="p-4 flex flex-col gap-3 animate-in">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={20} className="text-[var(--color-warn)]" />
              <div>
                <p className="text-[14px] font-bold m-0 text-[var(--text-primary)]">Remessa não encontrada</p>
                <p className="text-[12px] m-0 text-[var(--text-muted)]">Código: {scannedNumber}</p>
              </div>
            </div>
            <p className="text-[12px] m-0 text-[var(--text-muted)]">Preencha os dados da etiqueta para registrar direto no estoque.</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Código da publicação</label>
                <input type="text" value={quickPubCode} onChange={(e) => setQuickPubCode(e.target.value)} placeholder="ex: mi26" required className="input" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Idioma</label>
                <select value={quickLangCode} onChange={(e) => setQuickLangCode(e.target.value)} className="select">
                  <option value="T">T (PT)</option>
                  <option value="E">E (EN)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Quantidade</label>
              <input type="number" value={quickQuantity} onChange={(e) => setQuickQuantity(e.target.value)} placeholder="ex: 1440" required min="1" className="input" />
            </div>
            {error && <Alert variant="warning">{error}</Alert>}
            <Button
              type="submit"
              disabled={isPending}
              loading={isPending}
              fullWidth
              size="lg"
              icon={!isPending ? <CheckCircle2 size={20} /> : undefined}
              className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90"
            >
              {isPending ? "Registrando..." : "Registrar Entrada"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setScanState("SCANNING"); setScannerActive(true); setError("") }}
              disabled={isPending}
              fullWidth
            >
              Voltar ao Scanner
            </Button>
          </Card>
        </form>
      )}

      {/* SUCCESS (scan mode) */}
      {mode === "SCAN" && scanState === "SUCCESS" && (
        <Card variant="elevated" className="p-6 flex flex-col items-center gap-3 animate-in text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-success)]/15">
            <CheckCircle2 size={40} className="text-[var(--color-success)]" />
          </div>
          <p className="text-[18px] font-black m-0 text-[var(--text-primary)]">{successMessage}</p>
          <p className="text-[12px] m-0 text-[var(--text-muted)]">Preparando próximo scan...</p>
        </Card>
      )}

      {/* ═══ MANUAL MODE — search ═══ */}
      {mode === "MANUAL" && !selectedItem && (
        <div className="flex flex-col gap-3 animate-in">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome ou código da publicação..."
                className="input w-full pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={isPending} loading={isPending} size="sm" className="h-11">
              Buscar
            </Button>
          </form>

          {hasSearched && searchResults.length === 0 && (
            <Card variant="elevated" className="p-6 text-center">
              <p className="text-[14px] m-0 text-[var(--text-muted)]">Nenhuma publicação encontrada.</p>
            </Card>
          )}

          {searchResults.length > 0 && (
            <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden">
              {searchResults.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setManualQty(1); setError("") }}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 cursor-pointer border-none bg-transparent text-left",
                    "transition-colors duration-100 active:bg-[var(--surface-bg)]",
                    i < searchResults.length - 1 && "border-b border-[var(--border-color)]"
                  )}
                >
                  <ItemImage src={item.imageUrl} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} width={40} height={54} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold m-0 truncate text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-[12px] m-0 text-[var(--text-muted)]">{item.pubCode}-{item.langCode} · {item.categoryTags}</p>
                  </div>
                  <Plus size={20} className="flex-shrink-0 text-[var(--color-primary)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANUAL — item selected */}
      {mode === "MANUAL" && selectedItem && (
        <Card variant="elevated" className="p-4 flex flex-col gap-4 animate-in">
          <div className="flex items-center gap-3">
            <ItemImage src={selectedItem.imageUrl} alt={selectedItem.title} pubCode={selectedItem.pubCode} langCode={selectedItem.langCode} width={56} height={76} />
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold m-0 text-[var(--text-primary)]">{selectedItem.title}</p>
              <p className="text-[12px] m-0 mt-0.5 text-[var(--text-muted)]">{selectedItem.pubCode}-{selectedItem.langCode}</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Quantidade recebida</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setManualQty((q) => Math.max(1, q - 1))}
                className="w-11 h-11 rounded-[10px] flex items-center justify-center border-none cursor-pointer bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                value={manualQty}
                onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="input text-center font-bold text-[18px] w-[100px]"
              />
              <button
                type="button"
                onClick={() => setManualQty((q) => q + 1)}
                className="w-11 h-11 rounded-[10px] flex items-center justify-center border-none cursor-pointer bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {error && <Alert variant="warning">{error}</Alert>}

          <Button
            onClick={handleManualConfirm}
            disabled={isPending}
            loading={isPending}
            fullWidth
            size="lg"
            icon={!isPending ? <CheckCircle2 size={20} /> : undefined}
            className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90"
          >
            {isPending ? "Registrando..." : `Dar entrada de ${manualQty} unidade${manualQty > 1 ? "s" : ""}`}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setSelectedItem(null); setError("") }}
            disabled={isPending}
            fullWidth
          >
            Escolher outra publicação
          </Button>
        </Card>
      )}

      {/* SUCCESS (manual mode) */}
      {mode === "MANUAL" && scanState === "SUCCESS" && (
        <Card variant="elevated" className="p-6 flex flex-col items-center gap-3 animate-in text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-success)]/15">
            <CheckCircle2 size={40} className="text-[var(--color-success)]" />
          </div>
          <p className="text-[18px] font-black m-0 text-[var(--text-primary)]">{successMessage}</p>
          <Button onClick={goToChoose} size="sm" className="mt-1">Voltar</Button>
        </Card>
      )}

      {/* ═══ HISTORY ═══ */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0">Histórico recente</h3>
          <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden">
            {history.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5",
                  i < history.length - 1 && "border-b border-[var(--border-color)]"
                )}
              >
                <CheckCircle2 size={16} className="flex-shrink-0 text-[var(--color-success)]" />
                <div className="flex-1 min-w-0 text-[13px]">
                  <span className="font-bold text-[var(--text-primary)]">{entry.label}</span>
                  <span className="mx-1.5 text-[var(--text-muted)]">·</span>
                  <span className="text-[var(--text-secondary)]">{entry.items}</span>
                </div>
                <span className="text-[12px] flex-shrink-0 text-[var(--text-muted)]">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
