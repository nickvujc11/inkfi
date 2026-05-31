"use client";

import { useEffect, useState, use } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi, routerAbi, vaultAbi, wopnAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";
import { TxStatus } from "@/components/PendingTx";
import { getArticle, type LocalArticle } from "@/lib/articles";

type Params = { id: string };

export default function ArticlePage({ params }: { params: Promise<Params> }) {
  const { id: idStr } = use(params);
  const id = BigInt(idStr);
  const { address, isConnected } = useAccount();

  const { data: article } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "articles",
    args: [id],
  });
  const { data: totalStaked, refetch: refetchTotal } = useReadContract({
    address: ADDR.Vault,
    abi: vaultAbi,
    functionName: "totalStaked",
    args: [id],
    query: { refetchInterval: 5000 },
  });
  const { data: pending, refetch: refetchPending } = useReadContract({
    address: ADDR.Vault,
    abi: vaultAbi,
    functionName: "pendingReward",
    args: address ? [id, address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: userInfo, refetch: refetchUser } = useReadContract({
    address: ADDR.Vault,
    abi: vaultAbi,
    functionName: "userInfo",
    args: address ? [id, address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const [local, setLocal] = useState<LocalArticle | undefined>();
  useEffect(() => {
    setLocal(getArticle(Number(id)));
  }, [id]);

  if (!article) {
    return (
      <div
        className="text-center py-24 font-display italic"
        style={{ color: "var(--parchment-3)" }}
      >
        Loading from the archives…
      </div>
    );
  }

  const [writer, createdAt, version, contentURI, contentHash] =
    article as readonly [`0x${string}`, bigint, number, string, `0x${string}`];

  const myStaked = userInfo
    ? (userInfo as unknown as readonly [bigint, bigint, bigint])[0]
    : 0n;

  const wordCount = (local?.body ?? "").trim().split(/\s+/).filter(Boolean)
    .length;
  const readMin = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-12">
      <article>
        <div className="kicker mb-3">
          ❦ Folio {String(idStr).padStart(2, "0")} · Version {version}
        </div>
        <h1
          className="font-display mb-5"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--parchment)",
            fontStyle: "italic",
            fontWeight: 600,
          }}
        >
          {local?.title ?? (
            <span style={{ color: "var(--muted)" }}>(an untitled volume)</span>
          )}
        </h1>

        {/* Byline */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span
            className="font-display italic"
            style={{
              color: "var(--parchment-2)",
              fontSize: "1.05rem",
            }}
          >
            scribed by{" "}
            <span
              className="font-mono not-italic"
              style={{ color: "var(--brass-2)" }}
            >
              {shortAddr(writer)}
            </span>
          </span>
        </div>
        <div
          className="flex items-center gap-3 text-[11px] mb-10 font-mono flex-wrap"
          style={{ color: "var(--muted)", letterSpacing: "0.05em" }}
        >
          <span>
            {new Date(Number(createdAt) * 1000).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </span>
          <span>·</span>
          <span>
            {wordCount} words · {readMin} min
          </span>
          <span>·</span>
          <span title={contentHash}>seal {contentHash.slice(0, 10)}…</span>
        </div>

        <div className="engraved-rule mb-10" />

        <div className="prose-book drop-cap whitespace-pre-wrap">
          {local?.body ?? (
            <span
              style={{ color: "var(--muted)", fontStyle: "italic" }}
              className="prose-book"
            >
              The body of this volume is stored in the local cache and is not
              present on this device. Open it on the device where it was
              inscribed, or consult the contentURI on-chain.
            </span>
          )}
        </div>

        <div className="ornament mt-16 mb-6">❦</div>
        <div
          className="font-mono text-[11px] text-center"
          style={{ color: "var(--muted)", letterSpacing: "0.1em" }}
        >
          contentURI · {contentURI}
        </div>
      </article>

      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <TipPanel
          articleId={id}
          onTipped={() => {
            refetchTotal();
            refetchPending();
          }}
        />
        <StakePanel
          articleId={id}
          totalStaked={totalStaked as bigint | undefined}
          myStaked={myStaked}
          pending={pending as bigint | undefined}
          isConnected={isConnected}
          onAction={() => {
            refetchTotal();
            refetchPending();
            refetchUser();
          }}
        />
      </aside>
    </div>
  );
}

function TipPanel({
  articleId,
  onTipped,
}: {
  articleId: bigint;
  onTipped: () => void;
}) {
  const [amt, setAmt] = useState("0.1");
  const [memo, setMemo] = useState("");
  const { writeContractAsync, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      onTipped();
      const t = setTimeout(reset, 2500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onTipped, reset]);

  return (
    <div className="shelf-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div
          className="font-display italic"
          style={{ fontSize: "17px", color: "var(--parchment)" }}
        >
          ◎ A Coin to the Scribe
        </div>
        <span className="stamp stamp-stamp">tip</span>
      </div>
      <div
        className="text-[11px] mb-4 font-mono"
        style={{ color: "var(--muted)", letterSpacing: "0.05em" }}
      >
        70% scribe · 25% endowers · 5% archive
      </div>
      <input
        className="ink-input mb-2 font-mono"
        type="number"
        step="0.01"
        min="0.001"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        placeholder="OPN amount"
      />
      <input
        className="ink-input mb-3"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="a note in the margin (optional)"
      />
      <button
        className="btn btn-brass w-full"
        disabled={isPending || isConfirming || !amt}
        onClick={() =>
          writeContractAsync({
            address: ADDR.Router,
            abi: routerAbi,
            functionName: "tipNative",
            args: [articleId, memo],
            value: parseEther(amt || "0"),
            gas: 500_000n,
          })
        }
      >
        {isPending || isConfirming ? "Sending…" : `Tip ${amt} OPN`}
      </button>
      <TxStatus
        hash={hash}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isSuccess}
        error={error}
      />
    </div>
  );
}

function StakePanel({
  articleId,
  totalStaked,
  myStaked,
  pending,
  isConnected,
  onAction,
}: {
  articleId: bigint;
  totalStaked?: bigint;
  myStaked: bigint;
  pending?: bigint;
  isConnected: boolean;
  onAction: () => void;
}) {
  const { address } = useAccount();
  const [amt, setAmt] = useState("1");
  const [mode, setMode] = useState<"stake" | "unstake">("stake");

  const { data: wopnBal } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "allowance",
    args: address ? [address, ADDR.Vault] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { writeContractAsync, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      onAction();
      refetchAllow();
      const t = setTimeout(reset, 2500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onAction, refetchAllow, reset]);

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
      args: [articleId, parseEther(amt || "0")],
      gas: 500_000n,
    });
  }
  async function unstake() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "unstake",
      args: [articleId, parseEther(amt || "0")],
      gas: 500_000n,
    });
  }
  async function claim() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "claim",
      args: [articleId],
      gas: 400_000n,
    });
  }

  const need = parseEther(amt || "0");
  const needsApproval =
    mode === "stake" && ((allowance as bigint | undefined) ?? 0n) < need;

  return (
    <div className="shelf-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div
          className="font-display italic"
          style={{ fontSize: "17px", color: "var(--parchment)" }}
        >
          ❀ Endow the Volume
        </div>
        <span className="stamp stamp-verdigris">
          <span className="dot dot-live"></span> live
        </span>
      </div>
      <div
        className="text-[11px] mb-4 font-mono"
        style={{ color: "var(--muted)", letterSpacing: "0.05em" }}
      >
        Endow OPN. Earn from tips paid to this volume.
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Tile label="Endowment" value={fmt(totalStaked, 4)} />
        <Tile label="Yours" value={fmt(myStaked, 4)} />
      </div>

      <div
        className="p-3 rounded-sm mb-4 relative overflow-hidden"
        style={{
          background: "rgba(176, 141, 87, 0.06)",
          border: "1px solid rgba(176, 141, 87, 0.3)",
        }}
      >
        <div
          className="absolute top-1 right-2 font-display italic text-[12px]"
          style={{ color: "var(--brass)", opacity: 0.5 }}
        >
          ❦
        </div>
        <div className="kicker mb-1">Pending dividend</div>
        <div
          className="font-display"
          style={{
            fontSize: "1.55rem",
            color: "var(--brass-2)",
            lineHeight: 1,
          }}
        >
          {fmt(pending, 6)}
          <span
            className="text-xs ml-1.5 font-mono"
            style={{ color: "var(--muted)" }}
          >
            OPN
          </span>
        </div>
      </div>

      <div
        className="flex gap-1 mb-3 p-1 rounded-sm"
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          border: "1px solid var(--border)",
        }}
      >
        <button
          className="flex-1 py-1.5 rounded-sm text-xs transition font-medium"
          style={{
            background:
              mode === "stake"
                ? "linear-gradient(180deg, var(--brass-2), var(--brass))"
                : "transparent",
            color: mode === "stake" ? "var(--walnut)" : "var(--parchment-3)",
          }}
          onClick={() => setMode("stake")}
        >
          Endow
        </button>
        <button
          className="flex-1 py-1.5 rounded-sm text-xs transition font-medium"
          style={{
            background:
              mode === "unstake"
                ? "linear-gradient(180deg, var(--brass-2), var(--brass))"
                : "transparent",
            color: mode === "unstake" ? "var(--walnut)" : "var(--parchment-3)",
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
              disabled={
                !isConnected || isPending || isConfirming || needsApproval
              }
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
          disabled={!isConnected || isPending || isConfirming}
          onClick={unstake}
        >
          Withdraw {amt} WOPN
        </button>
      )}

      {((pending as bigint | undefined) ?? 0n) > 0n && (
        <button
          className="btn btn-verdigris w-full mt-3"
          onClick={claim}
          disabled={isPending || isConfirming}
        >
          ✓ Collect {fmt(pending, 6)} OPN dividend
        </button>
      )}

      <TxStatus
        hash={hash}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isSuccess}
        error={error}
      />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-2.5 rounded-sm"
      style={{
        background: "rgba(0, 0, 0, 0.25)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="kicker text-[9px] mb-1">{label}</div>
      <div
        className="font-mono text-base"
        style={{ color: "var(--parchment)" }}
      >
        {value}
      </div>
    </div>
  );
}
