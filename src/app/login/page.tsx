import LoginForm from "@/components/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--surface-bg)] -m-6">
      <div className="w-full max-w-sm mx-4">
        <LoginForm />
        <p className="text-center text-[12px] mt-6 text-[var(--text-muted)]">
          Acesso restrito a Servos de Publicações
        </p>
      </div>
    </div>
  )
}
