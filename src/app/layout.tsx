import { ReactNode, Suspense } from "react"
import { auth } from "@/lib/auth"
import { SessionProvider } from "next-auth/react"
import { Inter } from "next/font/google"
import BottomNav from "@/components/BottomNav"
import SideNav from "@/components/SideNav"
import MobileHeader from "@/components/MobileHeader"
import ThemeProvider from "@/components/ThemeProvider"
import PageTransition from "@/components/PageTransition"
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
        <meta name="mobile-web-app-capable" content="yes" />
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
              <Suspense fallback={null}>
                <MobileHeader isSS={isSS} userName={user?.name} userImage={user?.image} />
              </Suspense>
            )}

            <div className="flex min-h-dvh">
              {isLogged && (
                <SideNav isSS={isSS} userName={user?.name} userImage={user?.image} />
              )}

              <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-4 pb-20 md:px-8 md:py-6 md:pb-6">
                <PageTransition>
                  {children}
                </PageTransition>
              </main>
            </div>

            {isLogged && <BottomNav isSS={isSS} />}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
