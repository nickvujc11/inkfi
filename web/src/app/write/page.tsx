"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { keccak256, toHex } from "viem";
import { useRouter } from "next/navigation";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi } from "@/lib/abis";
import { TxStatus } from "@/components/PendingTx";
import { saveArticle } from "@/lib/articles";

export default function WritePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { writeContractAsync, data: hash, isPending, error } =
    useWriteContract();
  const publicClient = usePublicClient();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 220));

  async function publish() {
    if (!isConnected || !address || !publicClient) return;
    const payload = JSON.stringify({ title, body });
    const contentHash = keccak256(toHex(payload));
    const tempURI = `inkfi-local://pending`;

    const txHash = await writeContractAsync({
      address: ADDR.ArticleNFT,
      abi: articleNftAbi,
      functionName: "publish",
      args: [tempURI, contentHash],
      gas: 800_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    const log = receipt.logs.find(
      (l) => l.address.toLowerCase() === ADDR.ArticleNFT.toLowerCase()
    );
    if (log && log.topics[1]) {
      const id = Number(BigInt(log.topics[1]));
      saveArticle({
        id,
        title,
        body,
        writer: address,
        createdAt: Math.floor(Date.now() / 1000),
      });
      router.push(`/article/${id}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="kicker mb-2">The Inkwell</div>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(36px, 5vw, 48px)",
              lineHeight: 1,
              color: "var(--parchment)",
            }}
          >
            Inscribe a{" "}
            <span style={{ color: "var(--brass-2)", fontStyle: "italic" }}>
              Volume
            </span>
          </h1>
        </div>
        <div className="flex gap-2 text-[11px] font-mono">
          <span
            className="px-3 py-1.5 rounded-sm"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid var(--border)",
              color: "var(--parchment-3)",
            }}
          >
            {wordCount} words
          </span>
          <span
            className="px-3 py-1.5 rounded-sm"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid var(--border)",
              color: "var(--parchment-3)",
            }}
          >
            ~{readMin} min read
          </span>
        </div>
      </div>

      <p
        className="font-display italic mb-6 max-w-2xl"
        style={{
          fontSize: "1.05rem",
          color: "var(--parchment-3)",
        }}
      >
        Pressing this pen mints a soulbound volume to your wallet. The text&apos;s
        seal is anchored on OPN Chain. The body remains in your local cache for
        the present edition.
      </p>

      <div className="shelf-card p-8">
        <input
          className="w-full bg-transparent border-0 font-display mb-3 focus:outline-none"
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            color: "var(--parchment)",
            fontStyle: "italic",
          }}
          placeholder="An Untitled Volume…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="engraved-rule mb-6" />
        <textarea
          className="w-full bg-transparent border-0 prose-book focus:outline-none resize-none"
          style={{ minHeight: "60vh" }}
          placeholder="Begin here. Each word is recorded by the chain."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="mt-6 flex items-center gap-4 sticky bottom-4">
        <button
          className="btn btn-brass"
          disabled={
            !isConnected || !title || !body || isPending || isConfirming
          }
          onClick={publish}
        >
          {isPending || isConfirming
            ? "Pressing the seal…"
            : "Press the Seal · Inscribe →"}
        </button>
        {!isConnected && (
          <span
            className="font-display italic text-sm"
            style={{ color: "var(--parchment-3)" }}
          >
            Connect your wallet first.
          </span>
        )}
      </div>

      <TxStatus
        hash={hash}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={error}
      />
    </div>
  );
}
