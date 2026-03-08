"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { AnimatePresence, motion } from "framer-motion"
import { MapPin, Plus, Trash2, Edit3, X, QrCode } from "lucide-react"
import Breadcrumb from "@/components/Breadcrumb"
import { Card, Button, Badge, EmptyState } from "@/components/ui"
import { cn } from "@/lib/cn"
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

  const subStockBadgeVariant: Record<string, "blue" | "green" | "amber"> = {
    ARMARIO: "blue",
    MOSTRUARIO: "green",
    GRUPO_CAMPO: "amber",
  }

  const subStockIconBg: Record<string, string> = {
    ARMARIO: "bg-[#007aff]/12 text-[#007aff]",
    MOSTRUARIO: "bg-[var(--color-success)]/12 text-[var(--color-success)]",
    GRUPO_CAMPO: "bg-[var(--color-warn)]/12 text-[var(--color-warn)]",
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      <Breadcrumb items={[
        { label: "Configurações", href: "/configuracoes" },
        { label: "Localizações" },
      ]} />
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)] flex items-center gap-2">
            <MapPin size={24} className="text-[var(--color-primary)]" />
            Localizações
          </h1>
          <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">{locations.length} locais cadastrados</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          size="sm"
          icon={<Plus size={16} />}
        >
          Novo
        </Button>
      </div>

      {/* Naming legend */}
      <Card variant="elevated" className="p-4">
        <p className="text-[13px] font-bold m-0 mb-2 text-[var(--text-primary)]">Como ler os códigos</p>
        <p className="text-[12px] m-0 mb-2.5 text-[var(--text-muted)] leading-relaxed">
          Cada local segue o padrão <strong className="text-[var(--text-secondary)]">B_.L_.P_</strong> — Balcão, Lado e Prateleira.
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          {[
            ["B1", "Balcão 1 — da frente (perto do auditório)"],
            ["B2", "Balcão 2 — de trás (perto do palco)"],
            ["LE", "Lado Esquerdo"],
            ["LD", "Lado Direito"],
            ["P1", "Prateleira 1 — de cima (superior)"],
            ["P2", "Prateleira 2 — do meio"],
            ["P3", "Prateleira 3 — de baixo (inferior)"],
            ["Tampo", "Em cima do balcão (exposição livre)"],
          ].map(([code, desc]) => (
            <Fragment key={code}>
              <span className="font-bold text-[var(--color-primary)]">{code}</span>
              <span className="text-[var(--text-muted)]">{desc}</span>
            </Fragment>
          ))}
        </div>
        <div className="mt-2.5 px-2.5 py-2 rounded-lg bg-[var(--color-primary)]/8">
          <p className="text-[12px] m-0 text-[var(--text-secondary)] leading-relaxed">
            <strong>Exemplo:</strong> <span className="font-bold text-[var(--color-primary)]">B1.LE.P3</span> = Balcão da frente, abra a porta esquerda, prateleira de baixo.
          </p>
        </div>
      </Card>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden"
          >
            <Card variant="elevated" className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[14px] font-bold m-0 text-[var(--text-primary)]">
                  {editingId ? "Editar Local" : "Novo Local"}
                </h3>
                <button type="button" onClick={resetForm} className="bg-transparent border-none cursor-pointer p-1 text-[var(--text-muted)]">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Nome</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" placeholder="Nome do local" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Código</label>
                  <input value={form.labelCode} onChange={(e) => setForm({ ...form, labelCode: e.target.value })} className="input" placeholder="ex: B1.LE.P1" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Descrição</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="Descrição opcional" />
              </div>
              <select value={form.subStockType} onChange={(e) => setForm({ ...form, subStockType: e.target.value as SubStockType })} className="select">
                <option value="ARMARIO">Armário</option>
                <option value="MOSTRUARIO">Mostruário</option>
                <option value="GRUPO_CAMPO">Grupo de Campo</option>
              </select>
              <Button type="submit" disabled={isPending} loading={isPending} fullWidth>
                {editingId ? "Atualizar" : "Cadastrar"}
              </Button>
            </Card>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Locations list */}
      <div className="flex flex-col gap-2">
        {locations.map((loc) => {
          const iconStyle = subStockIconBg[loc.subStockType] || subStockIconBg.ARMARIO
          return (
            <Card key={loc.id} variant="elevated" className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconStyle)}>
                  <MapPin size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold m-0 text-[var(--text-primary)]">{loc.name}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {loc.labelCode && <Badge variant="slate">{loc.labelCode}</Badge>}
                    <Badge variant={subStockBadgeVariant[loc.subStockType] || "slate"}>
                      {subStockLabels[loc.subStockType]}
                    </Badge>
                  </div>
                  {loc.description && (
                    <p className="text-[11px] m-0 mt-1 text-[var(--text-muted)]">{loc.description}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {loc.labelCode && (
                    <button onClick={() => generateQRUrl(loc.labelCode!)} title="Gerar QR Code" className="btn-icon">
                      <QrCode size={16} className="text-[var(--color-primary)]" />
                    </button>
                  )}
                  <button onClick={() => handleEdit(loc)} title="Editar" className="btn-icon">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(loc.id)} title="Excluir" className="btn-icon btn-icon-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {loc.imageUrl && (
                <img
                  src={loc.imageUrl}
                  alt={loc.name}
                  className="w-full h-[100px] object-cover border-t border-[var(--border-color)]"
                />
              )}
            </Card>
          )
        })}

        {locations.length === 0 && (
          <Card variant="elevated">
            <EmptyState
              icon={<MapPin size={28} />}
              title="Nenhuma localização"
              description="Cadastre os armários e locais de armazenamento."
            />
          </Card>
        )}
      </div>
    </div>
  )
}

function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
