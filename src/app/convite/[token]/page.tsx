"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { UserPlus, Mail, Lock, User, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { getInviteByToken, acceptInviteWithCredentials } from "@/actions/invite.actions"
import { signIn } from "next-auth/react"
import { Card, Button, Badge } from "@/components/ui"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    async function checkInvite() {
      const result = await getInviteByToken(token)
      if (result.valid && result.invite) {
        setInvite(result.invite)
      } else {
        setError(result.error || "Convite inválido.")
      }
      setLoading(false)
    }
    checkInvite()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const result = await acceptInviteWithCredentials({ token, name, email, password })
    if (result.success) {
      setSuccess(true)
      setTimeout(async () => {
        await signIn("credentials", { email, password, callbackUrl: "/" })
      }, 1500)
    } else {
      setError("error" in result ? (result.error || "Erro ao criar conta.") : "Erro ao criar conta.")
      setSubmitting(false)
    }
  }

  const handleGoogleAccept = () => {
    localStorage.setItem("pendingInviteToken", token)
    signIn("google", { callbackUrl: "/" })
  }

  const roleLabels: Record<string, string> = {
    SS: "Superintendente de Serviço",
    SERVO: "Servo de Publicações",
    HELPER: "Ajudante de Publicações",
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center -m-6">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 -m-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card variant="elevated" className="p-8 max-w-sm w-full text-center shadow-md">
            <XCircle size={64} className="text-[var(--color-error)] mx-auto mb-4" />
            <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2 m-0">Convite Inválido</h2>
            <p className="text-[14px] text-[var(--text-muted)] m-0">{error}</p>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 -m-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card variant="elevated" className="p-8 max-w-sm w-full text-center shadow-md">
            <CheckCircle2 size={64} className="text-[var(--color-success)] mx-auto mb-4" />
            <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2 m-0">Conta Criada!</h2>
            <p className="text-[14px] text-[var(--text-muted)] m-0">Redirecionando para o sistema...</p>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 -m-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Card variant="elevated" className="p-8 shadow-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center mb-4">
              <UserPlus size={28} className="text-white" />
            </div>
            <h1 className="text-[20px] font-bold text-[var(--text-primary)] m-0">Você foi convidado!</h1>
            <p className="text-[14px] text-[var(--text-muted)] mt-1 text-center m-0">
              Para a congregação <strong className="text-[var(--color-primary)]">{invite?.congregation?.name}</strong>
            </p>
            <Badge variant="primary" className="mt-2">
              {roleLabels[invite?.role] || invite?.role}
            </Badge>
            <p className="text-[12px] text-[var(--text-muted)] mt-2 m-0">
              Convidado por {invite?.createdBy?.name || "SS"}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleGoogleAccept}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--surface-card)] text-[var(--text-secondary)] font-medium cursor-pointer transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Aceitar com Google
            </button>

            <div className="divider"><span>ou criar com email</span></div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Seu nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Senha (mín 6 caracteres)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input pl-10" />
                </div>
              </div>
              {error && <p className="text-[12px] text-[var(--color-error)] text-center font-medium m-0">{error}</p>}
              <Button type="submit" disabled={submitting} loading={submitting} fullWidth>
                Criar Conta e Entrar
              </Button>
            </form>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
