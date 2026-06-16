import type { Metadata } from "next";
import { SessionProvider } from "@/components/auth/session-provider";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoCompose - AI Email Generator",
  description: "AI-powered professional email composition tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Providers>{children}</Providers>
        </SessionProvider>
      </body>
    </html>
  );
}

// ============================================================
// FILE: src/app/layout.tsx
// ============================================================
// PURPOSE: Root layout for the entire application — wraps all pages with providers.
// HOW IT WORKS: Server component that renders the <html> and <body> tags.
//   Wraps children with NextAuth SessionProvider (JWT session management) and
//   app-level Providers (React Query, theme context, etc.). Sets global metadata
//   for SEO (title, description). Imports global CSS styles.
// INTEGRATION: SessionProvider, Providers, globals.css
// ============================================================
