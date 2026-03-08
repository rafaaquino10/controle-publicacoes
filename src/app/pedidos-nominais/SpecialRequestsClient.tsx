"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { createSpecialRequest, updateSpecialRequestStatus, deleteSpecialRequest } from "@/actions/special-request.actions"
import { Plus, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react"
import ItemImage from "@/components/ItemImage"
import { Card, Button, Badge, EmptyState } from "@/components/ui"
import { cn } from "@/lib/cn"

type RequestItem = { id: string; title: string; pubCode: string; quantity: number }
type Request = {
  id: string
  personName: string
  status: string
  notes: string | null
  createdAt: string
  registeredBy: string
  items: RequestItem[]
}
type ItemOption = { id: string; title: string; pubCode: string; category: string; langCode: string }

const STATUS_LABEL: Record<string, { text: string; variant: "amber" | "primary" | "green" }> = {
  PENDING: { text: "Pendente", variant: "amber" },
  ORDERED: { text: "Pedido feito", variant: "primary" },
  DELIVERED: { text: "Entregue", variant: "green" },
}

export default function SpecialRequestsClient({
  requests, items, congId,
}: {
  requests: Request[]; items: ItemOption[]; congId: string
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter)

  return (
    <>
      {/* Filter pills + new button */}
      <div className="flex gap-1.5 items-center flex-wrap">
        {["all", "PENDING", "ORDERED", "DELIVERED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer whitespace-nowrap transition-colors duration-150",
              filter === f
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-color)]"
            )}
          >
            {f === "all" ? `Todos (${requests.length})` : `${STATUS_LABEL[f].text} (${requests.filter((r) => r.status === f).length})`}
          </button>
        ))}
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          icon={<Plus size={16} />}
          className="ml-auto"
        >
          Novo Pedido
        </Button>
      </div>

      {/* Request list */}
      <div className="flex flex-col gap-2 pb-4">
        {filtered.map((req) => {
          const expanded = expandedId === req.id
          const st = STATUS_LABEL[req.status] || STATUS_LABEL.PENDING
          return (
            <Card key={req.id} variant="elevated" className="overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : req.id)}
                className="w-full px-4 py-3 border-none cursor-pointer bg-transparent flex items-center gap-2.5 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-[var(--text-primary)]">{req.personName}</span>
                    <Badge variant={st.variant}>{st.text}</Badge>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] m-0 mt-1">
                    {new Date(req.createdAt).toLocaleDateString("pt-BR")} · {req.items.length} item(ns) · por {req.registeredBy}
                  </p>
                </div>
                {expanded
                  ? <ChevronUp size={18} className="text-[var(--text-muted)] flex-shrink-0" />
                  : <ChevronDown size={18} className="text-[var(--text-muted)] flex-shrink-0" />
                }
              </button>
              {expanded && (
                <div className="px-4 pb-4 border-t border-[var(--border-color)]">
                  <div className="flex flex-col gap-1.5 mt-2.5">
                    {req.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-[13px] text-[var(--text-primary)]">
                        <span>{it.title}</span>
                        <span className="font-semibold flex-shrink-0 ml-2">{"\u00d7"}{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {req.notes && (
                    <p className="text-[12px] text-[var(--text-muted)] m-0 mt-2 italic">{req.notes}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {req.status === "PENDING" && (
                      <Button
                        size="sm"
                        onClick={async () => { await updateSpecialRequestStatus(req.id, "ORDERED"); router.refresh() }}
                      >
                        Marcar como Pedido
                      </Button>
                    )}
                    {req.status === "ORDERED" && (
                      <Button
                        size="sm"
                        onClick={async () => { await updateSpecialRequestStatus(req.id, "DELIVERED"); router.refresh() }}
                      >
                        Marcar como Entregue
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      className="text-[var(--color-error)] border-[var(--color-error)]/30"
                      onClick={async () => { if (confirm("Excluir este pedido?")) { await deleteSpecialRequest(req.id); router.refresh() } }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <Card variant="elevated">
            <EmptyState
              icon={<Search size={28} />}
              title="Nenhum pedido nominal"
              description="Crie um novo pedido para um publicador."
            />
          </Card>
        )}
      </div>

      {showForm && (
        <NewRequestModal items={items} congId={congId} onClose={() => { setShowForm(false); router.refresh() }} />
      )}
    </>
  )
}

function NewRequestModal({ items, congId, onClose }: { items: ItemOption[]; congId: string; onClose: () => void }) {
  const [personName, setPersonName] = useState("")
  const [notes, setNotes] = useState("")
  const [selected, setSelected] = useState<{ itemId: string; quantity: number }[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)

  function normalize(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  }

  const filteredItems = searchQuery.trim()
    ? items.filter((i) => {
        const q = normalize(searchQuery)
        return normalize(i.title).includes(q) || normalize(i.pubCode).includes(q)
      })
    : items

  function addItem(itemId: string) {
    if (selected.find((s) => s.itemId === itemId)) return
    setSelected([...selected, { itemId, quantity: 1 }])
    setSearchQuery("")
  }

  function removeItem(itemId: string) {
    setSelected(selected.filter((s) => s.itemId !== itemId))
  }

  function updateQty(itemId: string, qty: number) {
    setSelected(selected.map((s) => s.itemId === itemId ? { ...s, quantity: Math.max(1, qty) } : s))
  }

  async function handleSubmit() {
    if (!personName.trim() || selected.length === 0) return
    setSaving(true)
    await createSpecialRequest({ personName: personName.trim(), congregationId: congId, items: selected, notes: notes.trim() || undefined })
    onClose()
  }

  const available = searchQuery.trim()
    ? filteredItems.filter((i) => !selected.find((s) => s.itemId === i.id))
    : []

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[var(--surface-card)] rounded-2xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-bold m-0 text-[var(--text-primary)]">Novo Pedido Nominal</h3>

        <div>
          <label className="text-[12px] font-semibold text-[var(--text-muted)] block mb-1">Nome do publicador</label>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Ex: João Silva"
            className="input"
          />
        </div>

        <div className="relative z-10">
          <label className="text-[12px] font-semibold text-[var(--text-muted)] block mb-1">Adicionar publicação</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="input pl-10"
            />
          </div>
          {available.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-[200px] overflow-y-auto border border-[var(--border-color)] rounded-[10px] bg-[var(--surface-card)] shadow-lg">
              {available.slice(0, 20).map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item.id)}
                  className={cn(
                    "w-full px-3 py-2 border-none bg-transparent cursor-pointer text-left flex items-center gap-2.5",
                    "active:bg-[var(--surface-bg)]",
                    i < Math.min(available.length, 20) - 1 && "border-b border-[var(--border-color)]"
                  )}
                >
                  <ItemImage src={null} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} width={28} height={38} />
                  <span className="text-[13px] text-[var(--text-primary)] truncate flex-1 min-w-0">{item.title}</span>
                  <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 ml-2">{item.pubCode}</span>
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && available.length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 border border-[var(--border-color)] rounded-[10px] bg-[var(--surface-card)] shadow-lg">
              <p className="p-3 text-[13px] text-[var(--text-muted)] m-0">Nenhum item encontrado.</p>
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div>
            <label className="text-[12px] font-semibold text-[var(--text-muted)] block mb-1.5">
              Publicações ({selected.length})
            </label>
            <div className="flex flex-col gap-1.5">
              {selected.map((s) => {
                const item = items.find((i) => i.id === s.itemId)!
                return (
                  <div key={s.itemId} className="flex items-center gap-2.5 px-2.5 py-2 bg-[var(--surface-bg)] rounded-lg border border-[var(--border-color)]">
                    <ItemImage src={null} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} width={32} height={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold m-0 text-[var(--text-primary)] truncate">{item.title}</p>
                      <span className="text-[10px] text-[var(--text-muted)]">{item.pubCode}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(s.itemId, s.quantity - 1)}
                        className="w-7 h-7 rounded-md border border-[var(--border-color)] bg-[var(--surface-card)] cursor-pointer text-[16px] font-bold text-[var(--text-primary)] flex items-center justify-center"
                      >{"\u2212"}</button>
                      <span className="text-[14px] font-bold min-w-[20px] text-center text-[var(--text-primary)] tabular-nums">{s.quantity}</span>
                      <button
                        onClick={() => updateQty(s.itemId, s.quantity + 1)}
                        className="w-7 h-7 rounded-md border border-[var(--border-color)] bg-[var(--surface-card)] cursor-pointer text-[16px] font-bold text-[var(--text-primary)] flex items-center justify-center"
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeItem(s.itemId)}
                      className="bg-transparent border-none cursor-pointer text-[var(--color-error)] p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-[12px] font-semibold text-[var(--text-muted)] block mb-1">
            Observações (opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Precisa urgente, presente de batismo..."
            className="input"
          />
        </div>

        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!personName.trim() || selected.length === 0 || saving}
            loading={saving}
            fullWidth
          >
            Registrar Pedido
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
