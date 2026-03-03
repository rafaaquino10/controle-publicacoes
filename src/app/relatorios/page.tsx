"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { FileText, CheckCircle2, Clock, AlertTriangle, Lock, Download } from "lucide-react"
import { createMonthlyReport, finalizeReport, getReports } from "@/actions/report.actions"
import { getClosingReportByLanguage } from "@/actions/analytics.actions"

type ReportRow = {
  id: string
  period: string
  langCode: string
  status: "DRAFT" | "FINAL"
  createdAt: Date
  generatedBy: { name: string | null }
}

type InventoryRow = {
  id: string
  currentQuantity: number
  averageMonthlyConsumption: number
  item: { title: string; pubCode: string; format: string }
  location: { name: string; labelCode: string | null } | null
}

export default function RelatoriosPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const congregationId = user?.congregationId

  const [reports, setReports] = useState<ReportRow[]>([])
  const [previewData, setPreviewData] = useState<InventoryRow[]>([])
  const [selectedLang, setSelectedLang] = useState("T")
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [hasPendingOrders, setHasPendingOrders] = useState(false)

  useEffect(() => {
    if (congregationId) {
      loadReports()
      loadPreview()
    }
  }, [congregationId, selectedLang])

  async function loadReports() {
    if (!congregationId) return
    const data = await getReports(congregationId)
    setReports(data as ReportRow[])
  }

  async function loadPreview() {
    if (!congregationId) return
    const data = await getClosingReportByLanguage(congregationId, selectedLang)
    setPreviewData(data as InventoryRow[])
  }

  function handleGenerate() {
    if (!congregationId || !user?.id) return
    setMessage("")
    startTransition(async () => {
      const result = await createMonthlyReport({
        period: selectedPeriod,
        congregationId,
        langCode: selectedLang,
        generatedById: user.id,
      })
      if (result.success) {
        setMessage("Rascunho gerado com sucesso!")
        setHasPendingOrders(result.hasPendingOrders || false)
        await loadReports()
      } else {
        setMessage(result.error || "Erro ao gerar relatório.")
      }
    })
  }

  function handleFinalize(reportId: string) {
    startTransition(async () => {
      const result = await finalizeReport(reportId)
      if (result.success) {
        setMessage("Relatório finalizado!")
        await loadReports()
      } else {
        setMessage(result.error || "Erro ao finalizar.")
      }
    })
  }

  function copyToClipboard() {
    const text = previewData
      .map((inv) => `${inv.item.pubCode}\t${inv.item.title}\t${inv.currentQuantity}`)
      .join("\n")
    navigator.clipboard.writeText(text)
    setMessage("Dados copiados para a área de transferência!")
    setTimeout(() => setMessage(""), 2000)
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      <div>
        <h2 className="page-title">Relatórios</h2>
        <p className="page-subtitle">Inventário mensal para Betel — prazo até dia 10.</p>
      </div>

      {/* Controles */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input input-sm"
          />
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="select"
            style={{ height: 38 }}
          >
            <option value="T">Português (T)</option>
            <option value="E">Inglês (E)</option>
          </select>
          <button onClick={handleGenerate} disabled={isPending} className="btn btn-primary btn-sm">
            {isPending ? "Gerando..." : "Gerar Draft"}
          </button>
        </div>

        {hasPendingOrders && (
          <div className="alert-warn">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Há remessas pendentes. Finalize o recebimento antes de fechar o inventário.</span>
          </div>
        )}

        {message && (
          <p
            className="text-sm font-semibold m-0"
            style={{ color: message.includes("Erro") || message.includes("remessa") ? "var(--color-error)" : "var(--color-success)" }}
          >
            {message}
          </p>
        )}
      </div>

      {/* Preview do Inventário */}
      {previewData.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="section-label">
              Inventário Atual — {selectedLang === "T" ? "Português" : "Inglês"} ({previewData.length} itens)
            </span>
            <button onClick={copyToClipboard} className="btn btn-outline btn-xs">
              <Download className="w-3 h-3" /> Copiar
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {previewData.map((inv) => {
              const shouldOrder = inv.currentQuantity <= inv.averageMonthlyConsumption && inv.averageMonthlyConsumption > 0
              const suggestion = shouldOrder
                ? Math.max(1, Math.ceil(inv.averageMonthlyConsumption * 1.5) - inv.currentQuantity)
                : 0

              return (
                <div
                  key={inv.id}
                  className={`card p-3 ${shouldOrder ? "border-l-4 border-l-primary" : "opacity-70"}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm m-0 truncate" style={{ color: "var(--text-primary)" }}>{inv.item.title}</p>
                      <div className="flex gap-2 mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span>{inv.item.pubCode}</span>
                        {inv.item.format !== "NORMAL" && <span>({inv.item.format})</span>}
                        {inv.location?.labelCode && <span>@ {inv.location.labelCode}</span>}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <span className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{inv.currentQuantity}</span>
                      {shouldOrder && (
                        <p className="text-[10px] text-primary font-bold m-0">Pedir +{suggestion}</p>
                      )}
                    </div>
                  </div>
                  {inv.averageMonthlyConsumption > 0 && (
                    <p className="text-[10px] mt-1.5 m-0" style={{ color: "var(--text-muted)" }}>
                      Média: {inv.averageMonthlyConsumption}/mês
                      {shouldOrder && " — Sugestão baseada em 1.5x da média"}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Histórico de Relatórios */}
      {reports.length > 0 && (
        <div>
          <span className="section-label mb-3 block">Histórico ({reports.length})</span>
          <div className="flex flex-col gap-2">
            {reports.map((report) => (
              <div key={report.id} className="card p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm m-0" style={{ color: "var(--text-primary)" }}>
                    {report.period} — {report.langCode}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Por {report.generatedBy?.name || "—"} em {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {report.status === "DRAFT" ? (
                    <>
                      <span className="badge badge-amber flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Rascunho
                      </span>
                      {user?.role === "SS" && (
                        <button
                          onClick={() => handleFinalize(report.id)}
                          disabled={isPending}
                          className="btn btn-sm flex items-center gap-1"
                          style={{ height: 28, fontSize: 11, background: "var(--color-success)", color: "white" }}
                        >
                          <Lock className="w-3 h-3" /> Finalizar
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="badge badge-green flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Final
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
