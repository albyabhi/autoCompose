import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongo-client";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          await connectDB();
          const user = await User.findOne({ email }).lean();

          if (!user || !user.passwordHash) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatar,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role ?? "user";
        token.provider = account?.provider ?? "credentials";
      }
      if (trigger === "update") {
        const refreshedUser = await User.findById(token.id).lean();
        if (refreshedUser) {
          token.role = refreshedUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
});
