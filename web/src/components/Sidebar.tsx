"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import Logo from "./Logo";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";

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

  const sections = [
    {
      label: "Overview",
      items: [
        { href: "/", icon: "◈", text: "Articles" },
        { href: "/dashboard", icon: "▦", text: "Dashboard" },
        { href: "/streams", icon: "∞", text: "Streams", badge: "live" },
      ],
    },
    {
      label: "Build",
      items: [
        { href: "/write", icon: "✍", text: "Write" },
      ],
    },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-[240px] flex-shrink-0 border-r"
      style={{ borderColor: "var(--border)", background: "rgba(0,0,0,0.2)" }}
    >
      <div className="px-5 py-6">
        <Logo tagline />
      </div>

      <div
        className="h-px mx-5"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--gold), transparent)",
          opacity: 0.3,
        }}
      />

      <nav className="flex-1 py-6 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.label} className="mb-7 px-5">
            <div className="nav-section-label">{sec.label}</div>
            {sec.items.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== "/" && pathname.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`nav-item ${active ? "active" : ""}`}
                >
                  <span className="text-base opacity-70">{it.icon}</span>
                  <span>{it.text}</span>
                  {it.badge === "live" && (
                    <span
                      className="nav-badge"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: "var(--yield)",
                        border: "1px solid rgba(16,185,129,0.2)",
                      }}
                    >
                      live
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* writer card */}
        <div className="mx-5 mb-5">
          <div
            className="p-4 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {isConnected && address ? (
              <>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mb-2 font-serif text-[15px] text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), var(--gold))",
                  }}
                >
                  {address.slice(2, 3).toUpperCase()}
                </div>
                <div className="font-news text-[14px]">
                  {shortAddr(address)}
                </div>
                <div
                  className="text-[10px] mt-0.5 font-mono"
                  style={{ color: "var(--muted)", letterSpacing: "0.05em" }}
                >
                  on OPN Chain
                </div>
              </>
            ) : (
              <div
                className="text-xs text-center py-2"
                style={{ color: "var(--muted)" }}
              >
                Connect wallet to begin
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="p-5 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between text-[10px]">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-mono"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              letterSpacing: "0.1em",
            }}
          >
            <span className="dot dot-live"></span>
            OPN · 984
          </div>
          <div
            className="font-mono"
            style={{ color: "var(--muted)", letterSpacing: "0.1em" }}
          >
            {total} articles
          </div>
        </div>
      </div>
    </aside>
  );
}
