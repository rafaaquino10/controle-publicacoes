"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { UserPlus, Users, Shield, Copy, Check, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import Breadcrumb from "@/components/Breadcrumb"
import { listUsers, toggleUserActive, changeUserRole } from "@/actions/user.actions"
import { createInvite, listPendingInvites, revokeInvite } from "@/actions/invite.actions"
import type { Role } from "@/lib/types"

type UserRow = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: Role
  isActive: boolean
  createdAt: Date
  invitedBy: { name: string | null } | null
}

type InviteRow = {
  id: string
  token: string
  role: Role
  expiresAt: Date
  createdBy: { name: string | null }
}

export default function UsersPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const congregationId = user?.congregationId

  const [users, setUsers] = useState<UserRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [inviteRole, setInviteRole] = useState<Role>("HELPER")

  const roleLabels: Record<string, string> = { SS: "Superintendente", SERVO: "Servo", HELPER: "Ajudante" }
  const roleColors: Record<string, string> = {
    SS: "badge-purple",
    SERVO: "badge-indigo",
    HELPER: "badge-slate",
  }

  useEffect(() => {
    if (congregationId) loadData()
  }, [congregationId])

  async function loadData() {
    if (!congregationId) return
    const [u, i] = await Promise.all([
      listUsers(congregationId),
      listPendingInvites(congregationId),
    ])
    setUsers(u as UserRow[])
    setInvites(i as InviteRow[])
  }

  function handleCreateInvite() {
    if (!congregationId || !user?.id) return
    startTransition(async () => {
      await createInvite({ role: inviteRole, congregationId, createdById: user.id })
      await loadData()
    })
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}/convite/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function handleRevoke(inviteId: string) {
    startTransition(async () => {
      await revokeInvite(inviteId)
      await loadData()
    })
  }

  function handleToggleActive(userId: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleUserActive(userId, !currentActive)
      await loadData()
    })
  }

  function handleChangeRole(userId: string, newRole: Role) {
    startTransition(async () => {
      await changeUserRole(userId, newRole)
      await loadData()
    })
  }

  if (user?.role !== "SS") {
    return (
      <div className="animate-in flex flex-col items-center justify-center py-20 gap-4">
        <Shield className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-medium">Apenas o SS pode gerenciar usuários.</p>
      </div>
    )
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      <Breadcrumb items={[
        { label: "Configurações", href: "/configuracoes" },
        { label: "Usuários" },
      ]} />
      <div>
        <h2 className="page-title flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Gestão de Usuários
        </h2>
        <p className="page-subtitle">Convide e gerencie os servos e ajudantes da congregação.</p>
      </div>

      {/* Criar Convite */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-700 m-0 mb-3 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" />
          Novo Convite
        </h3>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="select"
            style={{ width: "auto", minWidth: 140 }}
          >
            <option value="HELPER">Ajudante</option>
            <option value="SERVO">Servo</option>
          </select>
          <button onClick={handleCreateInvite} disabled={isPending} className="btn btn-primary btn-sm">
            {isPending ? "Criando..." : "Gerar Link de Convite"}
          </button>
        </div>
      </div>

      {/* Convites Pendentes */}
      {invites.length > 0 && (
        <div>
          <span className="section-label mb-3 block">Convites Pendentes ({invites.length})</span>
          <div className="flex flex-col gap-2">
            {invites.map((inv) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <span className={`badge ${roleColors[inv.role]}`}>
                    {roleLabels[inv.role]}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 m-0">
                    Expira {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleCopyLink(inv.token)}
                    className={`btn-icon ${copiedToken === inv.token ? "text-emerald-500 border-emerald-200" : ""}`}
                  >
                    {copiedToken === inv.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleRevoke(inv.id)} className="btn-icon btn-icon-danger">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Usuários */}
      <div>
        <span className="section-label mb-3 block">Usuários ({users.length})</span>
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="card p-3 flex items-center gap-3"
              style={{ opacity: u.isActive ? 1 : 0.5 }}
            >
              {u.image ? (
                <img src={u.image} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {u.name?.charAt(0) || "?"}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-800 m-0">{u.name || "Sem nome"}</p>
                <p className="text-[11px] text-slate-400 m-0 truncate">{u.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {u.id !== user?.id && u.role !== "SS" && (
                  <select
                    value={u.role}
                    onChange={(e) => handleChangeRole(u.id, e.target.value as Role)}
                    className="select text-[11px] font-semibold"
                    style={{ width: "auto", height: 28, padding: "0 6px", borderRadius: 6 }}
                  >
                    <option value="HELPER">Ajudante</option>
                    <option value="SERVO">Servo</option>
                  </select>
                )}

                <span className={`badge ${roleColors[u.role]}`}>
                  {roleLabels[u.role]}
                </span>

                {u.id !== user?.id && (
                  <button
                    onClick={() => handleToggleActive(u.id, u.isActive)}
                    title={u.isActive ? "Desativar" : "Reativar"}
                    className="bg-transparent border-none cursor-pointer p-1"
                  >
                    {u.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
