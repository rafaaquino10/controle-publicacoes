import { auth } from "@/lib/auth"
import { getDashboardAlerts, getPendingShipmentsCount } from "@/actions/analytics.actions"
import Link from "next/link"
import { Suspense } from "react"
import CongregationSelector from "@/components/CongregationSelector"

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ cong?: string }> }) {
  const session = await auth()
  const user = session?.user as any
  const userRole = user?.role || "SERVO"
  const defaultCongId = user?.congregationId || "vila-yara-id"
  const params = await searchParams
  const congId = (userRole === "SS" && params.cong) ? params.cong : defaultCongId

  const [{ stockOut, runningLow }, pendingShipments] = await Promise.all([
    getDashboardAlerts(congId),
    getPendingShipmentsCount(congId),
  ])

  return (
    <div className="animate-in flex flex-col gap-5">
      {/* Saudação */}
      <div>
        <h2 className="page-title">Olá, {user?.name?.split(" ")[0] || "Servo"}</h2>
        <p className="page-subtitle">Visão geral do estoque de publicações</p>
      </div>

      {/* Seletor de congregação (SS only) */}
      {userRole === "SS" && (
        <Suspense fallback={null}>
          <CongregationSelector defaultCongId={defaultCongId} />
        </Suspense>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard value={stockOut.length} label="Itens Zerados" />
        <SummaryCard value={runningLow.length} label="Estoque Baixo" />
        <SummaryCard value={pendingShipments} label="Remessas Pendentes" />
      </div>

      {/* Tabela de itens que requerem atenção */}
      {(stockOut.length > 0 || runningLow.length > 0) && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-color)" }}>
            <h3 className="section-label m-0">Itens que Requerem Atenção</h3>
          </div>
          <table className="w-full text-sm" style={{ color: "var(--text-primary)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Publicação</th>
                <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Qtd</th>
                <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stockOut.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td className="px-4 py-2">
                    <p className="font-semibold text-xs m-0 truncate max-w-[180px]">{entry.item.title}</p>
                    <p className="text-[10px] m-0" style={{ color: "var(--text-muted)" }}>{entry.item.pubCode}</p>
                  </td>
                  <td className="px-4 py-2 text-right font-bold">{entry.currentQuantity}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="badge badge-red">Zerado</span>
                  </td>
                </tr>
              ))}
              {runningLow.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td className="px-4 py-2">
                    <p className="font-semibold text-xs m-0 truncate max-w-[180px]">{entry.item.title}</p>
                    <p className="text-[10px] m-0" style={{ color: "var(--text-muted)" }}>{entry.item.pubCode}</p>
                  </td>
                  <td className="px-4 py-2 text-right font-bold">{entry.currentQuantity}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="badge badge-amber">Baixo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Painel SS — Inventário Betel */}
      {userRole === "SS" && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold m-0" style={{ color: "var(--text-primary)" }}>Inventário Betel</h3>
            <p className="text-xs mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
              Prazo de envio: dia 10 · {pendingShipments} remessa(s) pendente(s)
            </p>
          </div>
          <Link href="/relatorios" className="no-underline btn btn-primary btn-sm">Gerar</Link>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ value, label, sublabel }: { value: number; label: string; sublabel?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold mb-1 m-0" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sublabel && <p className="text-[10px] mt-1 m-0" style={{ color: "var(--text-muted)" }}>{sublabel}</p>}
    </div>
  )
}
