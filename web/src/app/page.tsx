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
    <div className="space-y-10">
      {/* HERO */}
      <section className="text-center py-12">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="dot dot-live"></span>
          <span
            className="text-[10px] font-mono uppercase"
            style={{ color: "var(--muted)", letterSpacing: "0.25em" }}
          >
            live · OPN testnet · season 1
          </span>
        </div>
        <h1
          className="font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight"
          style={{ color: "var(--paper)" }}
        >
          Write Once.
          <br />
          <em style={{ color: "var(--gold)", fontStyle: "italic" }}>
            Earn Forever.
          </em>
        </h1>
        <p
          className="mt-6 max-w-xl mx-auto leading-relaxed font-news"
          style={{ color: "rgba(244, 240, 232, 0.7)", fontStyle: "italic" }}
        >
          Decentralized publishing where every article is a yield-bearing
          asset. Tip, stake, and stream OPN — fully on-chain.
        </p>
        <div className="mt-8 flex gap-2 justify-center flex-wrap">
          <Link href="/write" className="btn btn-primary">
            ✍ Start Writing
          </Link>
          <Link href="#feed" className="btn btn-ghost">
            Explore Articles ↓
          </Link>
        </div>
      </section>

      {/* live stats strip */}
      <section className="grid grid-cols-3 gap-3 max-w-3xl mx-auto">
        <Stat label="Articles" value={total.toString()} />
        <Stat label="Protocol TVL" value={`${fmt(totalTvl, 2)} OPN`} accent />
        <Stat label="Chain ID" value="984" mono />
      </section>

      {/* WHY */}
      <section
        className="py-10 border-t border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-center mb-10">
          <div
            className="text-[10px] font-mono uppercase mb-3"
            style={{ color: "var(--muted)", letterSpacing: "0.3em" }}
          >
            why inkfi
          </div>
          <h2 className="font-serif text-3xl md:text-4xl">
            Three primitives.{" "}
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>
              One story.
            </em>
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
            <div key={f.num} className="panel">
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-3xl">{f.icon}</div>
                <div
                  className="font-mono text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {f.num}
                </div>
              </div>
              <div
                className="font-news text-xl mb-2"
                style={{ fontStyle: "italic" }}
              >
                {f.title}
              </div>
              <div
                className="text-sm leading-relaxed"
                style={{ color: "rgba(244, 240, 232, 0.65)" }}
              >
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEED */}
      <section id="feed">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="text-[10px] font-mono uppercase whitespace-nowrap"
            style={{ color: "var(--muted)", letterSpacing: "0.3em" }}
          >
            Latest articles
          </div>
          <div
            className="flex-1 h-px"
            style={{ background: "var(--border)" }}
          ></div>
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--muted)", letterSpacing: "0.1em" }}
          >
            sorted by recency · live from chain
          </span>
        </div>

        {total === 0 ? (
          <div className="panel text-center py-20">
            <div className="text-5xl mb-4">✍</div>
            <div
              className="font-news text-xl mb-2"
              style={{ fontStyle: "italic" }}
            >
              No articles yet.
            </div>
            <div
              className="text-sm mb-6"
              style={{ color: "var(--muted)" }}
            >
              Be the first writer on InkFi.
            </div>
            <Link href="/write" className="btn btn-primary">
              Publish the first article
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
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
    <div className="stat-card">
      <div
        className="text-[10px] font-mono uppercase"
        style={{ color: "var(--muted)", letterSpacing: "0.2em" }}
      >
        {label}
      </div>
      <div
        className={`mt-1.5 text-2xl ${mono ? "font-mono" : "font-serif"}`}
        style={{ color: accent ? "var(--gold-light)" : "var(--paper)" }}
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
      <div className="panel-soft p-5 space-y-3">
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

  const tvlVal = (tvl as bigint | undefined) ?? 0n;

  return (
    <Link
      href={`/article/${id}`}
      className="block animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article
        className="panel-soft p-5 h-full transition"
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          className="absolute top-3 right-4 font-serif"
          style={{
            fontSize: "44px",
            color: "rgba(255, 255, 255, 0.04)",
            lineHeight: 1,
          }}
        >
          {String(id).padStart(2, "0")}
        </div>
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <span className="pill pill-mute font-mono">#{id}</span>
          <span className="pill pill-mute">v{version}</span>
          {tvlVal > 0n && (
            <span className="pill pill-gold">
              <span className="dot dot-gold"></span>
              {fmt(tvlVal, 2)} staked
            </span>
          )}
        </div>
        <h3
          className="font-news text-xl leading-snug mb-3 line-clamp-2"
          style={{ fontStyle: "italic", color: "var(--paper)" }}
        >
          {local?.title ?? (
            <span style={{ color: "var(--muted)" }}>
              (off-chain title not in cache)
            </span>
          )}
        </h3>
        <p
          className="text-sm leading-relaxed line-clamp-3 mb-4"
          style={{ color: "rgba(244, 240, 232, 0.55)" }}
        >
          {local?.body?.slice(0, 200) ?? contentURI}
        </p>
        <div
          className="flex items-center justify-between text-xs pt-3"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          <span className="font-mono">{shortAddr(writer)}</span>
          <span style={{ color: "var(--gold)" }} className="font-mono">
            read →
          </span>
        </div>
      </article>
    </Link>
  );
}
