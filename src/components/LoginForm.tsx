"use client"

import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, Button } from "@/components/ui"

export default function LoginForm() {
  const router = useRouter()
  const [showCredentials, setShowCredentials] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" })
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        setError("Email ou senha incorretos.")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("Erro ao fazer login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="elevated" className="p-8 shadow-md">
      {/* Header */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)] flex items-center justify-center mb-4">
          <span className="text-white font-bold text-[18px]">P</span>
        </div>
        <h1 className="text-[22px] font-bold m-0 text-[var(--text-primary)]">
          Vila Yara
        </h1>
        <p className="text-[13px] m-0 mt-1 text-[var(--text-muted)]">
          Gestão de Publicações
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Google button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full h-11 flex items-center justify-center gap-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--surface-card)] text-[var(--text-secondary)] text-[14px] font-medium cursor-pointer transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Entrar com Google
        </button>

        <div className="divider"><span>ou</span></div>

        {!showCredentials && (
          <button
            onClick={() => setShowCredentials(true)}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-[10px] border-none bg-[var(--surface-bg)] text-[var(--text-secondary)] text-[14px] font-medium cursor-pointer transition-all active:scale-[0.98]"
          >
            <Mail size={16} />
            Entrar com Email e Senha
          </button>
        )}

        {showCredentials && (
          <form onSubmit={handleCredentialsSignIn} className="flex flex-col gap-3 animate-in">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 text-[var(--text-muted)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-[12px] text-center font-medium m-0 text-[var(--color-error)]">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} loading={loading} fullWidth>
              Entrar
            </Button>
          </form>
        )}
      </div>
    </Card>
  )
}
