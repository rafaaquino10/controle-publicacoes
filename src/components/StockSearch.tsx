"use client"

import { useState } from "react"
import { Search, Package } from "lucide-react"
import Link from "next/link"
import ItemImage from "@/components/ItemImage"
import { Input } from "@/components/ui"
import { cn } from "@/lib/cn"

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

  const categories = [...new Set(items.map((i) => i.category))].sort(categorySort)

  function getFiltered() {
    let filtered = items

    if (initialFilter === "zerado") {
      filtered = filtered.filter((i) => i.totalQuantity === 0)
    } else if (initialFilter === "baixo") {
      filtered = filtered.filter((i) => i.totalQuantity > 0 && i.avgConsumption > 0 && i.totalQuantity <= i.avgConsumption)
    }

    if (activeCategory) {
      filtered = filtered.filter((i) => i.category === activeCategory)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(q) || i.pubCode.toLowerCase().includes(q)
      )
    }

    return filtered
  }

  const filtered = getFiltered()

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
      <Input
        icon={<Search size={16} />}
        placeholder="Buscar por nome ou código..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        <PillButton
          active={!activeCategory}
          onClick={() => setActiveCategory(null)}
          label={`Todos (${items.length})`}
        />
        {categories.map((cat) => {
          const count = items.filter((i) => i.category === cat).length
          return (
            <PillButton
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              label={`${cat} (${count})`}
            />
          )
        })}
      </div>

      {/* Grouped items */}
      <div className="flex flex-col gap-5 pb-4">
        {sortedGroups.map(([category, catItems]) => (
          <div key={category}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-2 pl-0.5">
              {category} ({catItems.length})
            </p>
            {(category === "Revistas" || category === "Magazines")
              ? <MagazineSubsections items={catItems} />
              : <ItemList items={catItems} />
            }
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-[var(--surface-card)] rounded-[10px] py-10 flex flex-col items-center gap-2">
            <Package size={40} className="text-[var(--text-muted)]" />
            <p className="text-[14px] text-[var(--text-muted)] m-0">
              {query ? "Nenhum resultado encontrado." : "Nenhuma publicação no estoque."}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function PillButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors duration-150",
        active
          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
          : "bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-color)]"
      )}
    >
      {label}
    </button>
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
    <div className="flex flex-col gap-4">
      {sorted.map(([subName, subItems]) => (
        <div key={subName}>
          <p className="text-[12px] font-bold text-[var(--text-secondary)] m-0 mb-1.5 pl-0.5">
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
    <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden">
      {items.map((item, i) => {
        const isZero = item.totalQuantity === 0
        const isLow = !isZero && item.avgConsumption > 0 && item.totalQuantity <= item.avgConsumption
        const isLast = i === items.length - 1

        return (
          <Link
            key={item.id}
            href={`/estoque/${encodeURIComponent(item.id)}`}
            className={cn(
              "no-underline flex items-center gap-2.5 px-3 py-2.5",
              "transition-colors duration-100 active:bg-[var(--surface-bg)]",
              !isLast && "border-b border-[var(--border-color)]"
            )}
          >
            <ItemImage
              src={item.imageUrl}
              alt={item.title}
              pubCode={item.pubCode}
              langCode={item.langCode}
              width={40}
              height={54}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold m-0 text-[var(--text-primary)] truncate">
                {item.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="badge badge-slate">{item.pubCode}</span>
                <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                  {item.langCode}
                </span>
                {item.isSpecialOrder && <span className="badge badge-amber">Especial</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[18px] font-bold m-0 text-[var(--text-primary)] leading-none tabular-nums">
                {item.totalQuantity}
              </p>
              {isZero && <span className="badge badge-red mt-1 inline-block text-[10px]">Zerado</span>}
              {isLow && <span className="badge badge-amber mt-1 inline-block text-[10px]">Baixo</span>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
