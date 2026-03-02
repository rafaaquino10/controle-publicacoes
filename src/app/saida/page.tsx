"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { ArrowUpRight, Search, CheckCircle2, Package, Users, MapPin } from "lucide-react"
import { searchItems } from "@/actions/item.actions"
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

type DestinationType = "PUBLICADORES" | "GRUPO_CAMPO" | "MOSTRUARIO"

export default function SaidaPage() {
  const { data: session } = useSession()
  const user = session?.user as any

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

  useEffect(() => {
    if (user?.congregationId) {
      getLocations(user.congregationId).then((locs) => setLocations(locs as LocationResult[]))
    }
  }, [user?.congregationId])

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
        MOSTRUARIO: "TRANSFER_DISPLAY",
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
    { value: "PUBLICADORES", label: "Publicadores",   icon: Users,  color: "var(--color-primary)" },
    { value: "GRUPO_CAMPO",  label: "Grupo de Campo", icon: MapPin, color: "#d97706" },
    { value: "MOSTRUARIO",   label: "Mostruário",     icon: Package, color: "#059669" },
  ]

  return (
    <div className="animate-in flex flex-col gap-5">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <ArrowUpRight className="w-6 h-6" style={{ color: "var(--color-error)" }} />
          Registro de Saída
        </h2>
        <p className="page-subtitle">Retire publicações do estoque.</p>
      </div>

      {/* Sucesso */}
      {success && (
        <div className="card p-8 text-center animate-in" style={{ borderColor: "var(--color-success)" }}>
          <CheckCircle2 className="w-14 h-14 mx-auto mb-3" style={{ color: "var(--color-success)" }} />
          <p className="font-bold text-lg m-0" style={{ color: "var(--color-success)" }}>
            Saída registrada!
          </p>
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
              className="input pl-10"
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
                <div className="grid grid-cols-3 gap-2">
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
