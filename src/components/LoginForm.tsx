"use client"

import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

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
    <div className="card p-8" style={{ boxShadow: "var(--shadow-sm)" }}>
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
          Vila Yara
        </h1>
        <p style={{ fontSize: "12px", margin: "4px 0 0", color: "var(--text-muted)" }}>
          Gestão de Publicações
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Botão Google */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border cursor-pointer transition-all active:scale-[0.98]"
          style={{
            height: "44px",
            borderRadius: "6px",
            background: "var(--surface-card)",
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
            fontSize: "13px",
            fontWeight: 500,
          }}
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

        {/* Botão abrir formulário */}
        {!showCredentials && (
          <button
            onClick={() => setShowCredentials(true)}
            className="w-full flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.98] border-none"
            style={{
              height: "44px",
              borderRadius: "6px",
              background: "var(--surface-bg)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            <Mail className="w-4 h-4" />
            Entrar com Email e Senha
          </button>
        )}

        {/* Formulário de credenciais */}
        {showCredentials && (
          <form onSubmit={handleCredentialsSignIn} className="flex flex-col gap-3 animate-in">
            <div>
              <label className="section-label mb-1.5 block" htmlFor="login-email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="section-label mb-1.5 block" htmlFor="login-password">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-xs text-center font-medium m-0" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
