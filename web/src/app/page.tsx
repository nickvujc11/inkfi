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
    query: { refetchInterval: 5000 },
  });

  const total = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: total }, (_, i) => total - i);

  // Aggregate TVL across all articles (one read per article)
  const { data: tvlReads } = useReadContracts({
    contracts: ids.map((id) => ({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "totalStaked",
      args: [BigInt(id)],
    })),
    query: { enabled: ids.length > 0, refetchInterval: 5000 },
  });

  let totalTvl = 0n;
  if (tvlReads) {
    for (const r of tvlReads) {
      if (r.status === "success") totalTvl += r.result as bigint;
    }
  }

  return (
    <div>
      {/* HERO */}
      <section className="py-20 md:py-28 text-center relative">
        <div className="ink-chip mb-8 mx-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-mint animate-pulse-soft" />
          live on OPN Chain testnet · season 1
        </div>
        <h1 className="font-serif text-6xl md:text-8xl font-bold tracking-tighter leading-[0.95]">
          Write Once.
          <br />
          <span className="relative inline-block">
            <span className="bg-gradient-to-br from-ink-violet2 to-ink-violet bg-clip-text text-transparent">
              Earn Forever.
            </span>
            <svg
              className="absolute -bottom-3 left-0 w-full"
              viewBox="0 0 400 12"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M2 8 C 80 2, 200 12, 398 4"
                stroke="url(#u-grad)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                opacity="0.7"
              />
              <defs>
                <linearGradient id="u-grad">
                  <stop offset="0" stopColor="#a78bfa" />
                  <stop offset="1" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>
        <p className="text-ink-mute2 mt-8 max-w-xl mx-auto text-lg leading-relaxed">
          Decentralized publishing where every article is a yield-bearing
          asset. Tip, stake, and stream OPN — fully on-chain.
        </p>
        <div className="mt-10 flex gap-3 justify-center flex-wrap">
          <Link href="/write" className="ink-btn">
            ✍ Start Writing
          </Link>
          <Link href="#feed" className="ink-btn-ghost">
            Explore Articles ↓
          </Link>
        </div>

        {/* Live stats strip */}
        <div className="mt-14 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          <Stat label="Articles" value={total.toString()} />
          <Stat label="TVL" value={`${fmt(totalTvl, 2)} OPN`} accent />
          <Stat label="Chain ID" value="984" mono />
        </div>
      </section>

      {/* WHY */}
      <section className="py-16 border-t border-ink-border">
        <div className="text-center mb-12">
          <div className="ink-chip mx-auto mb-4">why inkfi</div>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold">
            Three primitives. <span className="text-ink-violet2">One story.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              num: "01",
              icon: "✍",
              title: "Write",
              body: "Distraction-free editor. Publish to OPN Chain. Each article becomes a soulbound NFT proving immutable authorship.",
            },
            {
              num: "02",
              icon: "◈",
              title: "Stake",
              body: "Fans deposit OPN on articles they believe in. When the article gets tipped, stakers earn yield pro-rata.",
            },
            {
              num: "03",
              icon: "∞",
              title: "Stream",
              body: "Subscribers stream OPN to writers per second. Continuous income, made viable by OPN's sub-second finality.",
            },
          ].map((f) => (
            <div key={f.num} className="ink-card p-6 ink-card-hover">
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-4xl">{f.icon}</div>
                <div className="font-mono text-xs text-ink-mute">{f.num}</div>
              </div>
              <div className="font-serif font-semibold text-xl mb-2">
                {f.title}
              </div>
              <div className="text-ink-mute2 text-sm leading-relaxed">
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEED */}
      <section id="feed" className="py-16 border-t border-ink-border">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="ink-chip mb-3">latest</div>
            <h2 className="font-serif text-4xl font-semibold">Articles</h2>
          </div>
          <span className="text-ink-mute text-sm font-mono">
            sorted by recency · live from chain
          </span>
        </div>

        {total === 0 ? (
          <div className="ink-card p-16 text-center">
            <div className="text-5xl mb-4">✍</div>
            <div className="font-serif text-xl mb-2">No articles yet.</div>
            <div className="text-ink-mute mb-6">
              Be the first writer on InkFi.
            </div>
            <Link href="/write" className="ink-btn">
              Publish the first article
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {ids.map((id, i) => (
              <ArticleCard key={id} id={id} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="ink-stat text-left">
      <div className="text-[10px] uppercase tracking-widest text-ink-mute font-mono">
        {label}
      </div>
      <div
        className={`mt-1 ${mono ? "font-mono" : "font-serif"} text-xl font-semibold ${
          accent ? "text-ink-violet2" : "text-ink-paper"
        }`}
      >
        {value}
      </div>
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
      <div className="ink-card p-6 space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-6 w-2/3" />
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

  return (
    <Link
      href={`/article/${id}`}
      className="block animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article className="ink-card ink-card-hover p-6 h-full">
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-ink-mute">#{id}</span>
            <span className="ink-chip">v{version}</span>
            {(tvl as bigint | undefined) && (tvl as bigint) > 0n && (
              <span className="ink-chip" style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}>
                ◈ {fmt(tvl as bigint, 2)} staked
              </span>
            )}
          </div>
          <span className="text-ink-mute font-mono">
            {new Date(Number(createdAt) * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <h3 className="font-serif text-2xl font-semibold leading-tight line-clamp-2 mb-3">
          {local?.title ?? <span className="text-ink-mute italic">(off-chain title not in cache)</span>}
        </h3>
        <p className="text-ink-mute2 text-sm leading-relaxed line-clamp-3 mb-4">
          {local?.body?.slice(0, 240) ?? contentURI}
        </p>
        <div className="flex items-center justify-between text-xs text-ink-mute pt-3 border-t border-ink-border">
          <span className="font-mono">{shortAddr(writer)}</span>
          <span className="text-ink-violet2 font-medium">Read →</span>
        </div>
      </article>
    </Link>
  );
}
