"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, ClipboardList, Settings, ScanLine, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type NavConfig = {
  href: string
  icon: typeof Home
  label: string
  relatedPaths?: string[]
}

export default function BottomNav({ isSS: _isSS }: { isSS: boolean }) {
  const pathname = usePathname()
  const [fabOpen, setFabOpen] = useState(false)

  const leftItems: NavConfig[] = [
    { href: "/", icon: Home, label: "Início" },
    { href: "/estoque", icon: Package, label: "Estoque", relatedPaths: ["/entrada", "/saida", "/remessas", "/catalogo"] },
  ]

  const rightItems: NavConfig[] = [
    { href: "/pedidos-nominais", icon: ClipboardList, label: "Pedidos" },
    { href: "/configuracoes", icon: Settings, label: "Ajustes", relatedPaths: ["/relatorios"] },
  ]

  function isActive(href: string, relatedPaths?: string[]) {
    if (href === "/") return pathname === "/"
    if (pathname.startsWith(href)) return true
    if (relatedPaths) return relatedPaths.some(p => pathname.startsWith(p))
    return false
  }

  const fabActive = pathname.startsWith("/entrada") || pathname.startsWith("/saida")

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.3)" }}
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-around" style={{ height: "60px" }}>
          {leftItems.map((item) => (
            <NavButton key={item.href} item={item} active={isActive(item.href, item.relatedPaths)} />
          ))}

          {/* FAB central */}
          <div className="relative flex flex-col items-center" style={{ gap: "2px" }}>
            <AnimatePresence>
              {fabOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute flex flex-col gap-2"
                  style={{ bottom: "60px" }}
                >
                  <Link
                    href="/entrada"
                    onClick={() => setFabOpen(false)}
                    className="no-underline flex items-center gap-2"
                    style={{
                      background: "var(--color-success)",
                      color: "white",
                      padding: "10px 16px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    <ArrowDownLeft size={18} />
                    Entrada
                  </Link>
                  <Link
                    href="/saida"
                    onClick={() => setFabOpen(false)}
                    className="no-underline flex items-center gap-2"
                    style={{
                      background: "var(--color-error)",
                      color: "white",
                      padding: "10px 16px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    <ArrowUpRight size={18} />
                    Saída
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="border-none cursor-pointer p-0"
              style={{ background: "transparent" }}
            >
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
                  transition: "transform 0.15s ease",
                  transform: fabOpen ? "rotate(45deg)" : "none",
                }}
              >
                <ScanLine size={22} color="white" />
              </div>
            </button>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: fabActive ? "var(--color-primary)" : "var(--text-muted)",
              }}
            >
              Ação
            </span>
          </div>

          {rightItems.map((item) => (
            <NavButton key={item.href} item={item} active={isActive(item.href, item.relatedPaths)} />
          ))}
        </div>

        {/* Safe area para notch */}
        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </nav>
    </>
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
