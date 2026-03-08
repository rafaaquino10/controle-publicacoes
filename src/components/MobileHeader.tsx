"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/cn"

const routeTitles: Record<string, string> = {
  "/": "",
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
  isSS: _isSS,
  userName: _userName,
  userImage: _userImage,
}: {
  isSS: boolean
  userName?: string
  userImage?: string
}) {
  const pathname = usePathname()

  let title = routeTitles[pathname] ?? ""
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

  const isHome = pathname === "/"

  return (
    <header
      className={cn(
        "sticky top-0 z-50 glass-nav border-b border-[var(--border-color)] md:hidden",
        "flex items-center justify-center h-[44px] px-4"
      )}
    >
      {/* Left: back button */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        {backHref && (
          <Link
            href={backHref}
            className="no-underline flex items-center text-[var(--color-primary)]"
          >
            <ArrowLeft size={22} strokeWidth={2.2} />
          </Link>
        )}
      </div>

      {/* Center: title */}
      {isHome ? (
        <span className="text-[17px] font-semibold text-[var(--text-primary)]">
          Publicações
        </span>
      ) : (
        <span className="text-[17px] font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
          {title}
        </span>
      )}
    </header>
  )
}
