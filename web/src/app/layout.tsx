import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import Link from "next/link";
import ConnectBtn from "@/components/ConnectBtn";

export const metadata: Metadata = {
  title: "InkFi — Open Finance for Writers",
  description:
    "Decentralized publishing where every article is a yield-bearing asset. Built on OPN Chain.",
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
          <header className="border-b border-ink-border">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">◈</span>
                <span className="font-bold text-lg tracking-tight">InkFi</span>
                <span className="text-ink-mute text-xs ml-2">on OPN Chain</span>
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/" className="hover:text-ink-accent">
                  Articles
                </Link>
                <Link href="/write" className="hover:text-ink-accent">
                  Write
                </Link>
                <Link href="/streams" className="hover:text-ink-accent">
                  Streams
                </Link>
                <ConnectBtn />
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
          <footer className="border-t border-ink-border mt-20 py-8 text-center text-ink-mute text-sm">
            <div>
              ◈ InkFi · Open Finance for Writers · Built on{" "}
              <a
                href="https://chain.iopn.io"
                className="text-ink-accent hover:underline"
              >
                OPN Chain
              </a>
            </div>
            <div className="mt-2 text-xs">
              Submission for IOPn Builders Programme · Season 1 · DeFi & Open
              Finance
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
