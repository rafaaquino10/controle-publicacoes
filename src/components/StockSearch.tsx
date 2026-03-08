"use client"

import { useState } from "react"
import { Search, Package } from "lucide-react"
import Link from "next/link"
import ItemImage from "@/components/ItemImage"

type StockItem = {
  id: string
  title: string
  pubCode: string
  langCode: string
  imageUrl: string | null
  isSpecialOrder: boolean
  totalQuantity: number
  avgConsumption: number
  category: string
}

// Ordem de exibição das categorias
const CATEGORY_ORDER = [
  "Bíblias", "Bibles",
  "Revistas", "Magazines",
  "Livros",
  "Brochuras", "Brochures",
  "Apostilas",
  "Folhetos",
  "Kit de Ferramentas",
  "Arte",
  "Equipamento",
]

function categorySort(a: string, b: string) {
  const ia = CATEGORY_ORDER.indexOf(a)
  const ib = CATEGORY_ORDER.indexOf(b)
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
}

export default function StockSearch({ items, initialFilter }: { items: StockItem[]; initialFilter: string }) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Todas as categorias presentes
  const categories = [...new Set(items.map((i) => i.category))].sort(categorySort)

  function getFiltered() {
    let filtered = items

    // Status filter from URL
    if (initialFilter === "zerado") {
      filtered = filtered.filter((i) => i.totalQuantity === 0)
    } else if (initialFilter === "baixo") {
      filtered = filtered.filter((i) => i.totalQuantity > 0 && i.avgConsumption > 0 && i.totalQuantity <= i.avgConsumption)
    }

    // Category filter
    if (activeCategory) {
      filtered = filtered.filter((i) => i.category === activeCategory)
    }

    // Search
    if (query.trim()) {
      const q = query.toLowerCase()
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(q) || i.pubCode.toLowerCase().includes(q)
      )
    }

    return filtered
  }

  const filtered = getFiltered()

  // Agrupa por categoria
  const grouped = new Map<string, StockItem[]>()
  for (const item of filtered) {
    const cat = item.category
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(item)
  }
  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => categorySort(a, b))

  return (
    <>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-muted)", pointerEvents: "none" }}
        />
        <input
          type="text"
          placeholder="Buscar por nome ou código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            background: !activeCategory ? "var(--color-primary)" : "var(--surface-card)",
            color: !activeCategory ? "white" : "var(--text-secondary)",
          }}
        >
          Todos ({items.length})
        </button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.category === cat).length
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: isActive ? "var(--color-primary)" : "var(--surface-card)",
                color: isActive ? "white" : "var(--text-secondary)",
              }}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Grouped items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 16 }}>
        {sortedGroups.map(([category, catItems]) => (
          <div key={category}>
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              margin: "0 0 8px",
              paddingLeft: 2,
            }}>
              {category} ({catItems.length})
            </p>
            {(category === "Revistas" || category === "Magazines")
              ? <MagazineSubsections items={catItems} />
              : <ItemList items={catItems} />
            }
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <Package style={{ width: 40, height: 40, margin: "0 auto 8px", color: "var(--text-muted)" }} />
            <p style={{ fontSize: 14, margin: 0, color: "var(--text-muted)" }}>
              {query ? "Nenhum resultado encontrado." : "Nenhuma publicação no estoque."}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

// ── Subsections for magazines ──
function getMagazineGroup(item: StockItem): string {
  const code = item.pubCode.toLowerCase()
  if (code.startsWith("wp")) return "A Sentinela (público)"
  if (code.startsWith("g")) return "Despertai!"
  if (code.startsWith("w")) return "A Sentinela (estudo)"
  return "Outras"
}

const MAG_ORDER = ["A Sentinela (público)", "Despertai!", "A Sentinela (estudo)", "Outras"]

function MagazineSubsections({ items }: { items: StockItem[] }) {
  const subs = new Map<string, StockItem[]>()
  for (const item of items) {
    const group = getMagazineGroup(item)
    if (!subs.has(group)) subs.set(group, [])
    subs.get(group)!.push(item)
  }
  const sorted = [...subs.entries()].sort(([a], [b]) => MAG_ORDER.indexOf(a) - MAG_ORDER.indexOf(b))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sorted.map(([subName, subItems]) => (
        <div key={subName}>
          <p style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-secondary)",
            margin: "0 0 6px",
            paddingLeft: 2,
          }}>
            {subName} ({subItems.length})
          </p>
          <ItemList items={subItems} />
        </div>
      ))}
    </div>
  )
}

// ── Shared item list ──
function ItemList({ items }: { items: StockItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item) => {
        const isZero = item.totalQuantity === 0
        const isLow = !isZero && item.avgConsumption > 0 && item.totalQuantity <= item.avgConsumption

        return (
          <Link
            key={item.id}
            href={`/estoque/${encodeURIComponent(item.id)}`}
            className="no-underline"
          >
            <div className="card-interactive" style={{ padding: "10px 12px", display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
              <ItemImage
                src={item.imageUrl}
                alt={item.title}
                pubCode={item.pubCode}
                langCode={item.langCode}
                width={40}
                height={54}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span className="badge badge-slate">{item.pubCode}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)" }}>
                    {item.langCode}
                  </span>
                  {item.isSpecialOrder && <span className="badge badge-amber">Especial</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)", lineHeight: 1 }}>
                  {item.totalQuantity}
                </p>
                {isZero && <span className="badge badge-red" style={{ marginTop: 4, display: "inline-block" }}>Zerado</span>}
                {isLow && <span className="badge badge-amber" style={{ marginTop: 4, display: "inline-block" }}>Baixo</span>}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
