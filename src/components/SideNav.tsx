"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, ScanLine, ArrowUpRight, FileText, Settings } from "lucide-react"

type NavItem = {
  href: string
  icon: typeof Home
  label: string
}

const navItems: NavItem[] = [
  { href: "/",              icon: Home,         label: "Início"         },
  { href: "/estoque",       icon: Package,      label: "Estoque"        },
  { href: "/entrada",       icon: ScanLine,     label: "Entrada"        },
  { href: "/saida",         icon: ArrowUpRight, label: "Saída"          },
  { href: "/relatorios",    icon: FileText,     label: "Relatório"      },
  { href: "/configuracoes", icon: Settings,     label: "Configurações"  },
]

export default function SideNav({
  isSS,
  userName,
  userImage,
}: {
  isSS: boolean
  userName?: string
  userImage?: string
}) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 h-dvh sticky top-0 border-r"
      style={{ width: "240px", background: "var(--surface-card)", borderColor: "var(--border-color)" }}
    >
      {/* Logo */}
      <div style={{ padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
          Vila Yara
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
          Gestão de Publicações
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 flex flex-col" style={{ padding: "8px 12px", gap: "2px" }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="no-underline flex items-center"
              style={{
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: active ? 600 : 500,
                color: active ? "var(--color-primary)" : "var(--text-secondary)",
                background: active ? "rgba(30, 58, 95, 0.1)" : "transparent",
                borderLeft: active ? "3px solid var(--color-primary)" : "3px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div
        className="flex items-center gap-3 border-t"
        style={{ padding: "16px", borderColor: "var(--border-color)" }}
      >
        {userImage ? (
          <img
            src={userImage}
            alt="Perfil"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold m-0 truncate" style={{ color: "var(--text-primary)" }}>
            {userName || "Usuário"}
          </p>
          {isSS && <span className="badge badge-navy">SS</span>}
        </div>
      </div>
    </aside>
  )
}
