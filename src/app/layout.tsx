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
  title: "Vila Yara | Publicações",
  description: "Sistema de Gestão de Publicações JW",
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
      <body className={inter.className} style={{ margin: 0, background: "var(--surface-bg)", color: "var(--text-primary)" }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        <SessionProvider session={session}>
          <ThemeProvider>
            {/* Header mobile */}
            {isLogged && (
              <header
                className="sticky top-0 z-50 border-b md:hidden"
                style={{
                  background: "var(--surface-card)",
                  borderColor: "var(--border-color)",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 16px",
                  justifyContent: "space-between",
                }}
              >
                <Link href="/" className="no-underline">
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
                    Vila Yara
                  </span>
                </Link>

                <div className="flex items-center gap-2">
                  {isSS && <span className="badge badge-navy">SS</span>}
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt="Perfil"
                      className="w-8 h-8 rounded-full object-cover"
                      style={{ border: "1px solid var(--border-color)" }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </header>
            )}

            <div className="flex min-h-dvh">
              {isLogged && (
                <SideNav isSS={isSS} userName={user?.name} userImage={user?.image} />
              )}

              <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-4 pb-20 md:px-8 md:py-6 md:pb-6">
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
