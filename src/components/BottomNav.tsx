"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, ArrowDownLeft, ClipboardList, Settings } from "lucide-react"
import { cn } from "@/lib/cn"

type TabItem = {
  href: string
  icon: typeof Home
  label: string
  relatedPaths?: string[]
}

const tabs: TabItem[] = [
  { href: "/", icon: Home, label: "Início" },
  { href: "/estoque", icon: Package, label: "Estoque", relatedPaths: ["/catalogo"] },
  { href: "/entrada", icon: ArrowDownLeft, label: "Entrada", relatedPaths: ["/saida", "/remessas"] },
  { href: "/pedidos-nominais", icon: ClipboardList, label: "Pedidos" },
  { href: "/configuracoes", icon: Settings, label: "Ajustes", relatedPaths: ["/relatorios"] },
]

export default function BottomNav({ isSS: _isSS }: { isSS: boolean }) {
  const pathname = usePathname()

  function isActive(href: string, relatedPaths?: string[]) {
    if (href === "/") return pathname === "/"
    if (pathname.startsWith(href)) return true
    if (relatedPaths) return relatedPaths.some(p => pathname.startsWith(p))
    return false
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-[var(--border-color)] md:hidden">
      <div className="flex items-center justify-around" style={{ height: "49px" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href, tab.relatedPaths)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "no-underline flex flex-col items-center justify-center gap-0.5",
                "min-w-[56px] min-h-[44px] transition-colors duration-150",
                active ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
              <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
      {/* Safe area for notch/home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
