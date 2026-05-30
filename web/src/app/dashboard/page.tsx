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
import { articleNftAbi, vaultAbi, wopnAbi } from "@/lib/abis";
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

  // Per-article: writer, totalStaked, my pending, my stake
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
  type ArticleRow = {
    id: number;
    writer: `0x${string}`;
    createdAt: bigint;
    version: number;
    contentURI: string;
    totalStaked: bigint;
    myPending: bigint;
    myStaked: bigint;
  };

  const rows: ArticleRow[] = [];
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
  const myStakedArticles = address
    ? rows.filter((r) => r.myStaked > 0n)
    : [];

  const totalProtocolTvl = rows.reduce((s, r) => s + r.totalStaked, 0n);
  const myTotalStake = myStakedArticles.reduce((s, r) => s + r.myStaked, 0n);
  const myTotalPending = myStakedArticles.reduce((s, r) => s + r.myPending, 0n);
  const myArticlesTvl = myArticles.reduce((s, r) => s + r.totalStaked, 0n);

  // wallet balances
  const { data: nativeBal } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  return (
    <div className="space-y-8">
      {/* page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-[32px] leading-none">
            Writer <em style={{ color: "var(--gold)" }}>Dashboard</em>
          </h1>
          <p
            className="mt-2 text-[12px] font-mono"
            style={{ color: "var(--muted)", letterSpacing: "0.05em" }}
          >
            Season 1 · OPN Testnet
            {block ? ` · Block #${Number(block).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn btn-ghost">
            View on Chain
          </Link>
          <Link href="/write" className="btn btn-primary">
            ✍ New Article
          </Link>
        </div>
      </div>

      {!isConnected && (
        <div className="panel text-center py-16">
          <div className="text-5xl mb-4">⬡</div>
          <div
            className="font-news text-xl mb-2"
            style={{ fontStyle: "italic" }}
          >
            Connect your wallet
          </div>
          <p
            className="text-sm mb-6 max-w-md mx-auto"
            style={{ color: "var(--muted)" }}
          >
            Your dashboard surfaces articles you wrote, vaults you staked on,
            and pending rewards across the protocol.
          </p>
        </div>
      )}

      {isConnected && (
        <>
          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
            <Stat
              kind="gold"
              icon="◎"
              value={fmt(myTotalPending, 4)}
              label="Pending Rewards"
              note="OPN claimable"
            />
            <Stat
              kind="yield"
              icon="⬡"
              value={fmt(myTotalStake, 4)}
              label="My Stake (TVL)"
              note={`across ${myStakedArticles.length} vault${myStakedArticles.length === 1 ? "" : "s"}`}
            />
            <Stat
              kind="stream"
              icon="✍"
              value={myArticles.length.toString()}
              label="My Articles"
              note={`${fmt(myArticlesTvl, 2)} OPN staked on you`}
            />
            <Stat
              kind="purple"
              icon="◈"
              value={fmt(totalProtocolTvl, 2)}
              label="Protocol TVL"
              note={`${total} articles total`}
            />
          </div>

          {/* MY VAULTS */}
          <Section
            title="Vaults you stake on"
            tag={
              <span className="pill pill-yield">
                <span className="dot dot-live"></span>
                {myStakedArticles.length} active
              </span>
            }
          >
            {myStakedArticles.length === 0 ? (
              <Empty
                title="No active stakes."
                body="Pick an article from the feed and stake OPN to start earning."
                cta={
                  <Link href="/" className="btn btn-primary">
                    Browse articles
                  </Link>
                }
              />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myStakedArticles.map((r) => (
                  <VaultCard key={r.id} row={r} />
                ))}
              </div>
            )}
          </Section>

          {/* MY ARTICLES */}
          <Section
            title="Articles you wrote"
            tag={
              <span className="pill pill-gold">
                {myArticles.length} published
              </span>
            }
          >
            {myArticles.length === 0 ? (
              <Empty
                title="You haven't published yet."
                body="Mint your first article NFT — it's soulbound to your wallet."
                cta={
                  <Link href="/write" className="btn btn-primary">
                    ✍ Write something
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
  icon,
  value,
  label,
  note,
}: {
  kind: "gold" | "stream" | "yield" | "purple";
  icon: string;
  value: string;
  label: string;
  note?: string;
}) {
  const noteColor = {
    gold: "var(--gold-light)",
    stream: "var(--stream)",
    yield: "var(--yield)",
    purple: "#c084fc",
  }[kind];
  return (
    <div className={`stat-card ${kind}`}>
      <div className="text-[18px] mb-3 opacity-80">{icon}</div>
      <div className="font-serif text-[26px] leading-none">{value}</div>
      <div
        className="text-[10px] uppercase mt-1.5 font-mono"
        style={{ color: "var(--muted)", letterSpacing: "0.2em" }}
      >
        {label}
      </div>
      {note && (
        <div
          className="text-[11px] mt-2.5 font-mono"
          style={{ color: noteColor, letterSpacing: "0.05em" }}
        >
          {note}
        </div>
      )}
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
      <div className="flex items-center gap-4 mb-4">
        <div
          className="text-[10px] font-mono uppercase whitespace-nowrap"
          style={{ color: "var(--muted)", letterSpacing: "0.3em" }}
        >
          {title}
        </div>
        <div
          className="flex-1 h-px"
          style={{ background: "var(--border)" }}
        ></div>
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
    <div className="panel text-center py-12">
      <div className="font-news text-lg mb-2" style={{ fontStyle: "italic" }}>
        {title}
      </div>
      <p
        className="text-sm mb-5 max-w-md mx-auto"
        style={{ color: "var(--muted)" }}
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
    <div
      className="panel-soft p-5 transition hover:translate-y-[-2px]"
      style={{ position: "relative" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="pill pill-mute font-mono">#{row.id}</span>
          <span className="pill pill-gold">
            <span className="dot dot-gold"></span> staked
          </span>
        </div>
        <Link
          href={`/article/${row.id}`}
          className="text-[11px] font-mono"
          style={{ color: "var(--muted)" }}
        >
          open →
        </Link>
      </div>
      <div
        className="font-news text-[15px] leading-snug mb-4 line-clamp-2"
        style={{ fontStyle: "italic", color: "var(--paper)" }}
      >
        {local?.title ?? `Article by ${shortAddr(row.writer)}`}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Metric label="My stake" value={fmt(row.myStaked, 3)} accent="gold" />
        <Metric
          label="Pool TVL"
          value={fmt(row.totalStaked, 2)}
          accent="stream"
        />
        <Metric label="Share" value={`${sharePct.toFixed(1)}%`} accent="yield" />
      </div>

      <div
        className="p-3 rounded-lg mb-3"
        style={{
          background: "rgba(201, 168, 76, 0.08)",
          border: "1px solid rgba(201, 168, 76, 0.2)",
        }}
      >
        <div
          className="text-[9px] font-mono uppercase mb-1"
          style={{ color: "var(--gold)", letterSpacing: "0.2em" }}
        >
          Pending Reward
        </div>
        <div
          className="font-serif text-xl"
          style={{ color: "var(--gold-light)" }}
        >
          {fmt(row.myPending, 6)}
          <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>
            OPN
          </span>
        </div>
      </div>

      <button
        className="btn btn-primary w-full justify-center"
        disabled={row.myPending === 0n || isPending || isConfirming}
        onClick={claim}
      >
        {isConfirming
          ? "Claiming…"
          : isPending
            ? "Awaiting wallet…"
            : isSuccess
              ? "✓ Claimed"
              : `Claim ${fmt(row.myPending, 4)}`}
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
  const [local, setLocal] = useState<{ title: string; body?: string } | null>(
    null
  );
  useEffect(() => {
    const all = loadArticles();
    setLocal(all[row.id] ?? null);
  }, [row.id]);

  return (
    <Link href={`/article/${row.id}`}>
      <div
        className="panel-soft p-5 transition hover:translate-y-[-2px] h-full"
        style={{ cursor: "pointer" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="pill pill-mute font-mono">#{row.id}</span>
            <span className="pill pill-mute">v{row.version}</span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>
            {new Date(Number(row.createdAt) * 1000).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            )}
          </span>
        </div>
        <div
          className="font-news text-[16px] leading-snug mb-4 line-clamp-2"
          style={{ fontStyle: "italic", color: "var(--paper)" }}
        >
          {local?.title ?? "(off-chain title not in cache)"}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="Staked on you"
            value={`${fmt(row.totalStaked, 2)} OPN`}
            accent="gold"
          />
          <Metric
            label="Status"
            value={row.totalStaked > 0n ? "Live · Earning" : "Awaiting stake"}
            accent={row.totalStaked > 0n ? "yield" : "muted"}
          />
        </div>
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  accent = "gold",
}: {
  label: string;
  value: string;
  accent?: "gold" | "stream" | "yield" | "muted";
}) {
  const colors = {
    gold: "var(--gold-light)",
    stream: "var(--stream)",
    yield: "var(--yield)",
    muted: "var(--muted)",
  };
  return (
    <div
      className="p-2 rounded-md text-center"
      style={{ background: "rgba(0, 0, 0, 0.25)" }}
    >
      <div
        className="font-mono text-[13px] font-medium"
        style={{ color: colors[accent] }}
      >
        {value}
      </div>
      <div
        className="text-[9px] font-mono uppercase mt-0.5"
        style={{ color: "var(--muted)", letterSpacing: "0.12em" }}
      >
        {label}
      </div>
    </div>
  );
}
