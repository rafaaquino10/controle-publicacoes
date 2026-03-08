"use client"

import { useState, useEffect, useTransition } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { UserPlus, Users, Shield, Copy, Check, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import Breadcrumb from "@/components/Breadcrumb"
import { Card, Button, Badge, EmptyState } from "@/components/ui"
import { cn } from "@/lib/cn"
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
  const roleBadgeVariant: Record<string, "primary" | "blue" | "slate"> = {
    SS: "primary",
    SERVO: "blue",
    HELPER: "slate",
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
      <div className="animate-in">
        <Card variant="elevated">
          <EmptyState
            icon={<Shield size={28} />}
            title="Acesso restrito"
            description="Apenas o SS pode gerenciar usuários."
          />
        </Card>
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
        <h1 className="text-[22px] font-bold tracking-tight m-0 text-[var(--text-primary)] flex items-center gap-2">
          <Users size={24} className="text-[var(--color-primary)]" />
          Gestão de Usuários
        </h1>
        <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">Convide e gerencie os servos e ajudantes da congregação.</p>
      </div>

      {/* Create invite */}
      <Card variant="elevated" className="p-5">
        <h3 className="text-[14px] font-bold text-[var(--text-primary)] m-0 mb-3 flex items-center gap-1.5">
          <UserPlus size={16} />
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
          <Button onClick={handleCreateInvite} disabled={isPending} loading={isPending} size="sm">
            Gerar Link de Convite
          </Button>
        </div>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-2">
            Convites Pendentes ({invites.length})
          </p>
          <div className="flex flex-col gap-2">
            {invites.map((inv) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card variant="elevated" className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <Badge variant={roleBadgeVariant[inv.role] || "slate"}>
                      {roleLabels[inv.role]}
                    </Badge>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 m-0">
                      Expira {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleCopyLink(inv.token)}
                      className={cn(
                        "btn-icon",
                        copiedToken === inv.token && "text-[var(--color-success)] border-[var(--color-success)]/30"
                      )}
                    >
                      {copiedToken === inv.token ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={() => handleRevoke(inv.id)} className="btn-icon btn-icon-danger">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Users list */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] m-0 mb-2">
          Usuários ({users.length})
        </p>
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <Card
              key={u.id}
              variant="elevated"
              className={cn("p-3 flex items-center gap-3", !u.isActive && "opacity-50")}
            >
              {u.image ? (
                <img src={u.image} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {u.name?.charAt(0) || "?"}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] text-[var(--text-primary)] m-0">{u.name || "Sem nome"}</p>
                <p className="text-[11px] text-[var(--text-muted)] m-0 truncate">{u.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {u.id !== user?.id && u.role !== "SS" && (
                  <select
                    value={u.role}
                    onChange={(e) => handleChangeRole(u.id, e.target.value as Role)}
                    className="select text-[11px] font-semibold"
                    style={{ width: "auto", height: 28, padding: "0 6px", borderRadius: 8 }}
                  >
                    <option value="HELPER">Ajudante</option>
                    <option value="SERVO">Servo</option>
                  </select>
                )}

                <Badge variant={roleBadgeVariant[u.role] || "slate"}>
                  {roleLabels[u.role]}
                </Badge>

                {u.id !== user?.id && (
                  <button
                    onClick={() => handleToggleActive(u.id, u.isActive)}
                    title={u.isActive ? "Desativar" : "Reativar"}
                    className="bg-transparent border-none cursor-pointer p-1"
                  >
                    {u.isActive ? (
                      <ToggleRight size={20} className="text-[var(--color-success)]" />
                    ) : (
                      <ToggleLeft size={20} className="text-[var(--text-muted)]" />
                    )}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
