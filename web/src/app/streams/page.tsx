"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { ADDR } from "@/lib/addresses";
import { streamAbi, wopnAbi } from "@/lib/abis";
import { fmt, shortAddr } from "@/lib/format";
import { TxStatus } from "@/components/PendingTx";

export default function StreamsPage() {
  return (
    <div>
      <div className="mb-12">
        <div className="ink-chip mb-3">∞ inkstream</div>
        <h1 className="font-serif text-5xl font-bold tracking-tight">
          Streams
        </h1>
        <p className="text-ink-mute2 mt-3 max-w-2xl leading-relaxed">
          Subscribe to a writer with a per-second stream of OPN. The writer can
          withdraw continuously. You can cancel any time and reclaim the
          unstreamed remainder. OPN Chain&apos;s ~1s block time makes this feel
          live.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <OpenStream />
        <ManageStream />
      </div>
    </div>
  );
}

function OpenStream() {
  const [recipient, setRecipient] = useState("");
  const [deposit, setDeposit] = useState("10");
  const [perDay, setPerDay] = useState("1");
  const { address } = useAccount();

  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: ADDR.WOPN,
    abi: wopnAbi,
    functionName: "allowance",
    args: address ? [address, ADDR.Stream] : undefined,
    query: { enabled: !!address },
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

  const ratePerSecond =
    parseEther(perDay || "0") > 0n
      ? parseEther(perDay || "0") / 86400n
      : 0n;
  const depositWei = parseEther(deposit || "0");
  const needsApproval = ((allowance as bigint | undefined) ?? 0n) < depositWei;
  const durationDays =
    parseEther(perDay || "0") > 0n
      ? Number((depositWei * 1000n) / parseEther(perDay || "1")) / 1000
      : 0;

  async function wrap() {
    await writeContractAsync({
      address: ADDR.WOPN,
      abi: wopnAbi,
      functionName: "deposit",
      args: [],
      value: depositWei,
      gas: 200_000n,
    });
  }
  async function approve() {
    await writeContractAsync({
      address: ADDR.WOPN,
      abi: wopnAbi,
      functionName: "approve",
      args: [ADDR.Stream, depositWei],
      gas: 200_000n,
    });
  }
  async function open() {
    await writeContractAsync({
      address: ADDR.Stream,
      abi: streamAbi,
      functionName: "open",
      args: [recipient as `0x${string}`, depositWei, ratePerSecond],
      gas: 500_000n,
    });
  }

  return (
    <div className="ink-card p-6">
      <div className="font-semibold mb-1 flex items-center gap-2">
        <span className="text-ink-violet2">→</span> Open new stream
      </div>
      <div className="text-xs text-ink-mute mb-5">
        Sender pays in WOPN. Recipient withdraws continuously.
      </div>

      <label className="text-[10px] uppercase tracking-widest text-ink-mute font-mono">
        recipient address
      </label>
      <input
        className="ink-input mt-1 mb-4 font-mono text-sm"
        placeholder="0x…"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-ink-mute font-mono">
            deposit · OPN
          </label>
          <input
            className="ink-input mt-1 font-mono"
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-ink-mute font-mono">
            rate · OPN/day
          </label>
          <input
            className="ink-input mt-1 font-mono"
            type="number"
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
          />
        </div>
      </div>

      <div className="ink-stat text-xs mb-4">
        <div className="text-[10px] uppercase tracking-widest text-ink-mute font-mono">
          duration estimate
        </div>
        <div className="font-mono mt-0.5">
          {durationDays.toFixed(2)} days @ this rate
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button className="ink-btn-ghost text-xs" onClick={wrap} disabled={isPending}>
          1 · Wrap {deposit} OPN
        </button>
        {needsApproval && (
          <button
            className="ink-btn-ghost text-xs"
            onClick={approve}
            disabled={isPending}
          >
            2 · Approve InkStream
          </button>
        )}
        <button
          className="ink-btn"
          disabled={isPending || isConfirming || !recipient || needsApproval}
          onClick={open}
        >
          {needsApproval ? "Approve to enable" : "Open stream →"}
        </button>
      </div>
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

function ManageStream() {
  const [streamId, setStreamId] = useState("1");
  const id = BigInt(streamId || "0");

  const { data: stream, refetch: refetchStream } = useReadContract({
    address: ADDR.Stream,
    abi: streamAbi,
    functionName: "streams",
    args: [id],
    query: { enabled: id > 0n, refetchInterval: 2000 },
  });
  const { data: withdrawable, refetch: refetchWithdraw } = useReadContract({
    address: ADDR.Stream,
    abi: streamAbi,
    functionName: "withdrawable",
    args: [id],
    query: { enabled: id > 0n, refetchInterval: 1000 },
  });
  const { data: remaining } = useReadContract({
    address: ADDR.Stream,
    abi: streamAbi,
    functionName: "remaining",
    args: [id],
    query: { enabled: id > 0n, refetchInterval: 1000 },
  });

  const { writeContractAsync, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  useEffect(() => {
    if (isSuccess) {
      refetchStream();
      refetchWithdraw();
      const t = setTimeout(reset, 2500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, refetchStream, refetchWithdraw, reset]);

  const s = stream as
    | readonly [
        `0x${string}`,
        `0x${string}`,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ]
    | undefined;

  const empty = !s || s[0] === "0x0000000000000000000000000000000000000000";

  return (
    <div className="ink-card p-6">
      <div className="font-semibold mb-1 flex items-center gap-2">
        <span className="text-ink-violet2">⤺</span> Manage stream
      </div>
      <div className="text-xs text-ink-mute mb-5">
        Withdraw or cancel an existing stream by ID.
      </div>

      <label className="text-[10px] uppercase tracking-widest text-ink-mute font-mono">
        stream id
      </label>
      <input
        className="ink-input mt-1 mb-5 font-mono"
        type="number"
        min="1"
        value={streamId}
        onChange={(e) => setStreamId(e.target.value)}
      />

      {empty ? (
        <div className="text-ink-mute text-sm py-4 text-center border border-dashed border-ink-border rounded-md">
          No stream with ID {streamId}.
          <br />
          New streams are numbered sequentially from 1.
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <Row label="sender" value={shortAddr(s![0])} mono />
          <Row label="recipient" value={shortAddr(s![1])} mono />
          <Row label="deposited" value={`${fmt(s![2], 4)} WOPN`} mono />
          <Row label="withdrawn" value={`${fmt(s![3], 4)} WOPN`} mono />
          <Row label="rate" value={`${fmt(s![4] * 86400n, 3)} /day`} mono />
          <Row
            label="status"
            value={
              s![6] === 0n ? (
                <span className="text-emerald-400 font-medium">● active</span>
              ) : (
                <span className="text-ink-mute">○ stopped</span>
              )
            }
          />
          <div className="border-t border-ink-border pt-3 mt-3">
            <div className="ink-stat bg-gradient-to-br from-ink-violet/10 to-transparent border-ink-violet/30 mb-2">
              <div className="text-[10px] uppercase tracking-widest text-ink-violet2 font-mono">
                withdrawable now
              </div>
              <div className="font-mono mt-0.5 text-2xl text-ink-violet2 font-semibold tabular-nums">
                {fmt(withdrawable as bigint | undefined, 6)}
                <span className="text-sm text-ink-mute ml-1">WOPN</span>
              </div>
            </div>
            <Row
              label="remaining"
              value={`${fmt(remaining as bigint | undefined, 4)} WOPN`}
              mono
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="ink-btn flex-1"
              onClick={() =>
                writeContractAsync({
                  address: ADDR.Stream,
                  abi: streamAbi,
                  functionName: "withdraw",
                  args: [id],
                  gas: 400_000n,
                })
              }
              disabled={isPending || isConfirming}
            >
              Withdraw
            </button>
            <button
              className="ink-btn-ghost flex-1"
              onClick={() =>
                writeContractAsync({
                  address: ADDR.Stream,
                  abi: streamAbi,
                  functionName: "cancel",
                  args: [id],
                  gas: 400_000n,
                })
              }
              disabled={isPending || isConfirming}
            >
              Cancel
            </button>
          </div>
          <TxStatus
            hash={hash}
            isPending={isPending}
            isConfirming={isConfirming}
            isConfirmed={isSuccess}
            error={error}
          />
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm py-0.5">
      <span className="text-ink-mute text-xs uppercase tracking-wider font-mono">
        {label}
      </span>
      <span className={mono ? "font-mono text-ink-paper" : "text-ink-paper"}>
        {value}
      </span>
    </div>
  );
}
