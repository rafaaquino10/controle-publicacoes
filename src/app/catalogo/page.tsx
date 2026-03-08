"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { useSession } from "next-auth/react"
import { Search, Plus, Upload, BookOpen, Tag, X } from "lucide-react"
import { getAllItems, createNewItem, importItemsFromCSV, searchItems } from "@/actions/item.actions"
import ItemImage from "@/components/ItemImage"
import { Card, Button, Badge, EmptyState, Input } from "@/components/ui"
import { cn } from "@/lib/cn"

type ItemRow = {
  id: string
  pubCode: string
  langCode: string
  format: string
  title: string
  categoryTags: string
  isSpecialOrder: boolean
  isOrderable: boolean
  imageUrl: string | null
  defaultLocation: { name: string; labelCode: string | null } | null
}

export default function CatalogoPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isSS = user?.role === "SS"

  const [items, setItems] = useState<ItemRow[]>([])
  const [query, setQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    pubCode: "", langCode: "T", format: "NORMAL", title: "",
    categoryTags: "", isSpecialOrder: false, isOrderable: true,
  })

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const data = await getAllItems()
    setItems(data as ItemRow[])
  }

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.length >= 2) {
      const results = await searchItems(q)
      setItems(results as ItemRow[])
    } else if (q.length === 0) {
      loadItems()
    }
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createNewItem(form)
      setShowAddForm(false)
      setForm({ pubCode: "", langCode: "T", format: "NORMAL", title: "", categoryTags: "", isSpecialOrder: false, isOrderable: true })
      await loadItems()
    })
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split("\n").filter(Boolean)
      const header = lines[0].split(",").map((h) => h.trim())
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim())
        return {
          pubCode: values[header.indexOf("pubCode")] || "",
          langCode: values[header.indexOf("langCode")] || "T",
          format: values[header.indexOf("format")] || "NORMAL",
          title: values[header.indexOf("title")] || "",
          categoryTags: values[header.indexOf("categoryTags")] || "",
          isSpecialOrder: values[header.indexOf("isSpecialOrder")] === "true",
          isOrderable: values[header.indexOf("isOrderable")] !== "false",
        }
      })
      startTransition(async () => {
        const result = await importItemsFromCSV(rows)
        if (result.success) {
          alert(`Importados: ${result.created}, Ignorados (duplicados): ${result.skipped}`)
          await loadItems()
        } else {
          alert(result.error)
        }
      })
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const formatLabels: Record<string, string> = {
    NORMAL: "Normal", LARGE_PRINT: "Letra Grande", BRAILLE: "Braille",
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)]">Catálogo</h1>
          <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">{items.length} publicações cadastradas</p>
        </div>
        {isSS && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>
              CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} hidden />
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setShowAddForm(!showAddForm)}>
              Novo
            </Button>
          </div>
        )}
      </div>

      <Input
        icon={<Search size={16} />}
        placeholder="Buscar por código, nome ou categoria..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {/* Add item form */}
      {showAddForm && (
        <form onSubmit={handleAddItem}>
          <Card variant="elevated" className="p-4 flex flex-col gap-3 animate-in">
            <div className="flex justify-between items-center">
              <h3 className="text-[14px] font-bold m-0 text-[var(--text-primary)]">Novo Item</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="bg-transparent border-none cursor-pointer p-1 text-[var(--text-muted)]">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Código (pubCode)</label>
                <input value={form.pubCode} onChange={(e) => setForm({ ...form, pubCode: e.target.value })} required className="input" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Idioma</label>
                <select value={form.langCode} onChange={(e) => setForm({ ...form, langCode: e.target.value })} className="select">
                  <option value="T">Português (T)</option>
                  <option value="E">Inglês (E)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Título</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Categoria</label>
                <input value={form.categoryTags} onChange={(e) => setForm({ ...form, categoryTags: e.target.value })} className="input" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Formato</label>
                <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="select">
                  <option value="NORMAL">Normal</option>
                  <option value="LARGE_PRINT">Letra Grande</option>
                  <option value="BRAILLE">Braille</option>
                </select>
              </div>
            </div>
            <div className="flex gap-5 text-[14px] text-[var(--text-secondary)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isSpecialOrder} onChange={(e) => setForm({ ...form, isSpecialOrder: e.target.checked })} />
                Pedido Especial
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isOrderable} onChange={(e) => setForm({ ...form, isOrderable: e.target.checked })} />
                Pedido Comum
              </label>
            </div>
            <Button type="submit" disabled={isPending} loading={isPending} fullWidth>
              Cadastrar Item
            </Button>
          </Card>
        </form>
      )}

      {/* Items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item) => (
          <Card key={item.id} variant="elevated" className="p-3 flex gap-3 items-center">
            <ItemImage src={item.imageUrl} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] leading-snug m-0 truncate text-[var(--text-primary)]">{item.title}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="slate">{item.pubCode}</Badge>
                <Badge variant="slate">{item.langCode}</Badge>
                {item.format !== "NORMAL" && (
                  <Badge variant="primary">{formatLabels[item.format] || item.format}</Badge>
                )}
                {item.isSpecialOrder && <Badge variant="amber">Especial</Badge>}
                <Badge variant="green"><Tag size={10} /> {item.categoryTags}</Badge>
              </div>
            </div>
          </Card>
        ))}

        {items.length === 0 && (
          <div className="col-span-full">
            <Card variant="elevated">
              <EmptyState
                icon={<BookOpen size={28} />}
                title="Nenhum item encontrado"
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
