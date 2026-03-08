"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Plus, Trash2, Edit3, X, QrCode } from "lucide-react"
import Breadcrumb from "@/components/Breadcrumb"
import { getLocations, createLocation, updateLocation, deleteLocation } from "@/actions/location.actions"
import type { SubStockType } from "@/lib/types"

type LocationRow = {
  id: string
  name: string
  description: string | null
  labelCode: string | null
  imageUrl: string | null
  subStockType: SubStockType
  congregationId: string
}

export default function LocaisPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const congregationId = user?.congregationId

  const [locations, setLocations] = useState<LocationRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    labelCode: "",
    subStockType: "ARMARIO" as SubStockType,
  })

  useEffect(() => {
    if (congregationId) loadData()
  }, [congregationId])

  async function loadData() {
    if (!congregationId) return
    const data = await getLocations(congregationId)
    setLocations(data as LocationRow[])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!congregationId) return
    startTransition(async () => {
      if (editingId) {
        await updateLocation(editingId, form)
      } else {
        await createLocation({ ...form, congregationId })
      }
      resetForm()
      await loadData()
    })
  }

  function handleEdit(loc: LocationRow) {
    setEditingId(loc.id)
    setForm({ name: loc.name, description: loc.description || "", labelCode: loc.labelCode || "", subStockType: loc.subStockType })
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm("Remover esta localização?")) return
    startTransition(async () => {
      await deleteLocation(id)
      await loadData()
    })
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: "", description: "", labelCode: "", subStockType: "ARMARIO" })
  }

  function generateQRUrl(labelCode: string) {
    const url = `${window.location.origin}/estoque?local=${labelCode}`
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`, "_blank")
  }

  const subStockLabels: Record<string, string> = {
    ARMARIO: "Armário",
    MOSTRUARIO: "Mostruário",
    GRUPO_CAMPO: "Grupo de Campo",
  }

  const subStockBadge: Record<string, string> = {
    ARMARIO: "badge-blue",
    MOSTRUARIO: "badge-green",
    GRUPO_CAMPO: "badge-amber",
  }

  const subStockIcon: Record<string, { bg: string; fg: string }> = {
    ARMARIO: { bg: "bg-blue-50", fg: "text-blue-500" },
    MOSTRUARIO: { bg: "bg-emerald-50", fg: "text-emerald-500" },
    GRUPO_CAMPO: { bg: "bg-amber-50", fg: "text-amber-500" },
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      <Breadcrumb items={[
        { label: "Configurações", href: "/configuracoes" },
        { label: "Localizações" },
      ]} />
      <div className="flex justify-between items-start">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Localizações
          </h2>
          <p className="page-subtitle">{locations.length} locais cadastrados</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="btn btn-primary btn-sm"
        >
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      {/* Legenda de nomenclatura */}
      <div className="card" style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: "var(--text-primary)" }}>
          Como ler os códigos
        </p>
        <p style={{ fontSize: 12, margin: "0 0 10px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Cada local segue o padrão <strong style={{ color: "var(--text-secondary)" }}>B_.L_.P_</strong> — Balcão, Lado e Prateleira.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>B1</span>
          <span style={{ color: "var(--text-muted)" }}>Balcão 1 — da frente (perto do auditório)</span>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>B2</span>
          <span style={{ color: "var(--text-muted)" }}>Balcão 2 — de trás (perto do palco)</span>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>LE</span>
          <span style={{ color: "var(--text-muted)" }}>Lado Esquerdo</span>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>LD</span>
          <span style={{ color: "var(--text-muted)" }}>Lado Direito</span>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>P1</span>
          <span style={{ color: "var(--text-muted)" }}>Prateleira 1 — de cima (superior)</span>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>P2</span>
          <span style={{ color: "var(--text-muted)" }}>Prateleira 2 — do meio</span>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>P3</span>
          <span style={{ color: "var(--text-muted)" }}>Prateleira 3 — de baixo (inferior)</span>
          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>Tampo</span>
          <span style={{ color: "var(--text-muted)" }}>Em cima do balcão (exposição livre)</span>
        </div>
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
          <p style={{ fontSize: 12, margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            <strong>Exemplo:</strong> <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>B1.LE.P3</span> = Balcão da frente, abra a porta esquerda, prateleira de baixo.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="card p-4 flex flex-col gap-3 overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 m-0">
                {editingId ? "Editar Local" : "Novo Local"}
              </h3>
              <button type="button" onClick={resetForm} className="bg-transparent border-none cursor-pointer p-1">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="float-group">
                <input id="loc-name" placeholder=" " value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input float-input float-sm" />
                <label htmlFor="loc-name" className="float-label float-label-sm">Nome</label>
              </div>
              <div className="float-group">
                <input id="loc-code" placeholder=" " value={form.labelCode} onChange={(e) => setForm({ ...form, labelCode: e.target.value })} className="input float-input float-sm" />
                <label htmlFor="loc-code" className="float-label float-label-sm">Código (ex: ARM-E1)</label>
              </div>
            </div>
            <div className="float-group">
              <input id="loc-desc" placeholder=" " value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input float-input float-sm" />
              <label htmlFor="loc-desc" className="float-label float-label-sm">Descrição</label>
            </div>
            <select value={form.subStockType} onChange={(e) => setForm({ ...form, subStockType: e.target.value as SubStockType })} className="select" style={{ height: 46 }}>
              <option value="ARMARIO">Armário</option>
              <option value="MOSTRUARIO">Mostruário</option>
              <option value="GRUPO_CAMPO">Grupo de Campo</option>
            </select>
            <button type="submit" disabled={isPending} className="btn btn-primary">
              {isPending ? "Salvando..." : editingId ? "Atualizar" : "Cadastrar"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {locations.map((loc) => {
          const iconStyle = subStockIcon[loc.subStockType] || subStockIcon.ARMARIO
          return (
            <div key={loc.id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <div className={`w-10 h-10 rounded-xl ${iconStyle.bg} ${iconStyle.fg} flex items-center justify-center flex-shrink-0`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{loc.name}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {loc.labelCode && (
                      <span className="badge badge-slate">{loc.labelCode}</span>
                    )}
                    <span className={`badge ${subStockBadge[loc.subStockType]}`}>
                      {subStockLabels[loc.subStockType]}
                    </span>
                  </div>
                  {loc.description && (
                    <p style={{ fontSize: 11, margin: "4px 0 0", color: "var(--text-muted)" }}>{loc.description}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {loc.labelCode && (
                    <button onClick={() => generateQRUrl(loc.labelCode!)} title="Gerar QR Code" className="btn-icon">
                      <QrCode className="w-4 h-4 text-primary" />
                    </button>
                  )}
                  <button onClick={() => handleEdit(loc)} title="Editar" className="btn-icon">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(loc.id)} title="Excluir" className="btn-icon btn-icon-danger">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {loc.imageUrl && (
                <img
                  src={loc.imageUrl}
                  alt={loc.name}
                  style={{ width: "100%", height: 100, objectFit: "cover", borderTop: "1px solid var(--border-color)" }}
                />
              )}
            </div>
          )
        })}

        {locations.length === 0 && (
          <div className="card empty-state">
            <MapPin className="w-12 h-12 text-slate-200" />
            <p>Nenhuma localização cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  )
}
