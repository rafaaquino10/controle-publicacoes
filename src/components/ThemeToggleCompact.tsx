"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export default function ThemeToggleCompact() {
  const { resolved, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      className="w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] text-[var(--text-secondary)] inline-flex items-center justify-center cursor-pointer"
      aria-label={resolved === "dark" ? "Modo claro" : "Modo escuro"}
      title={resolved === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
