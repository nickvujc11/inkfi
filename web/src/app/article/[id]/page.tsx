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
      <div className="text-ink-mute text-center py-20">
        Loading article from OPN Chain…
      </div>
    );
  }

  const [writer, createdAt, version, contentURI, contentHash] = article as readonly [
    `0x${string}`,
    bigint,
    number,
    string,
    `0x${string}`,
  ];

  const myStaked = userInfo
    ? (userInfo as unknown as readonly [bigint, bigint, bigint])[0]
    : 0n;

  const wordCount = (local?.body ?? "").trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="grid md:grid-cols-3 gap-10">
      <article className="md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <span className="ink-chip">#{idStr}</span>
          <span className="ink-chip">v{version}</span>
          <span className="text-xs text-ink-mute font-mono">
            by {shortAddr(writer)}
          </span>
        </div>
        <h1 className="font-serif text-5xl font-bold leading-tight tracking-tight mb-4">
          {local?.title ?? <span className="text-ink-mute italic">(off-chain title not in cache)</span>}
        </h1>
        <div className="flex items-center gap-3 text-xs text-ink-mute mb-10 font-mono">
          <span>{new Date(Number(createdAt) * 1000).toLocaleDateString(undefined, { dateStyle: "long" })}</span>
          <span>·</span>
          <span>{wordCount} words · {readMin} min</span>
          <span>·</span>
          <span title={contentHash}>hash {contentHash.slice(0, 10)}…</span>
        </div>
        <div className="prose-ink whitespace-pre-wrap">
          {local?.body ?? (
            <span className="text-ink-mute italic">
              (Article body is stored locally for the MVP. Open this article on
              the device where it was published, or wire up IPFS to fetch from
              the contentURI on-chain.)
            </span>
          )}
        </div>
        <div className="mt-16 pt-6 border-t border-ink-border text-xs text-ink-mute font-mono">
          contentURI · {contentURI}
        </div>
      </article>

      <aside className="space-y-4 md:sticky md:top-24 self-start">
        <TipPanel
          articleId={id}
          writer={writer}
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
  writer,
  onTipped,
}: {
  articleId: bigint;
  writer: `0x${string}`;
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
    <div className="ink-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <span className="text-ink-amber">◎</span> Tip the writer
        </div>
        <span className="ink-chip">native OPN</span>
      </div>
      <div className="text-xs text-ink-mute mb-4">
        70% writer · 25% stakers · 5% treasury
      </div>
      <input
        className="ink-input mb-2 font-mono"
        type="number"
        step="0.01"
        min="0.001"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        placeholder="OPN"
      />
      <input
        className="ink-input mb-3 text-sm"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="memo (optional)"
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
            gas: 500_000n,
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
    <div className="ink-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <span className="text-ink-violet2">◈</span> Vault
        </div>
        <span className="ink-chip">live</span>
      </div>
      <div className="text-xs text-ink-mute mb-4">
        Stake OPN. Earn from tips paid to this article.
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="ink-stat">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute">TVL</div>
          <div className="font-mono mt-0.5 text-base">{fmt(totalStaked, 4)}</div>
        </div>
        <div className="ink-stat">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute">your stake</div>
          <div className="font-mono mt-0.5 text-base">{fmt(myStaked, 4)}</div>
        </div>
        <div className="ink-stat col-span-2 border-ink-violet/30 bg-gradient-to-br from-ink-violet/10 to-transparent">
          <div className="text-[10px] uppercase tracking-widest text-ink-violet2">pending reward</div>
          <div className="font-mono mt-0.5 text-xl text-ink-violet2 font-semibold">
            {fmt(pending, 6)} <span className="text-sm text-ink-mute">OPN</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-3 text-xs p-1 bg-ink-bg rounded-md border border-ink-border">
        <button
          className={`flex-1 py-1.5 rounded transition ${
            mode === "stake"
              ? "bg-ink-violet text-ink-paper font-semibold"
              : "text-ink-mute2 hover:text-white"
          }`}
          onClick={() => setMode("stake")}
        >
          Stake
        </button>
        <button
          className={`flex-1 py-1.5 rounded transition ${
            mode === "unstake"
              ? "bg-ink-violet text-ink-paper font-semibold"
              : "text-ink-mute2 hover:text-white"
          }`}
          onClick={() => setMode("unstake")}
        >
          Unstake
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
          <div className="text-xs text-ink-mute mb-2 flex justify-between">
            <span>WOPN balance</span>
            <span className="font-mono">
              {fmt(wopnBal as bigint | undefined, 4)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              className="ink-btn-ghost text-xs"
              onClick={wrap}
              disabled={isPending}
            >
              1 · Wrap {amt} OPN → WOPN
            </button>
            {needsApproval && (
              <button
                className="ink-btn-ghost text-xs"
                onClick={approve}
                disabled={isPending}
              >
                2 · Approve vault
              </button>
            )}
            <button
              className="ink-btn"
              disabled={
                !isConnected || isPending || isConfirming || needsApproval
              }
              onClick={stake}
            >
              {needsApproval ? "Approve to enable stake" : `Stake ${amt} WOPN`}
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

      {((pending as bigint | undefined) ?? 0n) > 0n && (
        <button
          className="mt-3 w-full text-xs py-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15 font-medium transition"
          onClick={claim}
          disabled={isPending || isConfirming}
        >
          ✓ Claim {fmt(pending, 6)} OPN
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
