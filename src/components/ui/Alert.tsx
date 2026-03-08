import { type HTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/cn"
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react"

type AlertVariant = "warning" | "success" | "error" | "info"

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  icon?: ReactNode
}

const config: Record<AlertVariant, { bg: string; icon: ReactNode }> = {
  warning: {
    bg: "bg-[#fff8e1] border-[#ffe082] text-[#e65100] dark:bg-[#451a03] dark:border-[#92400e] dark:text-[#fcd34d]",
    icon: <AlertTriangle size={18} />,
  },
  success: {
    bg: "bg-[#f0fdf4] border-[#bbf7d0] text-[#065f46] dark:bg-[#052e16] dark:border-[#166534] dark:text-[#86efac]",
    icon: <CheckCircle size={18} />,
  },
  error: {
    bg: "bg-[#fef2f2] border-[#fecaca] text-[#991b1b] dark:bg-[#450a0a] dark:border-[#991b1b] dark:text-[#fca5a5]",
    icon: <XCircle size={18} />,
  },
  info: {
    bg: "bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af] dark:bg-[#172554] dark:border-[#1e3a5a] dark:text-[#93c5fd]",
    icon: <Info size={18} />,
  },
}

function Alert({ className, variant = "info", icon, children, ...props }: AlertProps) {
  const c = config[variant]
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[10px] border text-[13px] font-medium",
        c.bg,
        className
      )}
      {...props}
    >
      <span className="flex-shrink-0">{icon ?? c.icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export { Alert }
export type { AlertProps }
