"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, ArrowUpRight, FileText, Settings, ScanLine } from "lucide-react"

type NavConfig = {
  href: string
  icon: typeof Home
  label: string
}

export default function BottomNav({ isSS }: { isSS: boolean }) {
  const pathname = usePathname()

  const leftItems: NavConfig[] = [
    { href: "/",        icon: Home,    label: "Início"  },
    { href: "/estoque", icon: Package, label: "Estoque" },
  ]

  const rightItems: NavConfig[] = isSS
    ? [
        { href: "/relatorios",    icon: FileText, label: "Relatório" },
        { href: "/configuracoes", icon: Settings, label: "Ajustes"   },
      ]
    : [
        { href: "/saida",         icon: ArrowUpRight, label: "Saída"   },
        { href: "/configuracoes", icon: Settings,     label: "Ajustes" },
      ]

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const scanActive = isActive("/entrada")

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
      style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center justify-around" style={{ height: "60px" }}>
        {leftItems.map((item) => (
          <NavButton key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {/* Scan central */}
        <Link href="/entrada" className="no-underline flex flex-col items-center" style={{ gap: "2px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "-20px",
            }}
          >
            <ScanLine size={22} color="white" />
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: scanActive ? "var(--color-primary)" : "var(--text-muted)",
            }}
          >
            Scan
          </span>
        </Link>

        {rightItems.map((item) => (
          <NavButton key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      {/* Safe area para notch */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  )
}

function NavButton({ item, active }: { item: NavConfig; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="no-underline flex flex-col items-center"
      style={{
        gap: "2px",
        minWidth: "56px",
        padding: "8px 0",
        color: active ? "var(--color-primary)" : "var(--text-muted)",
        transition: "color 0.15s ease",
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500 }}>{item.label}</span>
    </Link>
  )
}
