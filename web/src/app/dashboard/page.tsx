"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useBlockNumber,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi, vaultAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";
import { loadArticles } from "@/lib/articles";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: block } = useBlockNumber({ watch: true });

  const { data: nextId } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "nextId",
    query: { refetchInterval: 6000 },
  });
  const total = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: total }, (_, i) => i + 1);

  const articleReads = useReadContracts({
    contracts: ids.flatMap((id) => [
      {
        address: ADDR.ArticleNFT,
        abi: articleNftAbi,
        functionName: "articles",
        args: [BigInt(id)],
      } as const,
      {
        address: ADDR.Vault,
        abi: vaultAbi,
        functionName: "totalStaked",
        args: [BigInt(id)],
      } as const,
      ...(address
        ? ([
            {
              address: ADDR.Vault,
              abi: vaultAbi,
              functionName: "pendingReward",
              args: [BigInt(id), address],
            } as const,
            {
              address: ADDR.Vault,
              abi: vaultAbi,
              functionName: "userInfo",
              args: [BigInt(id), address],
            } as const,
          ] as const)
        : []),
    ]),
    query: { enabled: ids.length > 0, refetchInterval: 5000 },
  });

  const stride = address ? 4 : 2;
  type Row = {
    id: number;
    writer: `0x${string}`;
    createdAt: bigint;
    version: number;
    contentURI: string;
    totalStaked: bigint;
    myPending: bigint;
    myStaked: bigint;
  };

  const rows: Row[] = [];
  if (articleReads.data) {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const off = i * stride;
      const a = articleReads.data[off];
      const ts = articleReads.data[off + 1];
      const pending = address ? articleReads.data[off + 2] : null;
      const ui = address ? articleReads.data[off + 3] : null;
      if (a?.status !== "success" || ts?.status !== "success") continue;
      const tup = a.result as readonly [
        `0x${string}`,
        bigint,
        number,
        string,
        `0x${string}`,
      ];
      rows.push({
        id,
        writer: tup[0],
        createdAt: tup[1],
        version: tup[2],
        contentURI: tup[3],
        totalStaked: ts.result as bigint,
        myPending:
          pending && pending.status === "success"
            ? (pending.result as bigint)
            : 0n,
        myStaked:
          ui && ui.status === "success"
            ? ((ui.result as readonly [bigint, bigint, bigint])[0] as bigint)
            : 0n,
      });
    }
  }

  const myArticles = address
    ? rows.filter((r) => r.writer.toLowerCase() === address.toLowerCase())
    : [];
  const myStaked = address ? rows.filter((r) => r.myStaked > 0n) : [];

  const totalProtocolTvl = rows.reduce((s, r) => s + r.totalStaked, 0n);
  const myTotalStake = myStaked.reduce((s, r) => s + r.myStaked, 0n);
  const myTotalPending = myStaked.reduce((s, r) => s + r.myPending, 0n);
  const myArticlesTvl = myArticles.reduce((s, r) => s + r.totalStaked, 0n);

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="kicker mb-2">The Reader's Ledger</div>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              lineHeight: 1,
              color: "var(--parchment)",
            }}
          >
            Your{" "}
            <span style={{ color: "var(--brass-2)", fontStyle: "italic" }}>
              Ledger
            </span>
          </h1>
          <p
            className="font-mono text-[11px] mt-3"
            style={{ color: "var(--muted)", letterSpacing: "0.06em" }}
          >
            Folio of stakes, dividends, and your inscribed volumes
            {block ? ` · Block #${Number(block).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn btn-ghost">
            Browse the Library
          </Link>
          <Link href="/write" className="btn btn-brass">
            ✒ New Volume
          </Link>
        </div>
      </div>

      <div className="engraved-double" />

      {!isConnected && (
        <div className="shelf-card text-center py-20">
          <div
            className="font-display text-7xl mb-4"
            style={{ color: "var(--brass)", opacity: 0.35 }}
          >
            ❦
          </div>
          <div
            className="font-display italic text-2xl mb-2"
            style={{ color: "var(--parchment)" }}
          >
            Sign the Register
          </div>
          <p
            className="text-sm mb-2 font-display italic max-w-md mx-auto"
            style={{ color: "var(--parchment-3)" }}
          >
            Connect your wallet to view your endowments, dividends accrued, and
            volumes inscribed.
          </p>
        </div>
      )}

      {isConnected && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
            <Stat
              kind="brass"
              label="Pending Dividends"
              value={fmt(myTotalPending, 4)}
              note="OPN claimable"
              icon="◎"
            />
            <Stat
              kind="verdigris"
              label="Endowed"
              value={fmt(myTotalStake, 4)}
              note={`across ${myStaked.length} volume${myStaked.length === 1 ? "" : "s"}`}
              icon="❀"
            />
            <Stat
              kind="indigo"
              label="Volumes Authored"
              value={myArticles.length.toString()}
              note={`${fmt(myArticlesTvl, 2)} OPN endowed on you`}
              icon="✒"
            />
            <Stat
              kind="stamp"
              label="Library TVL"
              value={fmt(totalProtocolTvl, 2)}
              note={`${total} volumes total`}
              icon="◆"
            />
          </div>

          {/* Endowments */}
          <Section
            title="Endowments held"
            tag={
              <span className="stamp stamp-verdigris">
                <span className="dot dot-live"></span>
                {myStaked.length} active
              </span>
            }
          >
            {myStaked.length === 0 ? (
              <Empty
                title="No endowments yet."
                body="Endow OPN on a volume you believe in. Earn dividends when readers tip the volume."
                cta={
                  <Link href="/" className="btn btn-brass">
                    Browse the stacks
                  </Link>
                }
              />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myStaked.map((r) => (
                  <VaultCard key={r.id} row={r} />
                ))}
              </div>
            )}
          </Section>

          {/* My articles */}
          <Section
            title="Volumes inscribed"
            tag={
              <span className="stamp stamp-brass">
                {myArticles.length} folios
              </span>
            }
          >
            {myArticles.length === 0 ? (
              <Empty
                title="The pen has not yet been taken up."
                body="Inscribe your first volume. Authorship is soulbound to your wallet."
                cta={
                  <Link href="/write" className="btn btn-brass">
                    ✒ Inscribe a volume
                  </Link>
                }
              />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myArticles.map((r) => (
                  <ArticleOwnCard key={r.id} row={r} />
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Stat({
  kind,
  label,
  value,
  note,
  icon,
}: {
  kind: "brass" | "verdigris" | "indigo" | "stamp";
  label: string;
  value: string;
  note?: string;
  icon: string;
}) {
  const accent = {
    brass: "var(--brass-2)",
    verdigris: "var(--verdigris-2)",
    indigo: "var(--indigo-2)",
    stamp: "var(--stamp-2)",
  }[kind];
  const bar = {
    brass: "linear-gradient(90deg, var(--brass), transparent)",
    verdigris: "linear-gradient(90deg, var(--verdigris), transparent)",
    indigo: "linear-gradient(90deg, var(--indigo-2), transparent)",
    stamp: "linear-gradient(90deg, var(--stamp), transparent)",
  }[kind];

  return (
    <div className="shelf-card p-5 relative overflow-hidden">
      <div
        className="absolute top-3 right-4 font-display"
        style={{ color: accent, fontSize: "20px", opacity: 0.7 }}
      >
        {icon}
      </div>
      <div className="kicker mb-3">{label}</div>
      <div
        className="font-display"
        style={{
          fontSize: "2rem",
          color: "var(--parchment)",
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {note && (
        <div
          className="text-[11px] mt-3 font-mono"
          style={{ color: accent, letterSpacing: "0.05em" }}
        >
          {note}
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: "2px", background: bar }}
      />
    </div>
  );
}

function Section({
  title,
  tag,
  children,
}: {
  title: string;
  tag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-4 mb-5">
        <span className="section-label whitespace-nowrap">{title}</span>
        <div className="flex-1 engraved-rule" />
        {tag}
      </div>
      {children}
    </section>
  );
}

function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="shelf-card text-center py-12 px-6">
      <div
        className="font-display italic text-xl mb-2"
        style={{ color: "var(--parchment)" }}
      >
        {title}
      </div>
      <p
        className="font-display italic mb-5 max-w-md mx-auto"
        style={{ color: "var(--parchment-3)" }}
      >
        {body}
      </p>
      {cta}
    </div>
  );
}

function VaultCard({
  row,
}: {
  row: {
    id: number;
    writer: `0x${string}`;
    totalStaked: bigint;
    myStaked: bigint;
    myPending: bigint;
  };
}) {
  const [local, setLocal] = useState<{ title: string } | null>(null);
  useEffect(() => {
    const all = loadArticles();
    setLocal(all[row.id] ?? null);
  }, [row.id]);

  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  async function claim() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "claim",
      args: [BigInt(row.id)],
      gas: 400_000n,
    });
  }

  const sharePct =
    row.totalStaked > 0n
      ? Number((row.myStaked * 10000n) / row.totalStaked) / 100
      : 0;

  return (
    <div className="shelf-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="stamp stamp-muted">Folio {String(row.id).padStart(2, "0")}</span>
          <span className="stamp stamp-verdigris">
            <span className="dot dot-live"></span> live
          </span>
        </div>
        <Link
          href={`/article/${row.id}`}
          className="font-display italic text-[12px]"
          style={{ color: "var(--brass-2)" }}
        >
          open →
        </Link>
      </div>
      <div
        className="font-display italic mb-4 line-clamp-2"
        style={{
          fontSize: "1.05rem",
          color: "var(--parchment)",
          lineHeight: 1.3,
        }}
      >
        {local?.title ?? `Volume by ${shortAddr(row.writer)}`}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Metric label="Yours" value={fmt(row.myStaked, 3)} accent="brass" />
        <Metric label="Pool" value={fmt(row.totalStaked, 2)} accent="indigo" />
        <Metric
          label="Share"
          value={`${sharePct.toFixed(1)}%`}
          accent="verdigris"
        />
      </div>

      <div
        className="p-3 rounded-sm mb-3 relative"
        style={{
          background: "rgba(176, 141, 87, 0.06)",
          border: "1px solid rgba(176, 141, 87, 0.3)",
        }}
      >
        <div
          className="absolute top-2 right-3 font-display italic text-[10px]"
          style={{ color: "var(--brass)", opacity: 0.5 }}
        >
          ❦
        </div>
        <div className="kicker mb-1 text-[9px]">Pending dividend</div>
        <div
          className="font-display"
          style={{
            fontSize: "1.45rem",
            color: "var(--brass-2)",
            lineHeight: 1,
          }}
        >
          {fmt(row.myPending, 6)}
          <span
            className="text-xs ml-1 font-mono"
            style={{ color: "var(--muted)" }}
          >
            OPN
          </span>
        </div>
      </div>

      <button
        className="btn btn-brass w-full"
        disabled={row.myPending === 0n || isPending || isConfirming}
        onClick={claim}
      >
        {isConfirming
          ? "Collecting…"
          : isPending
            ? "Awaiting wallet…"
            : isSuccess
              ? "✓ Collected"
              : `Collect ${fmt(row.myPending, 4)}`}
      </button>
    </div>
  );
}

function ArticleOwnCard({
  row,
}: {
  row: {
    id: number;
    createdAt: bigint;
    version: number;
    totalStaked: bigint;
  };
}) {
  const [local, setLocal] = useState<{ title: string } | null>(null);
  useEffect(() => {
    const all = loadArticles();
    setLocal(all[row.id] ?? null);
  }, [row.id]);

  return (
    <Link href={`/article/${row.id}`}>
      <div
        className="shelf-card shelf-card-hover p-5 h-full"
        style={{ cursor: "pointer" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="stamp stamp-muted">Folio {String(row.id).padStart(2, "0")}</span>
            <span className="stamp stamp-muted">v{row.version}</span>
          </div>
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--muted)" }}
          >
            {new Date(Number(row.createdAt) * 1000).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            )}
          </span>
        </div>
        <div
          className="font-display italic line-clamp-2 mb-4"
          style={{
            fontSize: "1.1rem",
            color: "var(--parchment)",
            lineHeight: 1.3,
          }}
        >
          {local?.title ?? "(an untitled volume)"}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="Endowed on you"
            value={`${fmt(row.totalStaked, 2)} OPN`}
            accent="brass"
          />
          <Metric
            label="Status"
            value={row.totalStaked > 0n ? "Live · Earning" : "Awaiting endow"}
            accent={row.totalStaked > 0n ? "verdigris" : "muted"}
          />
        </div>
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  accent = "brass",
}: {
  label: string;
  value: string;
  accent?: "brass" | "indigo" | "verdigris" | "muted";
}) {
  const colors = {
    brass: "var(--brass-2)",
    indigo: "var(--indigo-2)",
    verdigris: "var(--verdigris-2)",
    muted: "var(--muted)",
  };
  return (
    <div
      className="p-2.5 rounded-sm text-center"
      style={{
        background: "rgba(0, 0, 0, 0.25)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="font-mono text-[13px]"
        style={{ color: colors[accent] }}
      >
        {value}
      </div>
      <div className="kicker mt-0.5 text-[8px]">{label}</div>
    </div>
  );
}
