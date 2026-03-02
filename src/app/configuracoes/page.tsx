"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { LogOut, BellRing, Smartphone, Users, MapPin } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"

export default function SettingsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isSS = user?.role === "SS"

  const roleLabels: Record<string, string> = {
    SS: "Superintendente de Serviço",
    SERVO: "Servo de Publicações",
    HELPER: "Ajudante de Publicações",
  }

  return (
    <div className="animate-in flex flex-col gap-5 pb-8">
      <div>
        <h2 className="page-title">Configurações</h2>
        <p className="page-subtitle">Configurações e segurança da conta.</p>
      </div>

      {/* Dados Pessoais */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface-bg)" }}>
            {user?.image ? (
              <img src={user.image} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
                style={{ background: "var(--color-primary)" }}
              >
                {user?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg m-0" style={{ color: "var(--text-primary)" }}>{user?.name || "Usuário"}</h3>
            <p className="text-sm m-0 mt-0.5" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
            <span className="badge badge-green mt-2 inline-flex">
              {roleLabels[user?.role] || user?.role || "Indisponível"}
            </span>
          </div>
        </div>
      </div>

      {/* Opções */}
      <div className="flex flex-col gap-2">
        {isSS && (
          <>
            <SettingsLink
              href="/configuracoes/usuarios"
              icon={<Users className="w-5 h-5" />}
              iconBg="bg-blue-50 text-blue-600"
              title="Usuários e Convites"
              desc="Gerenciar acessos ao sistema"
            />
            <SettingsLink
              href="/configuracoes/locais"
              icon={<MapPin className="w-5 h-5" />}
              iconBg="bg-green-50 text-green-700"
              title="Localizações Físicas"
              desc="Armários, mostruários e grupos"
            />
          </>
        )}
        <div className="card p-4 flex flex-col gap-3">
          <p className="font-bold text-sm m-0" style={{ color: "var(--text-primary)" }}>Aparência</p>
          <ThemeToggle />
        </div>
        <SettingsButton
          icon={<BellRing className="w-5 h-5" />}
          iconBg="bg-sky-50 text-sky-600"
          title="Notificações"
          desc="Alertas de estoque baixo"
        />
      </div>

      {/* PWA & Logout */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="card p-4 flex gap-3 items-start" style={{ borderColor: "rgba(30,58,95,0.2)", background: "rgba(30,58,95,0.04)" }}>
          <Smartphone className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
          <div>
            <p className="text-sm font-bold m-0" style={{ color: "var(--color-primary)" }}>App Offline (PWA)</p>
            <p className="text-xs mt-1 m-0" style={{ color: "var(--text-secondary)" }}>
              O app está disponível para instalação no botão de opções do seu navegador.
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-danger w-full flex items-center justify-center gap-2 mt-1"
        >
          <LogOut className="w-5 h-5" />
          Encerrar Sessão
        </button>
      </div>
    </div>
  )
}

function SettingsLink({ href, icon, iconBg, title, desc }: {
  href: string; icon: React.ReactNode; iconBg: string; title: string; desc: string
}) {
  return (
    <Link
      href={href}
      className="no-underline card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
    >
      <div className={`w-10 h-10 rounded-md ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-sm m-0" style={{ color: "var(--text-primary)" }}>{title}</p>
        <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
    </Link>
  )
}

function SettingsButton({ icon, iconBg, title, desc }: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string
}) {
  return (
    <button className="card p-4 flex items-center gap-4 text-left cursor-pointer active:scale-[0.98] transition-transform border-none w-full" style={{ background: "var(--surface-card)" }}>
      <div className={`w-10 h-10 rounded-md ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-sm m-0" style={{ color: "var(--text-primary)" }}>{title}</p>
        <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
    </button>
  )
}
