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
    <div>
      {/* MASTHEAD */}
      <section className="text-center pb-16">
        <div className="kicker mb-6">
          ❦ Volume I · Number One · MMXXVI ❦
        </div>
        <div className="engraved-double max-w-2xl mx-auto mb-10" />
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            color: "var(--parchment)",
          }}
        >
          A Library Where
          <br />
          <span
            style={{
              fontStyle: "italic",
              color: "var(--brass-2)",
              fontWeight: 500,
            }}
          >
            Every Volume Earns
          </span>
        </h1>
        <div className="engraved-double max-w-2xl mx-auto mt-10 mb-8" />

        <p
          className="font-display max-w-xl mx-auto leading-relaxed"
          style={{
            fontSize: "1.18rem",
            fontStyle: "italic",
            color: "var(--parchment-3)",
          }}
        >
          A decentralized library of letters where readers stake on the
          articles they believe in, writers receive subscriptions per second,
          and every word is anchored on OPN Chain.
        </p>

        <div className="mt-9 flex gap-3 justify-center flex-wrap">
          <Link href="/write" className="btn btn-brass">
            ✒ Take Up the Pen
          </Link>
          <Link href="#stacks" className="btn btn-ghost">
            Browse the Stacks ↓
          </Link>
        </div>
      </section>

      {/* CARD CATALOGUE — 3 stat tiles */}
      <section className="grid grid-cols-3 gap-3 max-w-3xl mx-auto mb-16">
        <Stat label="Volumes Inscribed" value={total.toString()} />
        <Stat
          label="Capital at Letters"
          value={fmt(totalTvl, 2)}
          suffix="OPN"
          accent
        />
        <Stat label="Chain" value="OPN · 984" mono />
      </section>

      {/* WHY — 3 prinsip */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <div className="section-label mb-2">three primitives</div>
          <h2
            className="font-display"
            style={{
              fontSize: "2.5rem",
              fontStyle: "italic",
              color: "var(--parchment)",
            }}
          >
            How the Library Pays
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              num: "I.",
              title: "Inscribe",
              body: "Each article is a soulbound volume — the writer's name is etched into its spine permanently. Authorship cannot be sold or laundered.",
              icon: "✒",
            },
            {
              num: "II.",
              title: "Endow",
              body: "Readers endow a volume with capital. When the volume is tipped, endowers earn a pro-rata share through an accumulator pool.",
              icon: "❀",
            },
            {
              num: "III.",
              title: "Subscribe",
              body: "Patrons pledge a per-second stream of OPN to a writer. The pledge flows continuously and can be cancelled at will.",
              icon: "∾",
            },
          ].map((f) => (
            <div key={f.num} className="shelf-card p-7">
              <div className="flex items-baseline justify-between mb-5">
                <span
                  className="font-display text-3xl"
                  style={{ color: "var(--brass-2)", fontStyle: "italic" }}
                >
                  {f.num}
                </span>
                <span
                  className="font-display text-2xl"
                  style={{ color: "var(--brass)" }}
                >
                  {f.icon}
                </span>
              </div>
              <div
                className="font-display text-2xl mb-2.5"
                style={{ color: "var(--parchment)" }}
              >
                {f.title}
              </div>
              <div
                className="font-display leading-relaxed"
                style={{
                  color: "var(--parchment-3)",
                  fontSize: "1.02rem",
                }}
              >
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ornament mb-12">❦ ⁂ ❦</div>

      {/* THE STACKS — article feed */}
      <section id="stacks">
        <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
          <div>
            <div className="section-label mb-2">the stacks</div>
            <h2
              className="font-display"
              style={{
                fontSize: "2.5rem",
                fontStyle: "italic",
                color: "var(--parchment)",
              }}
            >
              Volumes on the Shelves
            </h2>
          </div>
          <span
            className="font-mono text-[11px]"
            style={{
              color: "var(--parchment-3)",
              letterSpacing: "0.1em",
            }}
          >
            sorted by recency · live from chain
          </span>
        </div>
        <div className="engraved-rule mb-6" />

        {total === 0 ? (
          <div className="shelf-card text-center py-20">
            <div
              className="font-display text-7xl mb-3"
              style={{ color: "var(--brass)", opacity: 0.3 }}
            >
              ✒
            </div>
            <div
              className="font-display italic text-2xl mb-2"
              style={{ color: "var(--parchment)" }}
            >
              The shelves stand empty.
            </div>
            <div
              className="text-sm mb-7 font-display italic"
              style={{ color: "var(--parchment-3)" }}
            >
              Be the first scribe to inscribe a volume here.
            </div>
            <Link href="/write" className="btn btn-brass">
              ✒ Inscribe the first volume
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
  suffix,
  mono,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="shelf-card p-5">
      <div className="kicker mb-2">{label}</div>
      <div
        className={`${mono ? "font-mono text-xl" : "font-display text-3xl"}`}
        style={{
          color: accent ? "var(--brass-2)" : "var(--parchment)",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {value}
        {suffix && (
          <span
            className="font-mono text-xs ml-1.5"
            style={{ color: "var(--muted)" }}
          >
            {suffix}
          </span>
        )}
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
      <div className="shelf-card p-6 space-y-3">
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
  const folioNum = String(id).padStart(2, "0");

  return (
    <Link
      href={`/article/${id}`}
      className="block animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article
        className="shelf-card shelf-card-hover p-6 h-full relative overflow-hidden"
        style={{ minHeight: "230px" }}
      >
        {/* Folio number watermark */}
        <div
          aria-hidden
          className="absolute font-display"
          style={{
            top: "10px",
            right: "16px",
            fontSize: "60px",
            color: "var(--brass)",
            opacity: 0.06,
            lineHeight: 1,
            fontStyle: "italic",
          }}
        >
          {folioNum}
        </div>

        {/* Stamps row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap relative z-10">
          <span
            className="font-mono text-[10px]"
            style={{
              color: "var(--brass)",
              letterSpacing: "0.2em",
            }}
          >
            FOLIO {folioNum}
          </span>
          <span style={{ color: "var(--muted)" }}>·</span>
          <span className="stamp stamp-muted">v{version}</span>
          {tvlVal > 0n && (
            <span className="stamp stamp-stamp">
              ◆ {fmt(tvlVal, 2)} OPN
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-display mb-3 line-clamp-2"
          style={{
            fontSize: "1.55rem",
            lineHeight: 1.2,
            color: "var(--parchment)",
            fontStyle: "italic",
          }}
        >
          {local?.title ?? (
            <span style={{ color: "var(--muted)" }}>
              (an untitled volume)
            </span>
          )}
        </h3>

        {/* Body preview */}
        <p
          className="font-display leading-relaxed line-clamp-3 mb-5"
          style={{
            color: "var(--parchment-3)",
            fontSize: "0.96rem",
          }}
        >
          {local?.body?.slice(0, 220) ?? contentURI}
        </p>

        <div
          className="flex items-center justify-between text-xs pt-3 mt-auto"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--parchment-3)",
          }}
        >
          <span className="font-mono">{shortAddr(writer)}</span>
          <span
            className="font-display italic"
            style={{ color: "var(--brass-2)" }}
          >
            Read on →
          </span>
        </div>
      </article>
    </Link>
  );
}
