"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home, Package, ArrowDownLeft, ArrowUpRight, Truck,
  FileText, Settings, ClipboardList, BookOpen,
} from "lucide-react"
import { cn } from "@/lib/cn"
import ThemeToggleCompact from "./ThemeToggleCompact"

type NavItem = {
  href: string
  icon: typeof Home
  label: string
  ssOnly?: boolean
}

type NavSection = {
  title: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/", icon: Home, label: "Início" },
      { href: "/estoque", icon: Package, label: "Estoque" },
    ],
  },
  {
    title: "Operações",
    items: [
      { href: "/entrada", icon: ArrowDownLeft, label: "Entrada" },
      { href: "/saida", icon: ArrowUpRight, label: "Saída" },
      { href: "/remessas", icon: Truck, label: "Remessas" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/catalogo", icon: BookOpen, label: "Catálogo", ssOnly: true },
      { href: "/pedidos-nominais", icon: ClipboardList, label: "Pedidos Nominais" },
      { href: "/relatorios", icon: FileText, label: "Relatório", ssOnly: true },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/configuracoes", icon: Settings, label: "Configurações" },
    ],
  },
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
    <aside className="hidden md:flex flex-col flex-shrink-0 h-dvh sticky top-0 border-r border-[var(--border-color)] bg-[var(--surface-card)] w-[260px]">
      {/* Brand area */}
      <div className="bg-[var(--color-primary)] px-5 py-4">
        <div className="text-white font-bold text-[16px] tracking-tight">Publicações</div>
        <div className="text-white/70 text-[12px] mt-0.5">Vila Yara</div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => {
          const visibleItems = section.items.filter(item => !item.ssOnly || isSS)
          if (visibleItems.length === 0) return null
          return (
            <div key={section.title}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-1.5">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "no-underline flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] transition-all duration-150",
                        active
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-bg)] font-medium"
                      )}
                    >
                      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="flex items-center gap-3 border-t border-[var(--border-color)] px-4 py-3">
        {userImage ? (
          <img
            src={userImage}
            alt="Perfil"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-[var(--color-primary)]">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold m-0 truncate text-[var(--text-primary)]">
            {userName || "Usuário"}
          </p>
          {isSS && (
            <span className="text-[11px] font-semibold text-[var(--color-primary)]">SS</span>
          )}
        </div>
        <ThemeToggleCompact />
      </div>
    </aside>
  )
}
