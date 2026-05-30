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

  return (
    <div className="space-y-12">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="label-engraved mb-3">Member Ledger</div>
          <h1 className="font-display text-[60px] leading-[0.95] text-paper">
            The <em className="text-brass">Reading Room</em>
          </h1>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-paper-mute">
            Season I · OPN Testnet
            {block ? ` · Block № ${Number(block).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn btn-ghost">
            ❦ Browse Archive
          </Link>
          <Link href="/write" className="btn btn-primary">
            ✎ Compose Volume
          </Link>
        </div>
      </div>

      {!isConnected && (
        <div className="surface text-center py-20">
          <div className="text-7xl mb-5 text-brass">❧</div>
          <div className="font-display italic text-3xl mb-2">
            Connect your wallet
          </div>
          <p className="text-paper-mute mb-8 max-w-md mx-auto">
            Your reading room surfaces volumes you wrote, vaults you endorsed,
            and yield ready to claim — directly from on-chain reads.
          </p>
        </div>
      )}

      {isConnected && (
        <>
          {/* Member ledger */}
          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
              <Stat
                kind="brass"
                value={fmt(myTotalPending, 4)}
                label="Pending Yield"
                note="OPN claimable"
              />
              <Stat
                kind="verdigris"
                value={fmt(myTotalStake, 4)}
                label="Endowed Capital"
                note={`across ${myStakedArticles.length} ${myStakedArticles.length === 1 ? "vault" : "vaults"}`}
              />
              <Stat
                kind="indigo"
                value={myArticles.length.toString()}
                label="Volumes Authored"
                note={`${fmt(myArticlesTvl, 2)} OPN endowed`}
              />
              <Stat
                kind="brass"
                value={fmt(totalProtocolTvl, 2)}
                label="Archive TVL"
                note={`${total} volumes total`}
              />
            </div>
          </section>

          {/* Endorsements */}
          <section>
            <div className="section-mast">
              <span className="num">i.</span>
              <span className="label">Endorsements</span>
              <span className="meta">
                {myStakedArticles.length} vault{myStakedArticles.length === 1 ? "" : "s"}
              </span>
            </div>
            {myStakedArticles.length === 0 ? (
              <Empty
                title="No endorsements yet."
                body="Pick a volume from the archive and stake OPN to begin earning yield."
                cta={
                  <Link href="/" className="btn btn-primary">
                    ❦ Browse archive
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
          </section>

          {/* Authored volumes */}
          <section>
            <div className="section-mast">
              <span className="num">ii.</span>
              <span className="label">Authored Volumes</span>
              <span className="meta">{myArticles.length} published</span>
            </div>
            {myArticles.length === 0 ? (
              <Empty
                title="No authored volumes."
                body="Inscribe your first volume — it becomes a soulbound NFT in your wallet."
                cta={
                  <Link href="/write" className="btn btn-primary">
                    ✎ Compose
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
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  kind,
  value,
  label,
  note,
}: {
  kind: "brass" | "verdigris" | "indigo" | "stamp";
  value: string;
  label: string;
  note?: string;
}) {
  const colors = {
    brass: "text-brass-bright",
    verdigris: "text-verdigris-bright",
    indigo: "text-ink-indigo-bright",
    stamp: "text-stamp-bright",
  };
  return (
    <div className="stat-tile">
      <div className="label-engraved">{label}</div>
      <div className={`mt-2 font-display text-[34px] leading-none font-semibold ${colors[kind]}`}>
        {value}
      </div>
      {note && (
        <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-paper-mute">
          {note}
        </div>
      )}
    </div>
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
    <div className="surface text-center py-14">
      <div className="font-display italic text-2xl mb-2">{title}</div>
      <p className="text-paper-mute mb-6 max-w-md mx-auto">{body}</p>
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
    setLocal(loadArticles()[row.id] ?? null);
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
    <div className="surface p-5 transition hover:bg-walnut-warm relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="stamp stamp-mute">№ {String(row.id).padStart(3, "0")}</span>
          <span className="stamp stamp-brass">
            <span className="dot dot-brass" /> endorsed
          </span>
        </div>
        <Link
          href={`/article/${row.id}`}
          className="text-[10px] font-mono uppercase tracking-[0.2em] text-paper-mute hover:text-brass"
        >
          open →
        </Link>
      </div>
      <div className="font-display italic text-[18px] leading-snug mb-4 text-paper line-clamp-2">
        {local?.title ?? `Volume by ${shortAddr(row.writer)}`}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Metric label="My stake" value={fmt(row.myStaked, 3)} accent="brass" />
        <Metric label="Pool TVL" value={fmt(row.totalStaked, 2)} accent="indigo" />
        <Metric label="Share" value={`${sharePct.toFixed(1)}%`} accent="verdigris" />
      </div>

      <div className="surface-raised p-3 mb-3 relative">
        <div className="label-engraved">pending yield</div>
        <div className="font-display text-2xl mt-1 leading-none text-brass-bright font-semibold">
          {fmt(row.myPending, 6)}
          <span className="text-xs ml-1.5 text-paper-mute font-mono">OPN</span>
        </div>
        {row.myPending > 0n && (
          <span
            className="absolute -top-2 -right-2 stamp stamp-stamp stamp-tilt"
            style={{ transform: "rotate(7deg)" }}
          >
            CLAIM
          </span>
        )}
      </div>

      <button
        className="btn btn-primary w-full justify-center"
        disabled={row.myPending === 0n || isPending || isConfirming}
        onClick={claim}
      >
        {isConfirming
          ? "Claiming…"
          : isPending
            ? "Awaiting…"
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
  const [local, setLocal] = useState<{ title: string } | null>(null);
  useEffect(() => {
    setLocal(loadArticles()[row.id] ?? null);
  }, [row.id]);

  return (
    <Link href={`/article/${row.id}`}>
      <div className="surface p-5 hover:bg-walnut-warm cursor-pointer h-full transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="stamp stamp-mute">№ {String(row.id).padStart(3, "0")}</span>
            <span className="stamp stamp-mute">v{row.version}</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-mute">
            {new Date(Number(row.createdAt) * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="font-display italic text-[20px] leading-snug mb-4 text-paper line-clamp-2">
          {local?.title ?? "(off-chain title not in cache)"}
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
            accent={row.totalStaked > 0n ? "verdigris" : "mute"}
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
  accent?: "brass" | "indigo" | "verdigris" | "mute";
}) {
  const colors = {
    brass: "text-brass-bright",
    indigo: "text-ink-indigo-bright",
    verdigris: "text-verdigris-bright",
    mute: "text-paper-mute",
  };
  return (
    <div className="bg-walnut-deep border border-rule rounded-sm p-2 text-center">
      <div className={`font-mono text-[13px] font-medium ${colors[accent]}`}>
        {value}
      </div>
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-paper-mute mt-0.5">
        {label}
      </div>
    </div>
  );
}
