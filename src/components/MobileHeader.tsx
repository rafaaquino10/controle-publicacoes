"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import ThemeToggleCompact from "./ThemeToggleCompact"

const routeTitles: Record<string, string> = {
  "/": "Controle de Publicações",
  "/estoque": "Estoque",
  "/entrada": "Entrada",
  "/saida": "Saída",
  "/remessas": "Remessas",
  "/catalogo": "Catálogo",
  "/pedidos-nominais": "Pedidos Nominais",
  "/pedidos": "Pedidos",
  "/relatorios": "Relatório",
  "/configuracoes": "Configurações",
  "/configuracoes/locais": "Localizações",
  "/configuracoes/usuarios": "Usuários",
}

const backRoutes: Record<string, string> = {
  "/configuracoes/locais": "/configuracoes",
  "/configuracoes/usuarios": "/configuracoes",
}

export default function MobileHeader({
  isSS,
  userName,
  userImage,
}: {
  isSS: boolean
  userName?: string
  userImage?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Determine title — check exact match first, then pattern matches
  let title = routeTitles[pathname] || "Controle de Publicações"
  let backHref: string | null = null

  // Detail pages
  if (pathname.startsWith("/estoque/")) {
    title = "Detalhe"
    backHref = "/estoque"
  } else if (pathname.startsWith("/remessas/")) {
    title = "Remessa"
    backHref = "/remessas"
  } else if (backRoutes[pathname]) {
    backHref = backRoutes[pathname]
  }

  // Congregation indicator for SS
  const congParam = searchParams.get("cong")
  const showCongBadge = isSS && congParam

  const isHome = pathname === "/"

  return (
    <header
      className="sticky top-0 z-50 border-b md:hidden"
      style={{
        background: "var(--surface-card)",
        borderColor: "var(--border-color)",
        height: "48px",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        justifyContent: "space-between",
      }}
    >
      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
        {backHref ? (
          <Link
            href={backHref}
            className="no-underline flex items-center gap-1"
            style={{ color: "var(--color-primary)", flexShrink: 0 }}
          >
            <ArrowLeft size={18} />
          </Link>
        ) : null}
        {isHome ? (
          <Link href="/" className="no-underline">
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
              Controle de Publicações
            </span>
          </Link>
        ) : (
          <span
            style={{
              fontWeight: 700,
              fontSize: "15px",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
        )}
        {showCongBadge && (
          <span className="badge badge-amber" style={{ fontSize: "9px", padding: "2px 6px" }}>
            {congParam}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggleCompact />
        {isSS && <span className="badge badge-navy">SS</span>}
        {userImage ? (
          <img
            src={userImage}
            alt="Perfil"
            className="w-8 h-8 rounded-full object-cover"
            style={{ border: "1px solid var(--border-color)" }}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "var(--color-primary)" }}
          >
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
      </div>
    </header>
  )
}
