"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi, vaultAbi } from "@/lib/abis";
import { loadArticles, type LocalArticle } from "@/lib/articles";
import { fmt, shortAddr } from "@/lib/format";

export default function Home() {
  const { data: nextId } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "nextId",
    query: { refetchInterval: 6000 },
  });
  const total = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: total }, (_, i) => total - i);

  const { data: tvlReads } = useReadContracts({
    contracts: ids.map((id) => ({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "totalStaked",
      args: [BigInt(id)],
    })),
    query: { enabled: ids.length > 0, refetchInterval: 6000 },
  });

  let totalTvl = 0n;
  if (tvlReads) {
    for (const r of tvlReads) {
      if (r.status === "success") totalTvl += r.result as bigint;
    }
  }

  return (
    <div className="space-y-16">
      {/* HERO — masthead */}
      <section className="relative pt-8">
        <div className="text-center">
          <div className="label-engraved mb-6">No. I · Vol. {total.toString().padStart(2, "0")}</div>

          <h1 className="font-display text-[80px] md:text-[120px] leading-[0.88] tracking-tighter text-paper">
            Write Once.
            <br />
            <em className="text-brass italic font-medium">Earn Forever.</em>
          </h1>

          <div className="rule max-w-md mx-auto mt-8">
            <span className="rule-dot" />
          </div>

          <p className="mt-6 max-w-xl mx-auto font-display italic text-[20px] leading-relaxed text-paper-dim">
            An archive where every article becomes a yield-bearing volume.
            <br />
            Tip, stake, and stream <span className="text-brass">OPN</span> to writers — fully on-chain.
          </p>

          <div className="mt-10 flex gap-3 justify-center flex-wrap">
            <Link href="/write" className="btn btn-primary">
              ✎ Compose
            </Link>
            <Link href="#archive" className="btn btn-ghost">
              ❦ Browse Archive
            </Link>
          </div>
        </div>
      </section>

      {/* Live ledger strip */}
      <section className="grid grid-cols-3 gap-0 border-t border-b border-rule divide-x divide-rule">
        <Ledger label="Volumes" value={total.toString()} sub="published on-chain" />
        <Ledger label="Capital at rest" value={`${fmt(totalTvl, 2)}`} unit="OPN" sub="across all vaults" emphasis />
        <Ledger label="Network" value="OPN · 984" sub="testnet · live" mono />
      </section>

      {/* THREE PRIMITIVES */}
      <section>
        <div className="section-mast">
          <span className="num">I.</span>
          <span className="label">Three Primitives</span>
          <span className="meta">on-chain · soulbound</span>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-rule">
          {[
            {
              num: "i",
              icon: "✎",
              title: "Inscribe",
              body: "Compose. Mint a soulbound NFT. Authorship is etched into OPN Chain, immutable and permanent.",
            },
            {
              num: "ii",
              icon: "❦",
              title: "Endorse",
              body: "Stake OPN on writing you believe in. When tips arrive, stakers earn pro-rata yield.",
            },
            {
              num: "iii",
              icon: "∮",
              title: "Patronise",
              body: "Subscribe per-second to a writer. OPN flows continuously, made viable by sub-second finality.",
            },
          ].map((f) => (
            <div key={f.num} className="bg-walnut p-7 hover:bg-walnut-mid transition-colors duration-300">
              <div className="flex items-baseline justify-between mb-5">
                <div className="text-3xl text-brass">{f.icon}</div>
                <div className="font-display italic text-brass text-2xl">{f.num}</div>
              </div>
              <div className="font-display text-[28px] font-semibold mb-2 text-paper">
                {f.title}
              </div>
              <div className="text-paper-mute text-[14px] leading-relaxed">
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ARCHIVE */}
      <section id="archive">
        <div className="section-mast">
          <span className="num">II.</span>
          <span className="label">The Archive</span>
          <span className="meta">{total} {total === 1 ? "volume" : "volumes"} · sorted by recency</span>
        </div>

        {total === 0 ? (
          <div className="surface text-center py-24">
            <div className="text-7xl mb-6 text-brass">✎</div>
            <h3 className="font-display italic text-3xl mb-2">The archive is empty.</h3>
            <p className="text-paper-mute mb-8 max-w-md mx-auto">
              No volumes have been inscribed yet. Be the first to publish to OPN Chain.
            </p>
            <Link href="/write" className="btn btn-primary">
              ✎ Inscribe the first volume
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {ids.map((id, i) => (
              <ArticleCard key={id} id={id} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Ledger({
  label,
  value,
  sub,
  unit,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  unit?: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="px-6 py-7 text-center first:pl-2 last:pr-2">
      <div className="label-engraved mb-2">{label}</div>
      <div
        className={`leading-none ${mono ? "font-mono text-2xl" : "font-display text-5xl font-semibold"} ${
          emphasis ? "text-brass-bright" : "text-paper"
        }`}
      >
        {value}
        {unit && <span className="text-base ml-2 text-paper-mute font-mono">{unit}</span>}
      </div>
      {sub && (
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper-mute">
          {sub}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ id, index }: { id: number; index: number }) {
  const { data } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "articles",
    args: [BigInt(id)],
  });
  const { data: tvl } = useReadContract({
    address: ADDR.Vault,
    abi: vaultAbi,
    functionName: "totalStaked",
    args: [BigInt(id)],
    query: { refetchInterval: 8000 },
  });

  const [local, setLocal] = useState<LocalArticle | undefined>();
  useEffect(() => {
    setLocal(loadArticles()[id]);
  }, [id]);

  if (!data) {
    return (
      <div className="surface p-6 space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-2/3" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
      </div>
    );
  }

  const [writer, createdAt, version, contentURI] = data as readonly [
    `0x${string}`,
    bigint,
    number,
    string,
    `0x${string}`,
  ];
  const tvlVal = (tvl as bigint | undefined) ?? 0n;

  return (
    <Link
      href={`/article/${id}`}
      className="block animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <article className="surface p-6 h-full hover:bg-walnut-warm transition-colors duration-300 relative overflow-hidden">
        {/* big ghost roman numeral background */}
        <span
          aria-hidden
          className="absolute -top-2 -right-2 font-display italic text-brass/[0.07] pointer-events-none"
          style={{ fontSize: "120px", lineHeight: 1 }}
        >
          {toRoman(id)}
        </span>

        <div className="flex items-center gap-2 mb-4 relative z-10">
          <span className="stamp stamp-mute font-mono">
            № {String(id).padStart(3, "0")}
          </span>
          <span className="stamp stamp-mute">v{version}</span>
          {tvlVal > 0n && (
            <span className="stamp stamp-brass">
              <span className="dot dot-brass" />
              {fmt(tvlVal, 2)} OPN staked
            </span>
          )}
        </div>

        <h3 className="font-display italic text-[26px] leading-[1.15] mb-3 text-paper">
          {local?.title ?? (
            <span className="text-paper-mute">(off-chain title not in cache)</span>
          )}
        </h3>

        <p className="text-paper-mute text-[14px] leading-relaxed line-clamp-3 mb-5 font-body">
          {local?.body?.slice(0, 220) ?? contentURI}
        </p>

        <div className="rule mb-3"><span className="rule-dot" /></div>

        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
          <span className="text-paper-mute">{shortAddr(writer)}</span>
          <span className="text-brass">
            {new Date(Number(createdAt) * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-brass">read →</span>
        </div>
      </article>
    </Link>
  );
}

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function toRoman(n: number): string {
  let s = "";
  for (const [v, sym] of ROMAN) {
    while (n >= v) {
      s += sym;
      n -= v;
    }
  }
  return s || "I";
}
