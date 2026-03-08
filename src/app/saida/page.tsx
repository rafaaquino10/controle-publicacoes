"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Search, CheckCircle2, Users, MapPin, ShoppingCart, BookOpen, Clock } from "lucide-react"
import { searchItems, getItemById } from "@/actions/item.actions"
import { getRecentItems, addRecentItem, type RecentItem } from "@/lib/recent-items"
import { getLocations } from "@/actions/location.actions"
import { registerStockOut } from "@/actions/inventory.actions"
import ItemImage from "@/components/ItemImage"
import type { MovementType, SubStockType } from "@/lib/types"

type ItemResult = {
  id: string
  pubCode: string
  langCode: string
  title: string
  imageUrl: string | null
  defaultLocationId: string | null
}

type LocationResult = {
  id: string
  name: string
  labelCode: string | null
  subStockType: SubStockType
}

type DestinationType = "PUBLICADORES" | "GRUPO_CAMPO" | "CARRINHO" | "EXPOSITOR"

export default function SaidaPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const params = useSearchParams()
  const preselectedItemId = params.get("item")

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ItemResult[]>([])
  const [selectedItem, setSelectedItem] = useState<ItemResult | null>(null)
  const [locations, setLocations] = useState<LocationResult[]>([])
  const [fromLocationId, setFromLocationId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [destination, setDestination] = useState<DestinationType>("PUBLICADORES")
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  // Load recent items
  useEffect(() => {
    setRecentItems(getRecentItems())
  }, [])

  // Load locations
  useEffect(() => {
    if (user?.congregationId) {
      getLocations(user.congregationId).then((locs) => setLocations(locs as LocationResult[]))
    }
  }, [user?.congregationId])

  // Pre-select item from query param
  useEffect(() => {
    if (preselectedItemId && !selectedItem) {
      getItemById(preselectedItemId).then((item) => {
        if (item) {
          const mapped: ItemResult = {
            id: item.id,
            pubCode: item.pubCode,
            langCode: item.langCode,
            title: item.title,
            imageUrl: item.imageUrl,
            defaultLocationId: item.defaultLocationId,
          }
          handleSelectItem(mapped)
        }
      })
    }
  }, [preselectedItemId])

  async function handleSearch(q: string) {
    setQuery(q)
    setSelectedItem(null)
    if (q.length >= 2) {
      const items = await searchItems(q)
      setResults(items as ItemResult[])
    } else {
      setResults([])
    }
  }

  function handleSelectItem(item: ItemResult) {
    setSelectedItem(item)
    setResults([])
    setQuery(item.title)
    if (item.defaultLocationId) setFromLocationId(item.defaultLocationId)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem || !user?.id || !user?.congregationId) return

    setError("")
    startTransition(async () => {
      const typeMap: Record<DestinationType, MovementType> = {
        PUBLICADORES: "ISSUE_PUBLISHER",
        GRUPO_CAMPO: "ISSUE_GROUP",
        CARRINHO: "ISSUE_CART",
        EXPOSITOR: "ISSUE_DISPLAY",
      }
      const result = await registerStockOut({
        itemId: selectedItem.id,
        congregationId: user.congregationId,
        userId: user.id,
        locationId: fromLocationId,
        quantity,
        type: typeMap[destination],
      })
      if (result.success) {
        addRecentItem({ id: selectedItem.id, title: selectedItem.title, pubCode: selectedItem.pubCode })
        setRecentItems(getRecentItems())
        setSuccess(true)
        setTimeout(reset, 2000)
      } else {
        setError("error" in result ? result.error : "Erro ao registrar saída.")
      }
    })
  }

  function reset() {
    setSelectedItem(null)
    setQuery("")
    setQuantity(1)
    setSuccess(false)
    setError("")
  }

  const armarios = locations.filter((l) => l.subStockType === "ARMARIO")

  const destOptions: Array<{ value: DestinationType; label: string; icon: typeof Users; color: string }> = [
    { value: "PUBLICADORES", label: "Publicadores",   icon: Users,        color: "var(--color-primary)" },
    { value: "GRUPO_CAMPO",  label: "Grupo de Campo", icon: MapPin,       color: "var(--color-warn)" },
    { value: "CARRINHO",     label: "Carrinho",        icon: ShoppingCart, color: "var(--color-success)" },
    { value: "EXPOSITOR",    label: "Expositor",       icon: BookOpen,     color: "var(--color-info)" },
  ]

  return (
    <div className="animate-in flex flex-col gap-5">
      <div>
        <h2 className="page-title">Registro de Saída</h2>
        <p className="page-subtitle">Retire publicações do estoque.</p>
      </div>

      {/* Sucesso */}
      {success && (
        <div className="card p-6 text-center animate-in" style={{ background: "color-mix(in srgb, var(--color-success) 5%, var(--surface-card))", borderColor: "var(--color-success)" }}>
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--color-success)" }} />
          <p className="font-bold text-base m-0" style={{ color: "var(--color-success)" }}>Saída registrada!</p>
        </div>
      )}

      {/* Recentes */}
      {!success && recentItems.length > 0 && !selectedItem && (
        <div>
          <p className="flex items-center gap-1.5 m-0 mb-2" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
            <Clock size={12} /> Recentes
          </p>
          <div className="flex gap-2 flex-wrap">
            {recentItems.map((ri) => (
              <button
                key={ri.id}
                type="button"
                onClick={() => {
                  getItemById(ri.id).then((item) => {
                    if (item) handleSelectItem(item as ItemResult)
                  })
                }}
                className="border cursor-pointer"
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "var(--surface-card)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-secondary)",
                }}
              >
                {ri.pubCode}
              </button>
            ))}
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Busca de item */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar publicação..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: "2.5rem" }}
            />
            {results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md border shadow-md max-h-52 overflow-auto" style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}>
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="w-full p-3 border-none text-left cursor-pointer flex items-center gap-3 transition-colors"
                    style={{ background: "transparent", borderBottom: "1px solid var(--border-color)" }}
                  >
                    <ItemImage src={item.imageUrl} alt={item.title} pubCode={item.pubCode} langCode={item.langCode} width={30} height={40} />
                    <div>
                      <p className="m-0 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.pubCode} - {item.langCode}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="flex flex-col gap-4 animate-in">
              {/* Item selecionado */}
              <div className="card p-3 flex gap-3 items-center">
                <ItemImage src={selectedItem.imageUrl} alt={selectedItem.title} pubCode={selectedItem.pubCode} langCode={selectedItem.langCode} width={36} height={48} />
                <div>
                  <p className="m-0 font-bold text-sm" style={{ color: "var(--text-primary)" }}>{selectedItem.title}</p>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedItem.pubCode}</span>
                </div>
              </div>

              {/* Local de origem */}
              <div>
                <label className="section-label mb-1.5 block">Local de Origem</label>
                <select
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  required
                  className="select"
                >
                  <option value="">Selecione...</option>
                  {armarios.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.labelCode || loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div>
                <label className="section-label mb-1.5 block" htmlFor="saida-qty">Quantidade</label>
                <input
                  id="saida-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                  className="input text-center text-lg font-bold"
                />
              </div>

              {/* Destino */}
              <div>
                <label className="section-label mb-2 block">Destino</label>
                <div className="grid grid-cols-4 gap-2">
                  {destOptions.map((opt) => {
                    const Icon = opt.icon
                    const selected = destination === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDestination(opt.value)}
                        className="p-3 rounded-md flex flex-col items-center gap-2 cursor-pointer transition-all border"
                        style={{
                          background: selected ? "var(--surface-bg)" : "var(--surface-card)",
                          borderColor: selected ? opt.color : "var(--border-color)",
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: selected ? opt.color : "var(--text-muted)" }} />
                        <span className="text-[10px] font-bold" style={{ color: selected ? opt.color : "var(--text-muted)" }}>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="alert-error m-0">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="btn w-full btn-danger"
              >
                {isPending ? "Processando..." : `Registrar Saída (${quantity})`}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
