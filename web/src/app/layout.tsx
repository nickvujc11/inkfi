import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";
import ConnectBtn from "@/components/ConnectBtn";
import Logo from "@/components/Logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "InkFi — Open Finance for Writers",
  description:
    "Decentralized publishing where every article is a yield-bearing asset. Tip, stake, and stream OPN to writers — fully on-chain on OPN Chain.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "InkFi — Open Finance for Writers",
    description:
      "Articles as yield-bearing assets on OPN Chain. Tip, stake, and stream OPN to writers.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
              {/* mobile / top bar */}
              <header
                className="lg:hidden sticky top-0 z-30 backdrop-blur-md"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(5,5,8,0.85)",
                }}
              >
                <div className="px-5 h-16 flex items-center justify-between">
                  <Logo />
                  <ConnectBtn />
                </div>
                <nav
                  className="px-5 pb-3 flex gap-1 overflow-x-auto"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {[
                    { href: "/", text: "Articles" },
                    { href: "/dashboard", text: "Dashboard" },
                    { href: "/streams", text: "Streams" },
                    { href: "/write", text: "Write" },
                  ].map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className="px-3 py-2 rounded-md text-sm whitespace-nowrap"
                      style={{ color: "rgba(244,240,232,0.7)" }}
                    >
                      {it.text}
                    </Link>
                  ))}
                </nav>
              </header>

              {/* desktop top connect */}
              <div
                className="hidden lg:flex items-center justify-end px-8 h-16"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <ConnectBtn />
              </div>

              <main className="flex-1 px-6 lg:px-10 py-8 max-w-[1400px] w-full mx-auto">
                {children}
              </main>

              <footer
                className="px-6 lg:px-10 py-6 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                style={{
                  borderTop: "1px solid var(--border)",
                  color: "var(--muted)",
                  letterSpacing: "0.05em",
                }}
              >
                <div className="font-mono">
                  InkFi · Open Finance for Writers · OPN Chain
                </div>
                <div className="flex gap-4">
                  <a href="https://chain.iopn.io">OPN Chain</a>
                  <a href="https://github.com/nickvujc11/inkfi">GitHub</a>
                  <a href="https://builders.iopn.tech">Builders</a>
                </div>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
