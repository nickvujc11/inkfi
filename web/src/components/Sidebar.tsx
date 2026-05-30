"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import Logo from "./Logo";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi } from "@/lib/abis";
import { shortAddr } from "@/lib/format";

export default function Sidebar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  const { data: nextId } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "nextId",
    query: { refetchInterval: 8000 },
  });
  const total = nextId ? Number(nextId) : 0;

  const sections: {
    label: string;
    items: { href: string; icon: string; text: string; badge?: string }[];
  }[] = [
    {
      label: "Reading Room",
      items: [
        { href: "/", icon: "❦", text: "Articles" },
        { href: "/streams", icon: "∮", text: "Streams" },
      ],
    },
    {
      label: "Atelier",
      items: [
        { href: "/dashboard", icon: "✦", text: "Dashboard" },
        { href: "/write", icon: "✎", text: "Write" },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 border-r border-rule bg-walnut-deep/40">
      <div className="px-5 py-7">
        <Logo tagline />
      </div>

      {/* engraved divider */}
      <div className="px-5">
        <div className="rule"><span className="rule-dot" /></div>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.label} className="mb-7 px-4">
            <div className="label-engraved px-3 mb-2.5">{sec.label}</div>
            {sec.items.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== "/" && pathname.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`shelf-link ${active ? "active" : ""}`}
                >
                  <span className="text-base text-brass/70 w-4 text-center">
                    {it.icon}
                  </span>
                  <span className="font-display text-[15px]">{it.text}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Reader card / wallet card */}
        <div className="mx-4 mt-8">
          <div className="surface p-4">
            {isConnected && address ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-display text-[18px] text-paper border border-brass-edge"
                    style={{
                      background:
                        "linear-gradient(135deg, #b08d57 0%, #2a3a5e 100%)",
                    }}
                  >
                    {address.slice(2, 3).toUpperCase()}
                  </div>
                  <div className="leading-tight">
                    <div className="font-display text-sm text-paper">
                      Member
                    </div>
                    <div className="font-mono text-[10px] text-paper-mute">
                      {shortAddr(address)}
                    </div>
                  </div>
                </div>
                <div className="rule mb-3"><span className="rule-dot" /></div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-paper-mute text-center">
                  reading membership · active
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="font-display text-sm text-paper italic mb-1">
                  Become a member
                </div>
                <div className="text-[11px] text-paper-mute">
                  Connect to begin
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="p-5 border-t border-rule">
        <div className="flex items-center justify-between text-[10px]">
          <span className="stamp stamp-verdigris">
            <span className="dot dot-live" /> OPN · 984
          </span>
          <span className="font-mono text-paper-mute uppercase tracking-[0.18em]">
            vol. {total.toString().padStart(3, "0")}
          </span>
        </div>
      </div>
    </aside>
  );
}
