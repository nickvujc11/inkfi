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
  });
  const { data: pending, refetch: refetchPending } = useReadContract({
    address: ADDR.Vault,
    abi: vaultAbi,
    functionName: "pendingReward",
    args: address ? [id, address] : undefined,
    query: { enabled: !!address },
  });
  const { data: userInfo, refetch: refetchUser } = useReadContract({
    address: ADDR.Vault,
    abi: vaultAbi,
    functionName: "userInfo",
    args: address ? [id, address] : undefined,
    query: { enabled: !!address },
  });

  const [local, setLocal] = useState<LocalArticle | undefined>();
  useEffect(() => {
    setLocal(getArticle(Number(id)));
  }, [id]);

  if (!article) {
    return <div className="text-ink-mute">Loading article from OPN Chain…</div>;
  }
  const [writer, createdAt, version, contentURI, contentHash] = article as readonly [
    `0x${string}`,
    bigint,
    number,
    string,
    `0x${string}`
  ];

  const myStaked = userInfo ? (userInfo as unknown as readonly [bigint, bigint, bigint])[0] : 0n;

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <article className="md:col-span-2">
        <div className="text-xs text-ink-mute font-mono mb-3">
          Article #{idStr} · v{version} · {shortAddr(writer)}
        </div>
        <h1 className="text-4xl font-serif mb-3 leading-tight">
          {local?.title ?? "(off-chain title not in cache)"}
        </h1>
        <div className="text-xs text-ink-mute mb-8">
          Published {new Date(Number(createdAt) * 1000).toLocaleString()} · hash{" "}
          <span className="font-mono">{contentHash.slice(0, 14)}…</span>
        </div>
        <div className="prose prose-invert font-serif whitespace-pre-wrap leading-relaxed">
          {local?.body ??
            "(Article body is stored locally for the MVP. Open this article on the device where it was published, or wire up IPFS to fetch from the contentURI.)"}
        </div>
        <div className="mt-12 text-xs text-ink-mute">
          contentURI: <span className="font-mono">{contentURI}</span>
        </div>
      </article>

      <aside className="space-y-4">
        <TipPanel articleId={id} writer={writer} onTipped={() => {
          refetchTotal();
          refetchPending();
        }} />
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
  writer,
  onTipped,
}: {
  articleId: bigint;
  writer: `0x${string}`;
  onTipped: () => void;
}) {
  const [amt, setAmt] = useState("0.1");
  const [memo, setMemo] = useState("");
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      onTipped();
      const t = setTimeout(reset, 2000);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onTipped, reset]);

  return (
    <div className="ink-card p-5">
      <div className="text-sm font-semibold mb-1">◎ Tip the writer</div>
      <div className="text-xs text-ink-mute mb-3">
        70% writer · 25% stakers · 5% treasury
      </div>
      <input
        className="ink-input mb-2"
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
        placeholder="Memo (optional)"
      />
      <button
        className="ink-btn w-full"
        disabled={isPending || isConfirming || !amt}
        onClick={() =>
          writeContractAsync({
            address: ADDR.Router,
            abi: routerAbi,
            functionName: "tipNative",
            args: [articleId, memo],
            value: parseEther(amt || "0"),
          })
        }
      >
        {isPending || isConfirming ? "Tipping…" : `Tip ${amt} OPN`}
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

  // Read user WOPN balance + allowance
  const { data: wopnBal } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "allowance",
    args: address ? [address, ADDR.Vault] : undefined,
    query: { enabled: !!address },
  });

  const {
    writeContractAsync,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      onAction();
      refetchAllow();
      const t = setTimeout(reset, 2000);
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
    });
  }
  async function approve() {
    await writeContractAsync({
      address: ADDR.WOPN,
      abi: wopnAbi,
      functionName: "approve",
      args: [ADDR.Vault, parseEther(amt || "0")],
    });
  }
  async function stake() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "stake",
      args: [articleId, parseEther(amt || "0")],
    });
  }
  async function unstake() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "unstake",
      args: [articleId, parseEther(amt || "0")],
    });
  }
  async function claim() {
    await writeContractAsync({
      address: ADDR.Vault,
      abi: vaultAbi,
      functionName: "claim",
      args: [articleId],
    });
  }

  const need = parseEther(amt || "0");
  const needsApproval = mode === "stake" && (allowance as bigint | undefined ?? 0n) < need;

  return (
    <div className="ink-card p-5">
      <div className="text-sm font-semibold mb-1">◈ Vault</div>
      <div className="text-xs text-ink-mute mb-3">
        Stake OPN. Earn from tips paid to this article.
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="bg-ink-bg p-2 rounded border border-ink-border">
          <div className="text-ink-mute">TVL</div>
          <div className="font-mono">{fmt(totalStaked)} OPN</div>
        </div>
        <div className="bg-ink-bg p-2 rounded border border-ink-border">
          <div className="text-ink-mute">Your stake</div>
          <div className="font-mono">{fmt(myStaked)} OPN</div>
        </div>
        <div className="bg-ink-bg p-2 rounded border border-ink-border col-span-2">
          <div className="text-ink-mute">Pending reward</div>
          <div className="font-mono text-ink-accent">
            {fmt(pending)} OPN
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-2 text-xs">
        <button
          className={`flex-1 py-1 rounded ${
            mode === "stake"
              ? "bg-ink-accent text-ink-bg"
              : "border border-ink-border"
          }`}
          onClick={() => setMode("stake")}
        >
          Stake
        </button>
        <button
          className={`flex-1 py-1 rounded ${
            mode === "unstake"
              ? "bg-ink-accent text-ink-bg"
              : "border border-ink-border"
          }`}
          onClick={() => setMode("unstake")}
        >
          Unstake
        </button>
      </div>

      <input
        className="ink-input mb-2"
        type="number"
        step="0.01"
        min="0"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
      />

      {mode === "stake" ? (
        <>
          <div className="text-xs text-ink-mute mb-2">
            WOPN balance: {fmt(wopnBal as bigint | undefined)}
          </div>
          <div className="flex flex-col gap-1">
            <button className="ink-btn-ghost text-xs" onClick={wrap} disabled={isPending}>
              1 · Wrap {amt} OPN → WOPN
            </button>
            {needsApproval && (
              <button className="ink-btn-ghost text-xs" onClick={approve} disabled={isPending}>
                2 · Approve vault
              </button>
            )}
            <button
              className="ink-btn"
              disabled={!isConnected || isPending || isConfirming || needsApproval}
              onClick={stake}
            >
              {needsApproval ? "Approve first" : `Stake ${amt} WOPN`}
            </button>
          </div>
        </>
      ) : (
        <button
          className="ink-btn w-full"
          disabled={!isConnected || isPending || isConfirming}
          onClick={unstake}
        >
          Unstake {amt} WOPN
        </button>
      )}

      {(pending as bigint | undefined ?? 0n) > 0n && (
        <button
          className="mt-2 w-full text-xs py-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
          onClick={claim}
          disabled={isPending || isConfirming}
        >
          Claim {fmt(pending)} OPN
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
