import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { CompareProvider } from "@/components/CompareContext";
import CompareBar from "@/components/CompareBar";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AlreadyPicked | Curated Product Buying Guides",
    template: "%s | AlreadyPicked",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: "AlreadyPicked | Curated Product Buying Guides",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "AlreadyPicked | Curated Product Buying Guides",
    description: SITE_DESCRIPTION,
  },
};

function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <CompareProvider>
      {children}
      <CompareBar />
    </CompareProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Header */}
        <header className="site-header">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="site-brand">
              <span className="brand-mark">A</span>
              <div>
                <span className="brand-name">AlreadyPicked</span>
                <span className="brand-tagline">Better picks, less searching</span>
              </div>
            </Link>
            <nav className="site-nav">
              <Link href="/#guides">Buying guides</Link>
              <Link href="/products">All products</Link>
              <Link href="/compare">
                Compare
              </Link>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1">
          <ClientShell>{children}</ClientShell>
        </main>

        {/* Footer with affiliate disclosure */}
        <footer className="site-footer">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <p className="text-center text-xs leading-5 text-gray-500">
              <strong>Affiliate Disclosure:</strong> As an Amazon Associate, I
              earn from qualifying purchases. Product prices and availability
              are subject to change. Any price and availability information
              displayed on Amazon at the time of purchase will apply.
            </p>
            <p className="mt-4 text-center text-xs text-gray-400">
              &copy; {new Date().getFullYear()} AlreadyPicked. All
              rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
