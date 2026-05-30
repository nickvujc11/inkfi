import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import Link from "next/link";
import ConnectBtn from "@/components/ConnectBtn";

export const metadata: Metadata = {
  title: "InkFi — Open Finance for Writers",
  description:
    "Decentralized publishing where every article is a yield-bearing asset. Tip, stake, and stream OPN to writers — fully on-chain on OPN Chain.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "InkFi — Open Finance for Writers",
    description:
      "Articles as yield-bearing assets on OPN Chain. Tip, stake, and stream OPN to writers.",
  },
};

function InkLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <svg
        viewBox="0 0 32 32"
        className="w-8 h-8 transition-transform group-hover:rotate-6"
        aria-hidden
      >
        <defs>
          <linearGradient id="ink-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="7" fill="#0b0d12" />
        <path
          d="M16 6 C 11 13, 9 18, 11 22 C 13 26, 19 26, 21 22 C 23 18, 21 13, 16 6 Z"
          fill="url(#ink-grad)"
        />
      </svg>
      <div className="leading-tight">
        <div className="font-serif font-bold text-lg tracking-tight">
          InkFi
        </div>
        <div className="text-[10px] text-ink-mute uppercase tracking-widest font-mono">
          on OPN Chain
        </div>
      </div>
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="sticky top-0 z-30 border-b border-ink-border backdrop-blur-md bg-ink-bg/80">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <InkLogo />
              <nav className="flex items-center gap-1 text-sm">
                <Link
                  href="/"
                  className="px-3 py-2 rounded-md hover:bg-white/5 text-ink-mute2 hover:text-white transition"
                >
                  Articles
                </Link>
                <Link
                  href="/write"
                  className="px-3 py-2 rounded-md hover:bg-white/5 text-ink-mute2 hover:text-white transition"
                >
                  Write
                </Link>
                <Link
                  href="/streams"
                  className="px-3 py-2 rounded-md hover:bg-white/5 text-ink-mute2 hover:text-white transition"
                >
                  Streams
                </Link>
                <div className="ml-3">
                  <ConnectBtn />
                </div>
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
            {children}
          </main>
          <footer className="border-t border-ink-border mt-24 py-10">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-ink-mute">
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-ink-paper">
                  InkFi
                </span>
                <span>·</span>
                <span>Open Finance for Writers</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <a
                  href="https://chain.iopn.io"
                  className="hover:text-ink-violet2"
                >
                  OPN Chain
                </a>
                <a
                  href="https://github.com/nickvujc11/inkfi"
                  className="hover:text-ink-violet2"
                >
                  GitHub
                </a>
                <a
                  href="https://builders.iopn.tech"
                  className="hover:text-ink-violet2"
                >
                  Builders Programme
                </a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
