"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { createSpecialRequest, updateSpecialRequestStatus, deleteSpecialRequest } from "@/actions/special-request.actions"
import { Plus, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react"
import ItemImage from "@/components/ItemImage"

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

const STATUS_LABEL: Record<string, { text: string; badge: string }> = {
  PENDING: { text: "Pendente", badge: "badge-amber" },
  ORDERED: { text: "Pedido feito", badge: "badge-navy" },
  DELIVERED: { text: "Entregue", badge: "badge-green" },
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
      {/* Filtros + botao novo */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "PENDING", "ORDERED", "DELIVERED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: "1px solid var(--border-color)", cursor: "pointer",
              background: filter === f ? "var(--color-primary)" : "var(--surface-card)",
              color: filter === f ? "white" : "var(--text-secondary)",
            }}
          >
            {f === "all" ? `Todos (${requests.length})` : `${STATUS_LABEL[f].text} (${requests.filter((r) => r.status === f).length})`}
          </button>
        ))}
        <button
          onClick={() => setShowForm(true)}
          style={{
            marginLeft: "auto", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "var(--color-primary)", color: "white", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Plus size={16} /> Novo Pedido
        </button>
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 16 }}>
        {filtered.map((req) => {
          const expanded = expandedId === req.id
          const st = STATUS_LABEL[req.status] || STATUS_LABEL.PENDING
          return (
            <div key={req.id} className="card" style={{ overflow: "hidden" }}>
              <button
                onClick={() => setExpandedId(expanded ? null : req.id)}
                style={{
                  width: "100%", padding: "12px 14px", border: "none", cursor: "pointer",
                  background: "transparent", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{req.personName}</span>
                    <span className={`badge ${st.badge}`}>{st.text}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    {new Date(req.createdAt).toLocaleDateString("pt-BR")} · {req.items.length} item(ns) · por {req.registeredBy}
                  </p>
                </div>
                {expanded ? <ChevronUp size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
              </button>
              {expanded && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {req.items.map((it) => (
                      <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-primary)" }}>
                        <span>{it.title}</span>
                        <span style={{ fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{"\u00d7"}{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {req.notes && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0", fontStyle: "italic" }}>
                      {req.notes}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {req.status === "PENDING" && (
                      <button
                        onClick={async () => { await updateSpecialRequestStatus(req.id, "ORDERED"); router.refresh() }}
                        className="btn btn-primary btn-sm"
                      >
                        Marcar como Pedido
                      </button>
                    )}
                    {req.status === "ORDERED" && (
                      <button
                        onClick={async () => { await updateSpecialRequestStatus(req.id, "DELIVERED"); router.refresh() }}
                        className="btn btn-primary btn-sm"
                      >
                        Marcar como Entregue
                      </button>
                    )}
                    <button
                      onClick={async () => { if (confirm("Excluir este pedido?")) { await deleteSpecialRequest(req.id); router.refresh() } }}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: "1px solid var(--border-color)", cursor: "pointer",
                        background: "transparent", color: "var(--color-error)",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, margin: 0, color: "var(--text-muted)" }}>Nenhum pedido nominal encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal novo pedido — via portal no body */}
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
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: "var(--surface-card)", borderRadius: 16, width: "100%", maxWidth: 480,
          maxHeight: "85vh", overflowY: "auto", padding: 20,
          display: "flex", flexDirection: "column", gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Novo Pedido Nominal</h3>

        {/* Nome */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            Nome do publicador
          </label>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Ex: João Silva"
            className="input"
          />
        </div>

        {/* Buscar publicação */}
        <div style={{ position: "relative", zIndex: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            Adicionar publicação
          </label>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="input"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>
          {available.length > 0 && (
            <div style={{
              position: "absolute", left: 0, right: 0, top: "100%",
              maxHeight: 200, overflowY: "auto", border: "1px solid var(--border-color)",
              borderRadius: 8, background: "var(--surface-card)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}>
              {available.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item.id)}
                  style={{
                    width: "100%", padding: "8px 12px", border: "none", borderBottom: "1px solid var(--border-color)",
                    background: "transparent", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <ItemImage src={null} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} width={28} height={38} />
                  <span style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{item.title}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, marginLeft: 8 }}>{item.pubCode}</span>
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && available.length === 0 && (
            <div style={{
              position: "absolute", left: 0, right: 0, top: "100%",
              border: "1px solid var(--border-color)", borderRadius: 8,
              background: "var(--surface-card)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}>
              <p style={{ padding: 12, fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum item encontrado.</p>
            </div>
          )}
        </div>

        {/* Publicações selecionadas */}
        {selected.length > 0 && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Publicações ({selected.length})
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selected.map((s) => {
                const item = items.find((i) => i.id === s.itemId)!
                return (
                  <div key={s.itemId} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    background: "var(--surface-bg)", borderRadius: 8, border: "1px solid var(--border-color)",
                  }}>
                    <ItemImage src={null} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} width={32} height={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </p>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.pubCode}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => updateQty(s.itemId, s.quantity - 1)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--surface-card)", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}
                      >{"\u2212"}</button>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center", color: "var(--text-primary)" }}>{s.quantity}</span>
                      <button
                        onClick={() => updateQty(s.itemId, s.quantity + 1)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--surface-card)", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeItem(s.itemId)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", padding: 4 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Observações */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
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

        {/* Ações */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: "1px solid var(--border-color)", background: "var(--surface-card)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!personName.trim() || selected.length === 0 || saving}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: "none", background: "var(--color-primary)", color: "white",
              cursor: personName.trim() && selected.length > 0 && !saving ? "pointer" : "not-allowed",
              opacity: personName.trim() && selected.length > 0 && !saving ? 1 : 0.5,
            }}
          >
            {saving ? "Salvando..." : "Registrar Pedido"}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
