"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { getAllCongregations } from "@/actions/congregation.actions"

type Congregation = {
  id: string
  name: string
  language: string
}

export default function CongregationSelector({ defaultCongId }: { defaultCongId: string }) {
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const current = searchParams.get("cong") || defaultCongId

  useEffect(() => {
    getAllCongregations().then((data) => setCongregations(data as Congregation[]))
  }, [])

  function handleChange(congId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (congId === defaultCongId) {
      params.delete("cong")
    } else {
      params.set("cong", congId)
    }
    const qs = params.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ""}`)
  }

  if (congregations.length <= 1) return null

  const currentCong = congregations.find((c) => c.id === current)

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--color-primary) 5%, var(--surface-card))",
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 6, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--color-primary)", color: "white",
          fontSize: 13, fontWeight: 700,
        }}
      >
        {currentCong?.name?.charAt(0) || "C"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: 0 }}>
          Congregação
        </p>
        <select
          value={current}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: "100%",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "2px 0 0",
            cursor: "pointer",
            appearance: "auto",
          }}
        >
          {congregations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
