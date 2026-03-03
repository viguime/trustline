import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

// ---------------------------------------------------------------------------
// Type augmentations — extend Auth.js built-in types
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string;
      role: "admin";
    } & DefaultSession["user"];
  }

  // Shape returned by authorize() and passed through to the jwt callback
  interface User {
    companyId: string;
    role: "admin";
  }
}

// ---------------------------------------------------------------------------
// Auth.js v5 configuration
// ---------------------------------------------------------------------------

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // Narrow unknown credential values to strings before use
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        try {
          await connectToDatabase();

          // findOne returns the Mongoose document with all schema fields;
          // passwordHash is accessible here (toJSON transform only strips it
          // when serialising to JSON, not when accessing via the model).
          const user = await User.findOne({
            email: email.toLowerCase().trim(),
          });

          if (!user) return null;

          const isValid = await user.verifyPassword(password);
          if (!isValid) return null;

          // Return only the fields needed for the JWT/session — never the hash
          return {
            id: user._id.toHexString(),
            email: user.email,
            companyId: user.companyId.toHexString(),
            role: "admin" as const,
          };
        } catch {
          // Surface no internal error details to the caller
          return null;
        }
      },
    }),
  ],

  // ---------------------------------------------------------------------------
  // JWT-only sessions — no DB session table required
  // ---------------------------------------------------------------------------
  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Runs every time a JWT is created or updated.
     * `user` is only present on the *first* sign-in; on subsequent requests
     * the custom fields are already encoded in `token`.
     *
     * JWT extends Record<string, unknown>, so we can safely store extra fields.
     * We use a cast to Record to make the assignment explicit under strict TS.
     */
    jwt({ token, user }) {
      if (user) {
        (token as Record<string, unknown>).companyId = user.companyId;
        (token as Record<string, unknown>).role = user.role;
      }
      return token;
    },

    /**
     * Shapes what `useSession()` / `auth()` returns to the application.
     * Reads from the decoded JWT so the session stays stateless.
     *
     * `token` is typed as `Record<string, unknown>`, so we cast each field to
     * its expected type before the nullish-coalesce to keep the return type
     * consistent with the augmented Session interface.
     */
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: (token.sub as string | undefined) ?? "",
          companyId: (token.companyId as string | undefined) ?? "",
          role: (token.role as "admin" | undefined) ?? "admin",
        },
      };
    },
  },

  pages: {
    signIn: "/login",
  },
});
