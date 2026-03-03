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

  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Congregação
      </label>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="select"
        style={{ height: 36, fontSize: 13, maxWidth: 220 }}
      >
        {congregations.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.language})
          </option>
        ))}
      </select>
    </div>
  )
}
