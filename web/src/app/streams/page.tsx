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
    <div className="space-y-10">
      <div>
        <div className="kicker mb-2">∾ The Subscription</div>
        <h1
          className="font-display mb-3"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1,
            color: "var(--parchment)",
          }}
        >
          Standing{" "}
          <span style={{ color: "var(--brass-2)", fontStyle: "italic" }}>
            Streams
          </span>
        </h1>
        <p
          className="font-display italic max-w-2xl leading-relaxed"
          style={{
            fontSize: "1.08rem",
            color: "var(--parchment-3)",
          }}
        >
          A patron may pledge OPN to a writer at a fixed rate per second. The
          writer collects continuously; the patron may rescind at any time and
          recover the unspent balance. OPN Chain&apos;s sub-second finality
          makes the pledge feel alive.
        </p>
      </div>

      <div className="engraved-double" />

      <div className="grid lg:grid-cols-2 gap-5">
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
    <div className="shelf-card p-7">
      <div className="flex items-center justify-between mb-1">
        <div
          className="font-display italic"
          style={{ fontSize: "20px", color: "var(--parchment)" }}
        >
          ∾ Pledge a New Stream
        </div>
        <span className="stamp stamp-indigo">
          <span className="dot dot-stream"></span> live
        </span>
      </div>
      <div
        className="text-[11px] mb-5 font-mono"
        style={{ color: "var(--muted)" }}
      >
        Patron pays in WOPN. Recipient withdraws continuously.
      </div>

      <Field label="recipient address">
        <input
          className="ink-input font-mono"
          placeholder="0x…"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="deposit · OPN">
          <input
            className="ink-input font-mono"
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </Field>
        <Field label="rate · OPN/day">
          <input
            className="ink-input font-mono"
            type="number"
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
          />
        </Field>
      </div>

      <div
        className="mt-4 mb-4 p-3 rounded-sm"
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="kicker mb-1">Estimated duration</div>
        <div
          className="font-display italic"
          style={{
            fontSize: "1.2rem",
            color: "var(--parchment)",
          }}
        >
          {durationDays.toFixed(2)} days
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="btn btn-ghost text-[11px]"
          onClick={wrap}
          disabled={isPending}
        >
          I · Wrap {deposit} OPN
        </button>
        {needsApproval && (
          <button
            className="btn btn-ghost text-[11px]"
            onClick={approve}
            disabled={isPending}
          >
            II · Approve InkStream
          </button>
        )}
        <button
          className="btn btn-brass"
          disabled={isPending || isConfirming || !recipient || needsApproval}
          onClick={open}
        >
          {needsApproval ? "Approve to enable" : "Pledge the stream →"}
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
    <div className="shelf-card p-7">
      <div className="flex items-center justify-between mb-1">
        <div
          className="font-display italic"
          style={{ fontSize: "20px", color: "var(--parchment)" }}
        >
          ⤺ Inspect a Stream
        </div>
      </div>
      <div
        className="text-[11px] mb-5 font-mono"
        style={{ color: "var(--muted)" }}
      >
        Withdraw or rescind by ID.
      </div>

      <Field label="stream id">
        <input
          className="ink-input font-mono"
          type="number"
          min="1"
          value={streamId}
          onChange={(e) => setStreamId(e.target.value)}
        />
      </Field>

      {empty ? (
        <div
          className="mt-5 py-7 text-center rounded-sm font-display italic"
          style={{
            color: "var(--parchment-3)",
            border: "1px dashed var(--border)",
          }}
        >
          No stream with ID {streamId}.
          <br />
          New streams are numbered sequentially from 1.
        </div>
      ) : (
        <div className="space-y-2 mt-5">
          <Row label="patron" value={shortAddr(s![0])} />
          <Row label="recipient" value={shortAddr(s![1])} />
          <Row label="deposited" value={`${fmt(s![2], 4)} WOPN`} />
          <Row label="withdrawn" value={`${fmt(s![3], 4)} WOPN`} />
          <Row label="rate" value={`${fmt(s![4] * 86400n, 3)} /day`} />
          <Row
            label="status"
            value={
              s![6] === 0n ? (
                <span style={{ color: "var(--verdigris-2)" }}>● active</span>
              ) : (
                <span style={{ color: "var(--muted)" }}>○ stopped</span>
              )
            }
          />

          <div
            className="pt-3 mt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div
              className="p-3 rounded-sm mb-2 relative overflow-hidden"
              style={{
                background: "rgba(91, 107, 160, 0.08)",
                border: "1px solid rgba(91, 107, 160, 0.4)",
              }}
            >
              <div className="kicker mb-1">withdrawable now</div>
              <div
                className="font-display"
                style={{
                  fontSize: "1.7rem",
                  color: "var(--indigo-2)",
                  lineHeight: 1,
                }}
              >
                {fmt(withdrawable as bigint | undefined, 6)}
                <span
                  className="text-xs ml-1.5 font-mono"
                  style={{ color: "var(--muted)" }}
                >
                  WOPN
                </span>
              </div>
            </div>
            <Row
              label="remaining"
              value={`${fmt(remaining as bigint | undefined, 4)} WOPN`}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="btn btn-brass flex-1"
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
              Collect
            </button>
            <button
              className="btn btn-stamp flex-1"
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
              Rescind
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="kicker block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center text-sm py-1">
      <span className="kicker">{label}</span>
      <span className="font-mono" style={{ color: "var(--parchment)" }}>
        {value}
      </span>
    </div>
  );
}
