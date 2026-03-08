import Link from "next/link"
import { ChevronRight } from "lucide-react"

type BreadcrumbItem = {
  label: string
  href?: string
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: "13px" }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="no-underline font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                style={{
                  color: isLast ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: isLast ? 700 : 600,
                }}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
