"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "./ThemeProvider"

const options = [
  { value: "light"  as const, label: "Claro",   icon: Sun     },
  { value: "dark"   as const, label: "Escuro",   icon: Moon    },
  { value: "system" as const, label: "Sistema",  icon: Monitor },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const Icon = opt.icon
        const active = theme === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              height: "36px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: active ? "none" : "1px solid var(--border-color)",
              background: active ? "var(--color-primary)" : "var(--surface-bg)",
              color: active ? "white" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <Icon size={14} />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
