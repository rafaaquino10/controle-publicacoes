"use client"

import { signOut, useSession } from "next-auth/react"
import { LogOut, BellRing, Smartphone, Users, MapPin } from "lucide-react"
import { GroupedList, GroupedRow, Card, Button, Badge } from "@/components/ui"
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
        <h1 className="text-[28px] font-bold tracking-tight m-0 text-[var(--text-primary)]">Configurações</h1>
        <p className="text-[14px] mt-0.5 m-0 text-[var(--text-muted)]">Conta, aparência e segurança.</p>
      </div>

      {/* Profile card */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-[var(--surface-bg)]">
            {user?.image ? (
              <img src={user.image} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl bg-[var(--color-primary)]">
                {user?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-[18px] m-0 text-[var(--text-primary)]">{user?.name || "Usuário"}</h3>
            <p className="text-[14px] m-0 mt-0.5 text-[var(--text-secondary)]">{user?.email}</p>
            <Badge variant="primary" className="mt-2">
              {roleLabels[user?.role] || user?.role || "Indisponível"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Settings groups */}
      {isSS && (
        <GroupedList header="Administração">
          <GroupedRow
            href="/configuracoes/usuarios"
            icon={<Users size={16} />}
            iconBg="bg-[var(--color-primary)]"
            label="Usuários e Convites"
            value="Gerenciar"
            chevron
          />
          <GroupedRow
            href="/configuracoes/locais"
            icon={<MapPin size={16} />}
            iconBg="bg-[var(--color-success)]"
            label="Localizações Físicas"
            value="Gerenciar"
            chevron
          />
        </GroupedList>
      )}

      <GroupedList header="Preferências">
        <div className="px-4 py-3">
          <p className="font-semibold text-[14px] m-0 mb-3 text-[var(--text-primary)]">Aparência</p>
          <ThemeToggle />
        </div>
        <GroupedRow
          icon={<BellRing size={16} />}
          iconBg="bg-[var(--color-primary)]"
          label="Notificações"
          value="Em breve"
        />
      </GroupedList>

      {/* PWA & Logout */}
      <Card variant="elevated" className="p-4 flex gap-3 items-start border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
        <Smartphone size={20} className="mt-0.5 flex-shrink-0 text-[var(--color-primary)]" />
        <div>
          <p className="text-[14px] font-bold m-0 text-[var(--color-primary)]">App Offline (PWA)</p>
          <p className="text-[12px] mt-1 m-0 text-[var(--text-secondary)]">
            O app está disponível para instalação no botão de opções do seu navegador.
          </p>
        </div>
      </Card>

      <Button
        variant="danger"
        fullWidth
        size="lg"
        icon={<LogOut size={20} />}
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Encerrar Sessão
      </Button>
    </div>
  )
}
