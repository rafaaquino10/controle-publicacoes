"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { useSession } from "next-auth/react"
import { Search, Plus, Upload, BookOpen, Tag, X } from "lucide-react"
import { getAllItems, createNewItem, importItemsFromCSV, searchItems } from "@/actions/item.actions"
import ItemImage from "@/components/ItemImage"

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
          <h2 className="page-title">Catálogo</h2>
          <p className="page-subtitle">{items.length} publicações cadastradas</p>
        </div>
        {isSS && (
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm">
              <Upload className="w-4 h-4" /> CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} hidden />
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Novo
            </button>
          </div>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Buscar por código, nome ou categoria..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="input"
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {/* Formulário de Novo Item */}
      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="card p-4 flex flex-col gap-3 animate-in"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>Novo Item</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="bg-transparent border-none cursor-pointer p-1" style={{ color: "var(--text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-label mb-1.5 block" htmlFor="cat-pubcode">Código (pubCode)</label>
              <input
                id="cat-pubcode"
                value={form.pubCode}
                onChange={(e) => setForm({ ...form, pubCode: e.target.value })}
                required
                className="input"
              />
            </div>
            <div>
              <label className="section-label mb-1.5 block">Idioma</label>
              <select value={form.langCode} onChange={(e) => setForm({ ...form, langCode: e.target.value })} className="select">
                <option value="T">Português (T)</option>
                <option value="E">Inglês (E)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="section-label mb-1.5 block" htmlFor="cat-title">Título</label>
            <input
              id="cat-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-label mb-1.5 block" htmlFor="cat-tags">Categoria (tags)</label>
              <input
                id="cat-tags"
                value={form.categoryTags}
                onChange={(e) => setForm({ ...form, categoryTags: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="section-label mb-1.5 block">Formato</label>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="select">
                <option value="NORMAL">Normal</option>
                <option value="LARGE_PRINT">Letra Grande</option>
                <option value="BRAILLE">Braille</option>
              </select>
            </div>
          </div>
          <div className="flex gap-5 text-sm" style={{ color: "var(--text-secondary)" }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isSpecialOrder} onChange={(e) => setForm({ ...form, isSpecialOrder: e.target.checked })} />
              Pedido Especial
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isOrderable} onChange={(e) => setForm({ ...form, isOrderable: e.target.checked })} />
              Pedido Comum
            </label>
          </div>
          <button type="submit" disabled={isPending} className="btn btn-primary">
            {isPending ? "Salvando..." : "Cadastrar Item"}
          </button>
        </form>
      )}

      {/* Lista de Itens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.id} className="card p-3 flex gap-3 items-center">
            <ItemImage src={item.imageUrl} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-snug m-0 truncate" style={{ color: "var(--text-primary)" }}>{item.title}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="badge badge-slate">{item.pubCode}</span>
                <span className="badge badge-slate">{item.langCode}</span>
                {item.format !== "NORMAL" && (
                  <span className="badge badge-navy">{formatLabels[item.format] || item.format}</span>
                )}
                {item.isSpecialOrder && (
                  <span className="badge badge-amber">Especial</span>
                )}
                <span className="badge badge-green">
                  <Tag className="w-3 h-3" /> {item.categoryTags}
                </span>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="card empty-state">
            <BookOpen className="w-12 h-12" />
            <p>Nenhum item encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
