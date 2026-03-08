"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { UserPlus, Mail, Lock, User, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { getInviteByToken, acceptInviteWithCredentials } from "@/actions/invite.actions"
import { signIn } from "next-auth/react"

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
      <div className="min-h-dvh flex items-center justify-center" style={{ margin: "-20px -16px" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4" style={{ margin: "-20px -16px" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="card shadow-xl p-8 max-w-sm w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2 m-0">Convite Inválido</h2>
          <p className="text-sm text-slate-500 m-0">{error}</p>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4" style={{ margin: "-20px -16px" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="card shadow-xl p-8 max-w-sm w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2 m-0">Conta Criada!</h2>
          <p className="text-sm text-slate-500 m-0">Redirecionando para o sistema...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden" style={{ margin: "-20px -16px" }}>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="card shadow-xl p-8 max-w-sm w-full relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 m-0">Você foi convidado!</h1>
          <p className="text-sm text-slate-500 mt-1 text-center m-0">
            Para a congregação <strong className="text-primary">{invite?.congregation?.name}</strong>
          </p>
          <span className="badge badge-indigo badge-pill mt-2">
            {roleLabels[invite?.role] || invite?.role}
          </span>
          <p className="text-xs text-slate-400 mt-2 m-0">
            Convidado por {invite?.createdBy?.name || "SS"}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleGoogleAccept}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-medium text-slate-700 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
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
            <div className="float-group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <input id="invite-name" type="text" placeholder=" " value={name} onChange={(e) => setName(e.target.value)} required className="input float-input pl-10" />
              <label htmlFor="invite-name" className="float-label has-icon">Seu nome</label>
            </div>
            <div className="float-group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <input id="invite-email" type="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} required className="input float-input pl-10" />
              <label htmlFor="invite-email" className="float-label has-icon">Email</label>
            </div>
            <div className="float-group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <input id="invite-password" type="password" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input float-input pl-10" />
              <label htmlFor="invite-password" className="float-label has-icon">Senha (mín 6 caracteres)</label>
            </div>
            {error && <p className="text-xs text-red-500 text-center font-medium m-0">{error}</p>}
            <button type="submit" disabled={submitting} className="btn btn-primary w-full">
              {submitting ? "Criando conta..." : "Criar Conta e Entrar"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
