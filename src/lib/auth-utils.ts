import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Role } from "@/lib/types"

export type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: Role
  congregationId: string | null
  isActive: boolean
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.user as unknown as SessionUser
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    redirect("/")
  }
  return user
}

export function hasRole(user: SessionUser | null, ...roles: Role[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}

export function isSS(user: SessionUser | null): boolean {
  return hasRole(user, "SS")
}
