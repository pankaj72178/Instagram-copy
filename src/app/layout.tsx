import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Folo", template: "%s · Folo" },
  description: "Folo — share moments with the people you follow.",
  openGraph: { siteName: "Folo", type: "website" },
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
  const unread = user
    ? await prisma.message.count({
        where: {
          read: false,
          NOT: { senderId: user.id },
          conversation: { OR: [{ userAId: user.id }, { userBId: user.id }] },
        },
      })
    : 0;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-50">
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <ToastProvider>
          <Nav user={user ? { username: user.username, avatarUrl: user.avatarUrl } : null} unread={unread} />
          {/* pb-20 leaves room for the mobile bottom nav */}
          <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
