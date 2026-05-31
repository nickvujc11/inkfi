import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";
import ConnectBtn from "@/components/ConnectBtn";
import Logo from "@/components/Logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "InkFi — Library of Letters",
  description:
    "A library where every volume is a yield-bearing asset. Tip, stake, and stream OPN to writers — fully on-chain on OPN Chain.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "InkFi — Library of Letters",
    description:
      "A library where every volume is a yield-bearing asset on OPN Chain.",
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
              {/* Mobile header */}
              <header
                className="lg:hidden sticky top-0 z-30"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(26, 15, 10, 0.92)",
                  backdropFilter: "blur(8px)",
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
                    { href: "/", text: "Library" },
                    { href: "/staking", text: "Endowments" },
                    { href: "/streams", text: "Streams" },
                    { href: "/dashboard", text: "Ledger" },
                    { href: "/write", text: "Inkwell" },
                  ].map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className="px-3 py-2 rounded text-sm whitespace-nowrap"
                      style={{ color: "var(--parchment-3)" }}
                    >
                      {it.text}
                    </Link>
                  ))}
                </nav>
              </header>

              {/* Desktop top header */}
              <div
                className="hidden lg:flex items-center justify-between px-10 h-16"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div
                  className="font-mono text-[11px]"
                  style={{
                    color: "var(--parchment-3)",
                    letterSpacing: "0.18em",
                  }}
                >
                  EST. MMXXVI · OPN CHAIN, BLOCK CITY
                </div>
                <ConnectBtn />
              </div>

              <main className="flex-1 px-6 lg:px-10 py-10 max-w-[1400px] w-full mx-auto">
                {children}
              </main>

              {/* Fancy footer with deco striping */}
              <div className="mt-16">
                <div className="fancy-footer" aria-hidden></div>
                <div className="fancy-footer-inner">
                  <div className="px-6 lg:px-10 max-w-6xl mx-auto">
                    <div className="ornament mb-6">❦ ⁂ ❦</div>
                    <div className="text-center mb-5">
                      <div
                        className="font-display italic"
                        style={{
                          color: "var(--parchment-2)",
                          fontSize: "1.3rem",
                        }}
                      >
                        Printed on OPN Chain · MMXXVI
                      </div>
                      <div
                        className="kicker mt-2"
                        style={{ letterSpacing: "0.4em" }}
                      >
                        Open Finance for Writers
                      </div>
                    </div>
                    <div
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs font-mono pt-5"
                      style={{
                        borderTop: "1px solid var(--border)",
                        color: "var(--muted)",
                      }}
                    >
                      <div style={{ letterSpacing: "0.1em" }}>
                        ◆ Folio I · Page MCMXXVI · A Library of Letters
                      </div>
                      <div className="flex gap-5">
                        <a href="https://chain.iopn.io">OPN Chain</a>
                        <a href="https://github.com/nickvujc11/inkfi">
                          GitHub
                        </a>
                        <a href="https://builders.iopn.tech">Builders</a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="fancy-footer" aria-hidden></div>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
