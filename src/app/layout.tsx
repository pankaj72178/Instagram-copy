import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { getCurrentUser } from "@/lib/auth";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Folo",
  description: "Folo — share moments with the people you follow.",
};

// Folo is personalized + real-time — render everything at request time so the
// build never queries the database (avoids build-time DB failures on Vercel).
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Nav user={user ? { username: user.username, avatarUrl: user.avatarUrl } : null} />
        {/* pb-20 leaves room for the mobile bottom nav */}
        <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>
      </body>
    </html>
  );
}
