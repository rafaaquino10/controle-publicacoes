"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export default function ThemeToggleCompact() {
  const { resolved, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      className="btn-icon"
      aria-label={resolved === "dark" ? "Modo claro" : "Modo escuro"}
      title={resolved === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
