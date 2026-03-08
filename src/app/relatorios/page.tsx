"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { FileText, CheckCircle2, Clock, AlertTriangle, Lock, Download } from "lucide-react"
import { createMonthlyReport, finalizeReport, getReports } from "@/actions/report.actions"
import { getClosingReportByLanguage } from "@/actions/analytics.actions"
import { Card, Button, Badge, Alert } from "@/components/ui"
import { cn } from "@/lib/cn"

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
        <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)]">Relatórios</h1>
        <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">Inventário mensal para Betel — prazo até dia 10.</p>
      </div>

      {/* Controls */}
      <Card variant="elevated" className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input"
          />
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="select"
          >
            <option value="T">Português (T)</option>
            <option value="E">Inglês (E)</option>
          </select>
          <Button onClick={handleGenerate} disabled={isPending} loading={isPending} size="sm" className="h-11">
            Gerar Draft
          </Button>
        </div>

        {hasPendingOrders && (
          <Alert variant="warning">
            Há remessas pendentes. Finalize o recebimento antes de fechar o inventário.
          </Alert>
        )}

        {message && (
          <p
            className={cn(
              "text-[14px] font-semibold m-0",
              message.includes("Erro") || message.includes("remessa") ? "text-[var(--color-error)]" : "text-[var(--color-success)]"
            )}
          >
            {message}
          </p>
        )}
      </Card>

      {/* Inventory preview */}
      {previewData.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0">
              Inventário Atual — {selectedLang === "T" ? "Português" : "Inglês"} ({previewData.length} itens)
            </p>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={copyToClipboard}>
              Copiar
            </Button>
          </div>

          <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden">
            {previewData.map((inv, i) => {
              const shouldOrder = inv.currentQuantity <= inv.averageMonthlyConsumption && inv.averageMonthlyConsumption > 0
              const suggestion = shouldOrder
                ? Math.max(1, Math.ceil(inv.averageMonthlyConsumption * 1.5) - inv.currentQuantity)
                : 0
              const isLast = i === previewData.length - 1

              return (
                <div
                  key={inv.id}
                  className={cn(
                    "px-4 py-3",
                    shouldOrder && "border-l-4 border-l-[var(--color-primary)]",
                    !shouldOrder && "opacity-70",
                    !isLast && "border-b border-[var(--border-color)]"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] m-0 truncate text-[var(--text-primary)]">{inv.item.title}</p>
                      <div className="flex gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
                        <span>{inv.item.pubCode}</span>
                        {inv.item.format !== "NORMAL" && <span>({inv.item.format})</span>}
                        {inv.location?.labelCode && <span>@ {inv.location.labelCode}</span>}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <span className="text-[20px] font-black text-[var(--text-primary)] tabular-nums">{inv.currentQuantity}</span>
                      {shouldOrder && (
                        <p className="text-[10px] text-[var(--color-primary)] font-bold m-0">Pedir +{suggestion}</p>
                      )}
                    </div>
                  </div>
                  {inv.averageMonthlyConsumption > 0 && (
                    <p className="text-[10px] mt-1.5 m-0 text-[var(--text-muted)]">
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

      {/* Report history */}
      {reports.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-2">
            Histórico ({reports.length})
          </p>
          <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden">
            {reports.map((report, i) => {
              const isLast = i === reports.length - 1
              return (
                <div
                  key={report.id}
                  className={cn(
                    "px-4 py-3 flex justify-between items-center",
                    !isLast && "border-b border-[var(--border-color)]"
                  )}
                >
                  <div>
                    <p className="font-bold text-[14px] m-0 text-[var(--text-primary)]">
                      {report.period} — {report.langCode}
                    </p>
                    <p className="text-[11px] m-0 mt-0.5 text-[var(--text-muted)]">
                      Por {report.generatedBy?.name || "—"} em {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === "DRAFT" ? (
                      <>
                        <Badge variant="amber"><Clock size={12} /> Rascunho</Badge>
                        {user?.role === "SS" && (
                          <Button
                            size="sm"
                            onClick={() => handleFinalize(report.id)}
                            disabled={isPending}
                            icon={<Lock size={12} />}
                            className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 h-7 text-[11px]"
                          >
                            Finalizar
                          </Button>
                        )}
                      </>
                    ) : (
                      <Badge variant="green"><CheckCircle2 size={12} /> Final</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
