"use client"

import { useState } from "react"
import { buildCdnImageUrl } from "@/lib/cdn-url"

type Props = {
  src: string | null
  alt: string
  pubCode?: string
  langCode?: string
  className?: string
  width?: number
  height?: number
}

export default function ItemImage({ src, alt, pubCode, langCode = "T", className = "", width = 44, height = 60 }: Props) {
  const [error, setError] = useState(false)

  // Try: explicit src first, then build from pubCode+lang
  const imageUrl = src || (pubCode ? buildCdnImageUrl(pubCode, langCode) : null)

  if (!imageUrl || error) {
    return (
      <div
        className={`img-placeholder flex-shrink-0 ${className}`}
        style={{ width, height }}
      >
        <span className="text-center leading-tight px-1">
          {pubCode?.toUpperCase().slice(0, 6) || alt.charAt(0)}
        </span>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      onError={() => setError(true)}
      className={`object-cover rounded-none flex-shrink-0 ${className}`}
      style={{ width, height }}
    />
  )
}
