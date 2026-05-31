"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import Logo from "./Logo";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi, vaultAbi } from "@/lib/abis";
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
  const ids = Array.from({ length: total }, (_, i) => i + 1);

  // Read each user's stake + pending across all vaults to surface in sidebar
  const { data: positions } = useReadContracts({
    contracts:
      address && ids.length > 0
        ? ids.flatMap(
            (id) =>
              [
                {
                  address: ADDR.Vault,
                  abi: vaultAbi,
                  functionName: "userInfo",
                  args: [BigInt(id), address],
                } as const,
                {
                  address: ADDR.Vault,
                  abi: vaultAbi,
                  functionName: "pendingReward",
                  args: [BigInt(id), address],
                } as const,
              ] as const
          )
        : [],
    query: { enabled: !!address && ids.length > 0, refetchInterval: 5000 },
  });

  let myTotalStake = 0n;
  let myTotalPending = 0n;
  if (positions) {
    for (let i = 0; i < ids.length; i++) {
      const ui = positions[i * 2];
      const p = positions[i * 2 + 1];
      if (ui?.status === "success") {
        myTotalStake += (ui.result as readonly [bigint, bigint, bigint])[0];
      }
      if (p?.status === "success") {
        myTotalPending += p.result as bigint;
      }
    }
  }

  const sections = [
    {
      label: "Reading Room",
      items: [
        { href: "/", icon: "❦", text: "The Library" },
        { href: "/staking", icon: "❀", text: "Endowments" },
        { href: "/streams", icon: "∾", text: "Streams" },
      ],
    },
    {
      label: "Writing Desk",
      items: [
        { href: "/dashboard", icon: "✚", text: "Ledger" },
        { href: "/write", icon: "✒", text: "Inkwell" },
      ],
    },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-[244px] flex-shrink-0"
      style={{
        borderRight: "1px solid var(--border)",
        background:
          "linear-gradient(180deg, rgba(176, 141, 87, 0.03), transparent 30%), rgba(0, 0, 0, 0.25)",
      }}
    >
      <div className="px-5 py-6">
        <Logo tagline />
      </div>

      <div
        className="mx-5"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, var(--brass), transparent)",
          opacity: 0.3,
        }}
      />

      <nav className="flex-1 py-6 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.label} className="mb-7 px-5">
            <div className="section-label mb-2.5 px-3.5">{sec.label}</div>
            {sec.items.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== "/" && pathname.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`shelf-nav-item ${active ? "active" : ""}`}
                >
                  <span
                    className="text-base font-display"
                    style={{
                      color: active ? "var(--brass-2)" : "var(--brass)",
                    }}
                  >
                    {it.icon}
                  </span>
                  <span>{it.text}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Endowment summary — appears whenever user has any stake/pending */}
        {isConnected && (myTotalStake > 0n || myTotalPending > 0n) && (
          <div className="mx-5 mb-5">
            <div
              className="p-4 rounded-sm relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(176, 141, 87, 0.1), rgba(0, 0, 0, 0.4))",
                border: "1px solid rgba(176, 141, 87, 0.3)",
              }}
            >
              <div className="section-label mb-3 text-[8px]">
                Endowment summary
              </div>
              <div className="space-y-2.5">
                <SidebarStat
                  label="Endowed"
                  value={fmt(myTotalStake, 3)}
                  unit="WOPN"
                />
                <SidebarStat
                  label="Pending"
                  value={fmt(myTotalPending, 5)}
                  unit="OPN"
                  accent
                />
              </div>
              <Link
                href="/staking"
                className="block mt-3 text-center text-[11px] font-mono py-1.5 rounded-sm"
                style={{
                  background: "rgba(176, 141, 87, 0.18)",
                  color: "var(--brass-2)",
                  letterSpacing: "0.06em",
                }}
              >
                Manage →
              </Link>
            </div>
          </div>
        )}

        {/* Membership card */}
        <div className="mx-5 mb-5">
          <div
            className="p-4 rounded-sm relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(176, 141, 87, 0.08), rgba(0, 0, 0, 0.3))",
              border: "1px solid var(--border-strong)",
            }}
          >
            <div
              className="absolute top-2 right-2 font-mono text-[8px] tracking-widest"
              style={{ color: "var(--brass)" }}
            >
              MMXXVI
            </div>
            <div className="section-label mb-2 text-[8px]">Membership</div>
            {isConnected && address ? (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 flex items-center justify-center font-display text-[16px] rounded-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--brass), var(--leather))",
                    color: "var(--parchment)",
                    border: "1px solid var(--brass)",
                  }}
                >
                  {address.slice(2, 3).toUpperCase()}
                </div>
                <div>
                  <div
                    className="font-display text-[14px] italic"
                    style={{ color: "var(--parchment)" }}
                  >
                    {shortAddr(address)}
                  </div>
                  <div
                    className="font-mono text-[9px]"
                    style={{ color: "var(--muted)", letterSpacing: "0.1em" }}
                  >
                    enrolled · OPN 984
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="text-xs italic font-display py-1"
                style={{ color: "var(--parchment-3)" }}
              >
                Sign the register to enter
              </div>
            )}
          </div>
        </div>
      </nav>

      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="dot dot-live"></span>
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--parchment-3)", letterSpacing: "0.15em" }}
          >
            OPN · 984
          </span>
        </div>
        <span
          className="font-mono text-[10px]"
          style={{ color: "var(--muted)", letterSpacing: "0.1em" }}
        >
          {total} vol.
        </span>
      </div>
    </aside>
  );
}

function SidebarStat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        className="font-mono text-[9px] uppercase"
        style={{ color: "var(--muted)", letterSpacing: "0.18em" }}
      >
        {label}
      </span>
      <span
        className="font-display italic"
        style={{
          color: accent ? "var(--brass-2)" : "var(--parchment)",
          fontSize: "1rem",
          lineHeight: 1,
        }}
      >
        {value}
        <span
          className="font-mono text-[9px] ml-1"
          style={{ color: "var(--muted)", fontStyle: "normal" }}
        >
          {unit}
        </span>
      </span>
    </div>
  );
}
