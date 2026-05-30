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
        <div className="section-mast">
          <span className="num">∮</span>
          <span className="label">Patronage</span>
          <span className="meta">per-second subscription</span>
        </div>
        <p className="font-display italic text-paper-mute max-w-2xl text-[18px] leading-relaxed">
          Subscribe to a writer with a per-second flow of OPN. The writer
          withdraws continuously. You may revoke at any time and reclaim the
          unstreamed remainder. OPN Chain&apos;s sub-second finality makes this
          feel alive.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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

  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isSuccess) {
      refetchAllow();
      const t = setTimeout(reset, 2500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, refetchAllow, reset]);

  const ratePerSecond =
    parseEther(perDay || "0") > 0n ? parseEther(perDay || "0") / 86400n : 0n;
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
    <div className="surface p-7">
      <div className="flex items-center justify-between mb-1">
        <div className="font-display italic text-2xl text-paper">Open Patronage</div>
        <span className="stamp stamp-indigo">
          <span className="dot dot-stream" /> live
        </span>
      </div>
      <div className="text-[11px] mb-6 font-mono uppercase tracking-[0.14em] text-paper-mute">
        Sender pays in WOPN. Recipient withdraws continuously.
      </div>

      <Field label="recipient address">
        <input
          className="ink-input"
          placeholder="0x…"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Field label="deposit · OPN">
          <input
            className="ink-input"
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </Field>
        <Field label="rate · OPN/day">
          <input
            className="ink-input"
            type="number"
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5 mb-5 surface-raised p-4">
        <div className="label-engraved">duration estimate</div>
        <div className="font-display text-2xl mt-1 text-brass">
          {durationDays.toFixed(2)}
          <span className="text-sm ml-2 text-paper-mute font-mono">days at this rate</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button className="btn btn-ghost" onClick={wrap} disabled={isPending}>
          i · Wrap {deposit} OPN
        </button>
        {needsApproval && (
          <button className="btn btn-ghost" onClick={approve} disabled={isPending}>
            ii · Approve InkStream
          </button>
        )}
        <button
          className="btn btn-primary justify-center"
          disabled={isPending || isConfirming || !recipient || needsApproval}
          onClick={open}
        >
          {needsApproval ? "Approve to enable" : "Open patronage →"}
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

  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
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
    <div className="surface p-7">
      <div className="flex items-center justify-between mb-1">
        <div className="font-display italic text-2xl text-paper">Manage Patronage</div>
      </div>
      <div className="text-[11px] mb-6 font-mono uppercase tracking-[0.14em] text-paper-mute">
        Withdraw or revoke an existing patronage by ID.
      </div>

      <Field label="patronage id">
        <input
          className="ink-input"
          type="number"
          min="1"
          value={streamId}
          onChange={(e) => setStreamId(e.target.value)}
        />
      </Field>

      {empty ? (
        <div className="mt-6 text-sm py-8 text-center rounded-sm border border-dashed border-rule text-paper-mute font-display italic">
          No patronage with ID {streamId}.
          <br />
          New patronages are numbered sequentially from 1.
        </div>
      ) : (
        <div className="space-y-2 mt-6 text-sm">
          <Row label="sender" value={shortAddr(s![0])} />
          <Row label="recipient" value={shortAddr(s![1])} />
          <Row label="deposited" value={`${fmt(s![2], 4)} WOPN`} />
          <Row label="withdrawn" value={`${fmt(s![3], 4)} WOPN`} />
          <Row label="rate" value={`${fmt(s![4] * 86400n, 3)} /day`} />
          <Row
            label="status"
            value={
              s![6] === 0n ? (
                <span className="text-verdigris-bright">● active</span>
              ) : (
                <span className="text-paper-mute">○ revoked</span>
              )
            }
          />
          <div className="pt-4 mt-4 border-t border-rule">
            <div className="surface-raised p-4 mb-3">
              <div className="label-engraved">withdrawable now</div>
              <div className="font-display text-[32px] mt-1 text-brass-bright leading-none">
                {fmt(withdrawable as bigint | undefined, 6)}
                <span className="text-sm ml-2 text-paper-mute font-mono">WOPN</span>
              </div>
            </div>
            <Row
              label="remaining"
              value={`${fmt(remaining as bigint | undefined, 4)} WOPN`}
            />
          </div>
          <div className="flex gap-2 mt-5">
            <button
              className="btn btn-primary flex-1 justify-center"
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
              className="btn btn-ghost flex-1 justify-center"
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
              Revoke
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-engraved block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm py-1">
      <span className="label-engraved">{label}</span>
      <span className="font-mono text-paper">{value}</span>
    </div>
  );
}
