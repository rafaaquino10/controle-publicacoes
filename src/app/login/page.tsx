import LoginForm from "@/components/LoginForm"

export default function LoginPage() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{ background: "var(--surface-bg)", margin: "-24px" }}
    >
      <div className="w-full max-w-sm mx-4">
        <LoginForm />
        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          Acesso restrito a Servos de Publicações
        </p>
      </div>
    </div>
  )
}
