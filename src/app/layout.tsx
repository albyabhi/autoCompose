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
