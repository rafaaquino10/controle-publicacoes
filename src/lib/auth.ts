import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"

const providers: any[] = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      })

      if (!user || !user.passwordHash || !user.isActive) return null

      const isValid = await compare(
        credentials.password as string,
        user.passwordHash
      )
      if (!isValid) return null

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }
    },
  })
)

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            congregationId: true,
            isActive: true,
            name: true,
            image: true,
          },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.congregationId = dbUser.congregationId
          token.isActive = dbUser.isActive
          if (trigger === "update") {
            token.name = dbUser.name
            token.picture = dbUser.image
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).congregationId = token.congregationId
        ;(session.user as any).isActive = token.isActive
      }
      return session
    },
    async signIn({ user }) {
      if (!user.id) return true
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isActive: true },
      })
      if (dbUser && !dbUser.isActive) return false
      return true
    },
  },
})
