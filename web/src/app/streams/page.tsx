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
  const { address, isConnected } = useAccount();

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-serif">∞ InkStream</h1>
        <p className="text-ink-mute mt-2 max-w-2xl">
          Subscribe to a writer with a per-second stream of OPN. The writer can
          withdraw continuously. You can cancel any time and reclaim the
          unstreamed remainder. OPN Chain&apos;s ~1s block time makes this feel
          live.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
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

  // Convert "X OPN per day" to ratePerSecond in wei
  const ratePerSecond =
    (parseEther(perDay || "0") * 10n) / (86400n * 10n); // simple division
  const depositWei = parseEther(deposit || "0");
  const needsApproval = (allowance as bigint | undefined ?? 0n) < depositWei;
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
    });
  }
  async function approve() {
    await writeContractAsync({
      address: ADDR.WOPN,
      abi: wopnAbi,
      functionName: "approve",
      args: [ADDR.Stream, depositWei],
    });
  }
  async function open() {
    await writeContractAsync({
      address: ADDR.Stream,
      abi: streamAbi,
      functionName: "open",
      args: [recipient as `0x${string}`, depositWei, ratePerSecond],
    });
  }

  return (
    <div className="ink-card p-6">
      <div className="font-semibold mb-3">Open new stream</div>
      <label className="text-xs text-ink-mute">Recipient address</label>
      <input
        className="ink-input mb-3 font-mono text-sm"
        placeholder="0x…"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-mute">Deposit (OPN)</label>
          <input
            className="ink-input"
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-ink-mute">Rate (OPN/day)</label>
          <input
            className="ink-input"
            type="number"
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
          />
        </div>
      </div>
      <div className="text-xs text-ink-mute mt-3">
        Stream lasts ≈ {durationDays.toFixed(2)} days at this rate.
      </div>
      <div className="flex flex-col gap-2 mt-4">
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
          {needsApproval ? "Approve first" : "Open stream"}
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
    query: { enabled: id > 0n },
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
        bigint
      ]
    | undefined;

  return (
    <div className="ink-card p-6">
      <div className="font-semibold mb-3">Manage stream</div>
      <label className="text-xs text-ink-mute">Stream ID</label>
      <input
        className="ink-input mb-4 font-mono"
        type="number"
        min="1"
        value={streamId}
        onChange={(e) => setStreamId(e.target.value)}
      />
      {s && s[0] !== "0x0000000000000000000000000000000000000000" ? (
        <div className="space-y-3 text-sm">
          <Row label="Sender" value={shortAddr(s[0])} />
          <Row label="Recipient" value={shortAddr(s[1])} />
          <Row label="Deposited" value={`${fmt(s[2])} WOPN`} />
          <Row label="Withdrawn" value={`${fmt(s[3])} WOPN`} />
          <Row
            label="Rate"
            value={`${fmt(s[4] * 86400n)} WOPN/day`}
          />
          <Row
            label="Status"
            value={
              s[6] === 0n ? (
                <span className="text-emerald-400">● Active</span>
              ) : (
                <span className="text-ink-mute">○ Stopped</span>
              )
            }
          />
          <div className="border-t border-ink-border pt-3">
            <Row
              label="Withdrawable now"
              value={
                <span className="text-ink-accent font-mono">
                  {fmt(withdrawable as bigint | undefined, 6)} WOPN
                </span>
              }
            />
            <Row
              label="Remaining"
              value={`${fmt(remaining as bigint | undefined)} WOPN`}
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
      ) : (
        <div className="text-ink-mute text-sm">
          No stream with that ID. New streams are numbered sequentially starting
          from 1.
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-ink-mute">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
