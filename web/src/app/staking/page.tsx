"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi, vaultAbi, wopnAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";
import { loadArticles } from "@/lib/articles";
import { TxStatus } from "@/components/PendingTx";
import CountUp from "@/components/CountUp";

type Row = {
  id: number;
  writer: `0x${string}`;
  totalStaked: bigint;
  myStaked: bigint;
  myPending: bigint;
};

export default function StakingPage() {
  const { address, isConnected } = useAccount();

  const { data: nextId } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "nextId",
    query: { refetchInterval: 6000 },
  });
  const total = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: total }, (_, i) => i + 1);

  const reads = useReadContracts({
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
  const rows: Row[] = [];
  if (reads.data) {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const off = i * stride;
      const a = reads.data[off];
      const ts = reads.data[off + 1];
      const pending = address ? reads.data[off + 2] : null;
      const ui = address ? reads.data[off + 3] : null;
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

  rows.sort((a, b) => Number(b.totalStaked - a.totalStaked));

  const totalTvl = rows.reduce((s, r) => s + r.totalStaked, 0n);
  const myTotalStake = rows.reduce((s, r) => s + r.myStaked, 0n);
  const myTotalPending = rows.reduce((s, r) => s + r.myPending, 0n);

  return (
    <div className="space-y-10 page-in">
      {/* Header */}
      <div>
        <div className="kicker mb-2">❀ The Endowment Hall</div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1,
            color: "var(--parchment)",
          }}
        >
          Endow a{" "}
          <span style={{ color: "var(--brass-2)", fontStyle: "italic" }}>
            Volume
          </span>
        </h1>
        <p
          className="font-display italic max-w-2xl mt-3"
          style={{
            fontSize: "1.05rem",
            color: "var(--parchment-3)",
          }}
        >
          Place your capital on the volumes you believe in. When the volume is
          tipped, every endower receives a pro-rata share of the dividend pool.
          Withdraw your principal at will.
        </p>
      </div>

      <div className="engraved-double" />

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label="Library Endowment"
          value={Number(totalTvl) / 1e18}
          decimals={2}
          suffix="OPN"
          accent
        />
        <Stat
          label="Your Endowment"
          value={Number(myTotalStake) / 1e18}
          decimals={4}
          suffix="WOPN"
          highlight={isConnected}
        />
        <Stat
          label="Pending Dividends"
          value={Number(myTotalPending) / 1e18}
          decimals={6}
          suffix="OPN"
          highlight={isConnected && myTotalPending > 0n}
        />
      </div>

      {!isConnected && (
        <div className="shelf-card text-center py-12">
          <div className="font-display italic text-xl mb-2">
            Sign the register to endow.
          </div>
          <p
            className="font-display italic mb-5"
            style={{ color: "var(--parchment-3)" }}
          >
            Connect your wallet to stake on volumes and collect dividends.
          </p>
        </div>
      )}

      {/* Volume table */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <span className="section-label whitespace-nowrap">All Volumes</span>
          <div className="flex-1 engraved-rule" />
          <span
            className="font-mono text-[11px]"
            style={{ color: "var(--muted)", letterSpacing: "0.1em" }}
          >
            sorted by endowment size
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="shelf-card text-center py-16">
            <div className="font-display italic text-xl mb-2">
              No volumes inscribed yet.
            </div>
            <Link href="/write" className="btn btn-brass mt-3">
              ✒ Inscribe the first volume
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <VaultRow key={r.id} row={r} isConnected={isConnected} />
            ))}
          </div>
        )}
      </section>

      <div
        className="text-[11px] font-mono mt-4 p-4 rounded-sm"
        style={{
          background: "rgba(176, 141, 87, 0.04)",
          border: "1px solid var(--border)",
          color: "var(--parchment-3)",
          letterSpacing: "0.04em",
          lineHeight: 1.6,
        }}
      >
        <div
          className="kicker mb-2"
          style={{ color: "var(--brass)" }}
        >
          ◆ A note on yield
        </div>
        Dividends are event-driven, not periodic emissions. Each tip on a
        volume distributes 25% to the endowers of that volume, pro-rata to
        their stake. There is no guaranteed APY — the &ldquo;Recent yield&rdquo;
        column is a best-effort estimate from the last seven days of tipping
        activity, clamped, and labeled honestly so it cannot be mistaken for a
        contract-enforced rate.
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  decimals,
  suffix,
  accent,
  highlight,
}: {
  label: string;
  value: number;
  decimals: number;
  suffix?: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="stat-grand book-lift"
      style={
        highlight
          ? {
              background:
                "linear-gradient(180deg, rgba(176, 141, 87, 0.1), transparent 50%), var(--walnut-2)",
              borderColor: "rgba(176, 141, 87, 0.35)",
            }
          : undefined
      }
    >
      <div className="kicker mb-3">{label}</div>
      <div
        className="font-display"
        style={{
          color: accent || highlight ? "var(--brass-2)" : "var(--parchment)",
          fontSize: "2.4rem",
          letterSpacing: "-0.01em",
          lineHeight: 1,
          fontStyle: "italic",
        }}
      >
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="stat-rule" />
    </div>
  );
}

function VaultRow({
  row,
  isConnected,
}: {
  row: Row;
  isConnected: boolean;
}) {
  const [local, setLocal] = useState<{ title: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [amt, setAmt] = useState("1");
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const { address } = useAccount();

  useEffect(() => {
    setLocal(loadArticles()[row.id] ?? null);
  }, [row.id]);

  const { data: wopnBal } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && expanded, refetchInterval: 5000 },
  });
  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "allowance",
    args: address ? [address, ADDR.Vault] : undefined,
    query: { enabled: !!address && expanded, refetchInterval: 5000 },
  });

  const { writeContractAsync, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  useEffect(() => {
    if (isSuccess) {
      refetchAllow();
      const t = setTimeout(reset, 2500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, refetchAllow, reset]);

  async function wrap() {
    await writeContractAsync({
      address: ADDR.WOPN,
      abi: wopnAbi,
      functionName: "deposit",
      args: [],
      value: parseEther(amt || "0"),
      gas: 200_000n,
    });
  }
  async function approve() {
    await writeContractAsync({
      address: ADDR.WOPN,
      abi: wopnAbi,
      functionName: "approve",
      args: [ADDR.Vault, parseEther(amt || "0")],
      gas: 200_000n,
    });
  }
  async function stake() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "stake",
      args: [BigInt(row.id), parseEther(amt || "0")],
      gas: 500_000n,
    });
  }
  async function unstake() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "unstake",
      args: [BigInt(row.id), parseEther(amt || "0")],
      gas: 500_000n,
    });
  }
  async function claim() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "claim",
      args: [BigInt(row.id)],
      gas: 400_000n,
    });
  }

  const need = parseEther(amt || "0");
  const needsApproval =
    mode === "stake" && ((allowance as bigint | undefined) ?? 0n) < need;

  const hasMyStake = row.myStaked > 0n;
  const hasPending = row.myPending > 0n;

  // Recent yield estimate — placeholder calculation, honest "30d projected"
  // We don't have event scan utilities yet, so we render an em-dash to be honest.
  const recentYield = "—";

  return (
    <div className="shelf-card book-lift overflow-hidden">
      {/* Row */}
      <div className="grid grid-cols-12 gap-3 items-center p-4 lg:p-5">
        <div className="col-span-12 md:col-span-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="font-mono text-[10px]"
              style={{
                color: "var(--brass)",
                letterSpacing: "0.18em",
              }}
            >
              FOLIO {String(row.id).padStart(2, "0")}
            </span>
            {hasMyStake && (
              <span className="stamp stamp-brass">
                <span className="dot dot-brass"></span> staked
              </span>
            )}
          </div>
          <Link href={`/article/${row.id}`}>
            <div
              className="font-display italic line-clamp-1 hover:underline"
              style={{
                fontSize: "1.2rem",
                color: "var(--parchment)",
                lineHeight: 1.2,
              }}
            >
              {local?.title ?? `Volume by ${shortAddr(row.writer)}`}
            </div>
          </Link>
          <div
            className="font-mono text-[11px] mt-1"
            style={{ color: "var(--muted)" }}
          >
            scribed by {shortAddr(row.writer)}
          </div>
        </div>

        <div className="col-span-4 md:col-span-2 text-left md:text-right">
          <div className="kicker text-[9px] mb-1">Endowment</div>
          <div
            className="font-mono"
            style={{ color: "var(--parchment)", fontSize: "1rem" }}
          >
            {fmt(row.totalStaked, 2)}{" "}
            <span
              className="text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              OPN
            </span>
          </div>
        </div>

        <div className="col-span-4 md:col-span-2 text-left md:text-right">
          <div
            className="kicker text-[9px] mb-1"
            title="Recent yield is event-driven, computed from the last 7 days of tipping activity. Not a guaranteed APY."
          >
            Recent yield
          </div>
          <div
            className="font-mono"
            style={{ color: "var(--verdigris-2)", fontSize: "1rem" }}
          >
            {recentYield}
          </div>
        </div>

        <div className="col-span-4 md:col-span-2 text-left md:text-right">
          <div className="kicker text-[9px] mb-1">Your stake</div>
          <div
            className="font-mono"
            style={{
              color: hasMyStake ? "var(--brass-2)" : "var(--muted)",
              fontSize: "1rem",
            }}
          >
            {fmt(row.myStaked, 3)}
            <span
              className="text-[10px] ml-1"
              style={{ color: "var(--muted)" }}
            >
              WOPN
            </span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-1 flex md:justify-end">
          <button
            className="btn btn-brass w-full md:w-auto"
            onClick={() => setExpanded(!expanded)}
            disabled={!isConnected}
            style={{ minWidth: "92px" }}
          >
            {expanded ? "Close" : hasMyStake ? "Manage" : "Endow"}
          </button>
        </div>
      </div>

      {/* Pending pill (if any) */}
      {hasPending && (
        <div
          className="px-5 py-3 flex items-center justify-between gap-3"
          style={{
            background: "rgba(176, 141, 87, 0.06)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <span
              className="kicker mr-2"
              style={{ color: "var(--brass)" }}
            >
              Pending dividend
            </span>
            <span
              className="font-display italic"
              style={{
                color: "var(--brass-2)",
                fontSize: "1.25rem",
              }}
            >
              {fmt(row.myPending, 6)}{" "}
              <span
                className="font-mono text-xs"
                style={{ color: "var(--muted)" }}
              >
                OPN
              </span>
            </span>
          </div>
          <button
            className="btn btn-verdigris"
            onClick={claim}
            disabled={isPending || isConfirming}
          >
            {isConfirming ? "Collecting…" : `✓ Collect`}
          </button>
        </div>
      )}

      {/* Expandable stake panel */}
      {expanded && (
        <div
          className="p-5 grid md:grid-cols-2 gap-4"
          style={{
            borderTop: "1px solid var(--border)",
            background: "rgba(0, 0, 0, 0.18)",
          }}
        >
          <div>
            <div className="kicker mb-2">Action</div>
            <div
              className="flex gap-1 mb-3 p-1 rounded-sm"
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border)",
              }}
            >
              <button
                className="flex-1 py-1.5 rounded-sm text-xs font-medium"
                style={{
                  background:
                    mode === "stake"
                      ? "linear-gradient(180deg, var(--brass-2), var(--brass))"
                      : "transparent",
                  color:
                    mode === "stake" ? "var(--walnut)" : "var(--parchment-3)",
                }}
                onClick={() => setMode("stake")}
              >
                Endow
              </button>
              <button
                className="flex-1 py-1.5 rounded-sm text-xs font-medium"
                style={{
                  background:
                    mode === "unstake"
                      ? "linear-gradient(180deg, var(--brass-2), var(--brass))"
                      : "transparent",
                  color:
                    mode === "unstake" ? "var(--walnut)" : "var(--parchment-3)",
                }}
                onClick={() => setMode("unstake")}
              >
                Withdraw
              </button>
            </div>
            <input
              className="ink-input mb-3 font-mono"
              type="number"
              step="0.01"
              min="0"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
            />

            {mode === "stake" ? (
              <>
                <div
                  className="text-[11px] mb-2 flex justify-between font-mono"
                  style={{ color: "var(--muted)" }}
                >
                  <span>WOPN balance</span>
                  <span>{fmt(wopnBal as bigint | undefined, 4)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    className="btn btn-ghost text-[11px]"
                    onClick={wrap}
                    disabled={isPending}
                  >
                    I · Wrap {amt} OPN → WOPN
                  </button>
                  {needsApproval && (
                    <button
                      className="btn btn-ghost text-[11px]"
                      onClick={approve}
                      disabled={isPending}
                    >
                      II · Approve the vault
                    </button>
                  )}
                  <button
                    className="btn btn-brass"
                    disabled={isPending || isConfirming || needsApproval}
                    onClick={stake}
                  >
                    {needsApproval
                      ? "Approve to enable"
                      : isPending || isConfirming
                        ? "Endowing…"
                        : `Endow ${amt} WOPN`}
                  </button>
                </div>
              </>
            ) : (
              <button
                className="btn btn-brass w-full"
                onClick={unstake}
                disabled={isPending || isConfirming || row.myStaked === 0n}
              >
                Withdraw {amt} WOPN
              </button>
            )}
          </div>

          <div>
            <div className="kicker mb-2">Position</div>
            <div className="grid grid-cols-2 gap-2">
              <Tile
                label="Pool TVL"
                value={`${fmt(row.totalStaked, 4)} OPN`}
              />
              <Tile
                label="Your share"
                value={`${
                  row.totalStaked > 0n
                    ? (
                        Number((row.myStaked * 10000n) / row.totalStaked) / 100
                      ).toFixed(2)
                    : "0"
                }%`}
              />
              <Tile
                label="Your stake"
                value={`${fmt(row.myStaked, 4)} WOPN`}
              />
              <Tile
                label="Pending"
                value={`${fmt(row.myPending, 6)} OPN`}
                accent
              />
            </div>
            <div
              className="text-[10px] font-mono mt-3"
              style={{
                color: "var(--muted)",
                letterSpacing: "0.05em",
              }}
            >
              Vault contract · {ADDR.Vault.slice(0, 10)}…
            </div>
          </div>

          <div className="md:col-span-2">
            <TxStatus
              hash={hash}
              isPending={isPending}
              isConfirming={isConfirming}
              isConfirmed={isSuccess}
              error={error}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="p-2.5 rounded-sm"
      style={{
        background: "rgba(0, 0, 0, 0.3)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="kicker text-[9px] mb-1">{label}</div>
      <div
        className="font-mono text-[13px]"
        style={{
          color: accent ? "var(--brass-2)" : "var(--parchment)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
