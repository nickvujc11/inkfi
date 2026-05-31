"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi, vaultAbi } from "@/lib/abis";
import { loadArticles, type LocalArticle } from "@/lib/articles";
import { fmt, shortAddr } from "@/lib/format";
import Sparkline from "@/components/Sparkline";
import CountUp from "@/components/CountUp";

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

  const totalTvlNumber = Number(totalTvl) / 1e18;

  return (
    <div className="page-in relative">
      {/* Decorative ink blots */}
      <div
        className="ink-blot"
        style={{ width: 380, height: 380, top: -60, right: -120 }}
      />
      <div
        className="ink-blot"
        style={{ width: 280, height: 280, top: 600, left: -80, opacity: 0.6 }}
      />

      {/* MASTHEAD */}
      <section className="text-center pb-16 relative">
        <div className="hero-flourish mb-6">❦</div>
        <div className="kicker mb-4">
          Volume I · Number One · MMXXVI
        </div>
        <div className="engraved-double max-w-2xl mx-auto mb-10" />
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(48px, 8vw, 100px)",
            lineHeight: 0.94,
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
              backgroundImage:
                "linear-gradient(180deg, var(--brass-3), var(--brass))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Every Volume Earns
          </span>
        </h1>
        <div className="engraved-double max-w-2xl mx-auto mt-10 mb-6" />

        <p
          className="hero-quote max-w-3xl mx-auto"
          style={{ fontSize: "clamp(18px, 1.6vw, 22px)" }}
        >
          Tip writers. Stake on volumes. Earn while you read.
        </p>
        <p
          className="font-display max-w-2xl mx-auto leading-relaxed mt-3"
          style={{
            fontSize: "1.05rem",
            fontStyle: "italic",
            color: "var(--parchment-3)",
          }}
        >
          A decentralized library of letters where every word is anchored on
          OPN Chain, and every volume can be endowed, subscribed to, and
          collected from.
        </p>

        <div className="mt-9 flex gap-3 justify-center flex-wrap">
          <Link href="/staking" className="btn btn-brass">
            ❀ Endow a Volume
          </Link>
          <Link href="/write" className="btn btn-ghost">
            ✒ Take Up the Pen
          </Link>
          <Link href="#stacks" className="btn btn-ghost">
            Browse the Stacks ↓
          </Link>
        </div>
      </section>

      {/* GRAND STAT TILES */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-20">
        <GrandStat
          label="Volumes Inscribed"
          value={total}
          decimals={0}
          watermark="I"
        />
        <GrandStat
          label="Capital at Letters"
          value={totalTvlNumber}
          decimals={2}
          suffix="OPN"
          accent
          watermark="II"
        />
        <GrandStat
          label="Chain"
          valueText="OPN · 984"
          watermark="III"
          mono
        />
      </section>

      <div className="ornament mb-16">❦ ⁂ ❦</div>

      {/* HOW THE LIBRARY PAYS */}
      <section className="mb-24">
        <div className="text-center mb-12">
          <div className="section-label mb-3">three primitives</div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontStyle: "italic",
              color: "var(--parchment)",
            }}
          >
            How the Library Pays
          </h2>
        </div>
        <div className="primitives-grid">
          <PrimitiveCard
            featured
            num="I."
            icon="✒"
            title="Inscribe"
            body="Each article is a soulbound volume. The writer's name is etched into its spine permanently — authorship cannot be sold, transferred, or laundered. Versions are pushed forward, never overwritten."
            tag="for the writer"
          />
          <PrimitiveCard
            num="II."
            icon="❀"
            title="Endow"
            body="Readers endow a volume with capital. When the volume is tipped, endowers earn a pro-rata share through an accumulator pool."
            tag="for the patron"
          />
          <PrimitiveCard
            num="III."
            icon="∾"
            title="Subscribe"
            body="Patrons pledge OPN per second to a writer. The pledge flows continuously, and can be rescinded at will."
            tag="for the subscriber"
          />
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
                fontSize: "clamp(32px, 4vw, 48px)",
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
          <div className="shelf-card text-center py-20 relative overflow-hidden">
            <div
              className="font-display absolute"
              style={{
                color: "var(--brass)",
                opacity: 0.05,
                fontSize: 280,
                top: -60,
                right: -40,
                fontStyle: "italic",
                lineHeight: 0.85,
              }}
            >
              ❦
            </div>
            <div
              className="font-display text-7xl mb-3 relative"
              style={{ color: "var(--brass)", opacity: 0.4 }}
            >
              ✒
            </div>
            <div
              className="font-display italic text-2xl mb-2 relative"
              style={{ color: "var(--parchment)" }}
            >
              The shelves stand empty.
            </div>
            <div
              className="text-sm mb-7 font-display italic relative"
              style={{ color: "var(--parchment-3)" }}
            >
              Be the first scribe to inscribe a volume here.
            </div>
            <Link href="/write" className="btn btn-brass relative">
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

function GrandStat({
  label,
  value,
  valueText,
  decimals = 0,
  suffix,
  accent,
  mono,
  watermark,
}: {
  label: string;
  value?: number;
  valueText?: string;
  decimals?: number;
  suffix?: string;
  accent?: boolean;
  mono?: boolean;
  watermark?: string;
}) {
  // Decorative subtle sparkline (deterministic from label so it's stable)
  const seed = label.length;
  const sample = Array.from({ length: 12 }, (_, i) =>
    0.5 + 0.5 * Math.sin((i + seed) * 0.7) + 0.15 * Math.cos((i + seed) * 1.3)
  );

  return (
    <div className="stat-grand book-lift">
      {watermark && <div className="stat-watermark">{watermark}</div>}
      <div className="kicker mb-3">{label}</div>
      <div
        className={`${mono ? "font-mono" : "font-display"}`}
        style={{
          color: accent ? "var(--brass-2)" : "var(--parchment)",
          fontSize: mono ? "1.7rem" : "2.6rem",
          letterSpacing: "-0.01em",
          lineHeight: 1,
          fontStyle: mono ? "normal" : accent ? "italic" : "normal",
        }}
      >
        {valueText !== undefined ? (
          valueText
        ) : (
          <CountUp value={value ?? 0} decimals={decimals} suffix={suffix} />
        )}
      </div>
      <div className="stat-spark">
        <Sparkline
          data={sample}
          color={accent ? "var(--brass-2)" : "var(--parchment-3)"}
          height={32}
        />
      </div>
      <div className="stat-rule" />
    </div>
  );
}

function PrimitiveCard({
  num,
  icon,
  title,
  body,
  tag,
  featured,
}: {
  num: string;
  icon: string;
  title: string;
  body: string;
  tag: string;
  featured?: boolean;
}) {
  return (
    <div className={`primitive-card book-lift ${featured ? "featured" : ""}`}>
      <div className="roman">{num}</div>
      <div className="flex items-baseline justify-between mb-5 relative z-10">
        <span
          className="font-display"
          style={{
            color: "var(--brass-2)",
            fontStyle: "italic",
            fontSize: featured ? "2.3rem" : "1.9rem",
          }}
        >
          {num}
        </span>
        <span
          className="font-display"
          style={{
            color: "var(--brass)",
            fontSize: featured ? "1.9rem" : "1.55rem",
          }}
        >
          {icon}
        </span>
      </div>
      <div
        className="font-display mb-3 relative z-10"
        style={{
          color: "var(--parchment)",
          fontSize: featured ? "2.1rem" : "1.7rem",
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
      <div
        className="font-display leading-relaxed relative z-10 flex-1"
        style={{
          color: "var(--parchment-3)",
          fontSize: featured ? "1.05rem" : "0.98rem",
        }}
      >
        {body}
      </div>
      <div
        className="kicker mt-5 pt-4 relative z-10"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {tag}
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
  const hasTvl = tvlVal > 0n;

  return (
    <Link
      href={`/article/${id}`}
      className="block animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article
        className="shelf-card spine-card book-lift p-6 h-full relative overflow-hidden"
        style={{ minHeight: "240px", paddingLeft: "26px" }}
      >
        {/* Wax seal for active TVL */}
        {hasTvl && (
          <div className="wax-seal" style={{ top: 18, right: 18 }}>
            <div>
              SEAL
              <br />
              IO
            </div>
          </div>
        )}

        {/* Folio number watermark */}
        <div
          aria-hidden
          className="absolute font-display"
          style={{
            top: hasTvl ? "auto" : "10px",
            bottom: hasTvl ? "-30px" : "auto",
            right: hasTvl ? "-10px" : "20px",
            fontSize: "100px",
            color: "var(--brass)",
            opacity: 0.05,
            lineHeight: 1,
            fontStyle: "italic",
            pointerEvents: "none",
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
        </div>

        <h3
          className="font-display mb-3 line-clamp-2 relative z-10"
          style={{
            fontSize: "1.55rem",
            lineHeight: 1.2,
            color: "var(--parchment)",
            fontStyle: "italic",
          }}
        >
          {local?.title ?? (
            <span style={{ color: "var(--muted)" }}>(an untitled volume)</span>
          )}
        </h3>

        <p
          className="font-display leading-relaxed line-clamp-3 mb-5 relative z-10"
          style={{
            color: "var(--parchment-3)",
            fontSize: "0.96rem",
          }}
        >
          {local?.body?.slice(0, 220) ?? contentURI}
        </p>

        <div
          className="flex items-center justify-between text-xs pt-3 mt-auto relative z-10"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--parchment-3)",
          }}
        >
          <span className="font-mono">{shortAddr(writer)}</span>
          <span className="flex items-center gap-2">
            {hasTvl && (
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--stamp-2)" }}
              >
                ◆ {fmt(tvlVal, 2)} OPN
              </span>
            )}
            <span
              className="font-display italic"
              style={{ color: "var(--brass-2)" }}
            >
              Read on →
            </span>
          </span>
        </div>
      </article>
    </Link>
  );
}
