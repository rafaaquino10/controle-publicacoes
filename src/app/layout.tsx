import { ReactNode } from "react"
import { auth } from "@/lib/auth"
import { SessionProvider } from "next-auth/react"
import Link from "next/link"
import { Inter } from "next/font/google"
import BottomNav from "@/components/BottomNav"
import SideNav from "@/components/SideNav"
import ThemeProvider from "@/components/ThemeProvider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Vila Yara | Publicacoes",
  description: "Sistema de Gestao de Publicacoes JW",
  manifest: "/manifest.json",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e3a5f",
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const isLogged = !!session
  const user = session?.user as any
  const role = user?.role || "HELPER"
  const isSS = role === "SS"

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} min-h-dvh`} style={{ background: "var(--surface-bg)", color: "var(--text-primary)" }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        <SessionProvider session={session}>
          <ThemeProvider>
            {isLogged && (
              <header className="sticky top-0 z-50 border-b md:hidden" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(20px)", borderColor: "var(--border-color)" }}>
                <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
                  <Link href="/" className="no-underline flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/20 flex-shrink-0">
                      <span className="text-white font-black text-sm tracking-tighter">VY</span>
                    </div>
                    <div className="leading-tight">
                      <div className="font-extrabold text-[15px] tracking-tight" style={{ color: "var(--text-primary)" }}>Vila Yara</div>
                      <div className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Gestao de Publicacoes</div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2">
                    {isSS && (
                      <span className="badge badge-purple badge-pill text-[9px]">SS</span>
                    )}
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt="Perfil"
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {user?.name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                </div>
              </header>
            )}

            <div className="flex min-h-dvh">
              {/* Desktop SideNav rendered here via client component */}
              {isLogged && <SideNav isSS={isSS} userName={user?.name} userImage={user?.image} />}

              <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 pb-24 md:px-8 md:py-6 md:pb-6">
                {children}
              </main>
            </div>

            {isLogged && <BottomNav isSS={isSS} />}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
