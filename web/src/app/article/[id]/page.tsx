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
      <div className="text-center py-20 text-paper-mute font-display italic">
        Retrieving volume from the archive…
      </div>
    );
  }

  const [writer, createdAt, version, contentURI, contentHash] =
    article as readonly [`0x${string}`, bigint, number, string, `0x${string}`];

  const myStaked = userInfo
    ? (userInfo as unknown as readonly [bigint, bigint, bigint])[0]
    : 0n;

  const wordCount = (local?.body ?? "").trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-12">
      <article className="max-w-[680px]">
        <div className="flex items-center gap-2 mb-5">
          <span className="stamp stamp-mute">№ {idStr.padStart(3, "0")}</span>
          <span className="stamp stamp-mute">v{version}</span>
          <span className="font-mono text-[11px] text-paper-mute">
            by {shortAddr(writer)}
          </span>
        </div>
        <h1 className="font-display text-[56px] md:text-[68px] leading-[0.95] tracking-tight mb-6 text-paper">
          {local?.title ?? (
            <span className="text-paper-mute italic">(off-chain title not in cache)</span>
          )}
        </h1>
        <div className="rule mb-6"><span className="rule-dot" /></div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] mb-12 flex-wrap text-paper-mute">
          <span>
            {new Date(Number(createdAt) * 1000).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </span>
          <span className="text-brass">·</span>
          <span>
            {wordCount} words · {readMin} min
          </span>
          <span className="text-brass">·</span>
          <span title={contentHash} className="lowercase">
            hash {contentHash.slice(0, 10)}…
          </span>
        </div>

        <div className="prose-ink whitespace-pre-wrap">
          {local?.body ?? (
            <span className="text-paper-mute italic">
              (Article body is stored locally for the MVP. Open this article on
              the device where it was published, or wire up IPFS to fetch from
              the contentURI on-chain.)
            </span>
          )}
        </div>

        <div className="mt-20 pt-6 border-t border-rule font-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute">
          <span className="text-brass">contentURI</span> · {contentURI}
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
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      onTipped();
      const t = setTimeout(reset, 2500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onTipped, reset]);

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="font-display italic text-[18px] text-paper">Endow</div>
        <span className="stamp stamp-brass">native OPN</span>
      </div>
      <div className="text-[11px] mb-4 font-mono uppercase tracking-[0.16em] text-paper-mute">
        70 / 25 / 5 — writer · stakers · treasury
      </div>
      <input
        className="ink-input mb-2"
        type="number"
        step="0.01"
        min="0.001"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        placeholder="amount in OPN"
      />
      <input
        className="ink-input mb-3"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="dedication (optional)"
      />
      <button
        className="btn btn-primary w-full justify-center"
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
        {isPending || isConfirming ? "Endowing…" : `Endow ${amt} OPN`}
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

  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="font-display italic text-[18px] text-paper">Endorse</div>
        <span className="stamp stamp-verdigris">
          <span className="dot dot-live" /> live
        </span>
      </div>
      <div className="text-[11px] mb-4 font-mono uppercase tracking-[0.16em] text-paper-mute">
        Stake OPN. Earn from tips paid to this volume.
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Tile label="Pool TVL" value={fmt(totalStaked, 4)} />
        <Tile label="Your Stake" value={fmt(myStaked, 4)} />
      </div>

      <div className="surface-raised p-4 mb-4 relative">
        <div className="label-engraved mb-1.5">Pending Yield</div>
        <div className="font-display text-[34px] leading-none text-brass-bright font-semibold">
          {fmt(pending, 6)}
          <span className="text-xs ml-2 text-paper-mute font-mono">OPN</span>
        </div>
        {((pending as bigint | undefined) ?? 0n) > 0n && (
          <span
            className="absolute -top-2 -right-2 stamp stamp-stamp stamp-tilt"
            style={{ transform: "rotate(8deg)" }}
          >
            CLAIMABLE
          </span>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-3 p-1 rounded-sm bg-walnut-deep border border-rule">
        <button
          className={`flex-1 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition ${
            mode === "stake"
              ? "bg-brass text-walnut font-semibold"
              : "text-paper-mute hover:text-paper"
          }`}
          onClick={() => setMode("stake")}
        >
          Stake
        </button>
        <button
          className={`flex-1 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition ${
            mode === "unstake"
              ? "bg-brass text-walnut font-semibold"
              : "text-paper-mute hover:text-paper"
          }`}
          onClick={() => setMode("unstake")}
        >
          Unstake
        </button>
      </div>

      <input
        className="ink-input mb-3"
        type="number"
        step="0.01"
        min="0"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
      />

      {mode === "stake" ? (
        <>
          <div className="text-[11px] mb-2 flex justify-between font-mono text-paper-mute uppercase tracking-[0.14em]">
            <span>WOPN balance</span>
            <span>{fmt(wopnBal as bigint | undefined, 4)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <button className="btn btn-ghost" onClick={wrap} disabled={isPending}>
              i · Wrap {amt} OPN
            </button>
            {needsApproval && (
              <button className="btn btn-ghost" onClick={approve} disabled={isPending}>
                ii · Approve vault
              </button>
            )}
            <button
              className="btn btn-primary justify-center"
              disabled={!isConnected || isPending || isConfirming || needsApproval}
              onClick={stake}
            >
              {needsApproval
                ? "Approve to enable"
                : isPending || isConfirming
                  ? "Endorsing…"
                  : `Endorse ${amt} WOPN`}
            </button>
          </div>
        </>
      ) : (
        <button
          className="btn btn-primary w-full justify-center"
          disabled={!isConnected || isPending || isConfirming}
          onClick={unstake}
        >
          Unstake {amt} WOPN
        </button>
      )}

      {((pending as bigint | undefined) ?? 0n) > 0n && (
        <button
          className="btn btn-stamp w-full justify-center mt-3"
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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-walnut-deep border border-rule rounded-sm p-3">
      <div className="label-engraved">{label}</div>
      <div className="font-mono mt-1 text-[16px] text-paper">{value}</div>
    </div>
  );
}
