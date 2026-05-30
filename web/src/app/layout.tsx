import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";
import ConnectBtn from "@/components/ConnectBtn";
import Logo from "@/components/Logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "InkFi — Archive of Finance",
  description:
    "An archive where every article is a yield-bearing asset. Tip, stake, and stream OPN to writers — fully on-chain on OPN Chain.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "InkFi — Archive of Finance",
    description:
      "Articles as yield-bearing volumes on OPN Chain. Tip, stake, and stream OPN to writers.",
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
          <div className="flex min-h-screen relative z-0">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
              {/* mobile / top bar */}
              <header className="lg:hidden sticky top-0 z-30 backdrop-blur-md border-b border-rule bg-walnut/85">
                <div className="px-5 h-16 flex items-center justify-between">
                  <Logo />
                  <ConnectBtn />
                </div>
                <nav className="px-5 pb-3 flex gap-1 overflow-x-auto border-t border-rule">
                  {[
                    { href: "/", text: "Articles" },
                    { href: "/dashboard", text: "Dashboard" },
                    { href: "/streams", text: "Streams" },
                    { href: "/write", text: "Write" },
                  ].map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className="px-3 py-2.5 font-display text-[14px] whitespace-nowrap text-paper-dim hover:text-paper"
                    >
                      {it.text}
                    </Link>
                  ))}
                </nav>
              </header>

              {/* desktop top connect */}
              <div className="hidden lg:flex items-center justify-between px-10 h-16 border-b border-rule">
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-paper-mute">
                  <span className="text-brass">❧</span>
                  <span>Open Finance for Writers</span>
                  <span className="text-brass">·</span>
                  <span>Established Block 17.521.914</span>
                </div>
                <ConnectBtn />
              </div>

              <main className="flex-1 px-6 lg:px-12 py-10 max-w-[1400px] w-full mx-auto">
                {children}
              </main>

              <footer className="px-6 lg:px-12 py-7 border-t border-rule">
                <div className="rule mb-4">
                  <span className="rule-dot" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-paper-mute">
                  <div>
                    <span className="text-brass">InkFi</span> · Archive of
                    Finance · MMXXVI
                  </div>
                  <div className="flex gap-6">
                    <a href="https://chain.iopn.io" className="hover:text-brass">
                      OPN Chain
                    </a>
                    <a
                      href="https://github.com/nickvujc11/inkfi"
                      className="hover:text-brass"
                    >
                      Repository
                    </a>
                    <a
                      href="https://builders.iopn.tech"
                      className="hover:text-brass"
                    >
                      Builders
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
