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
          <div
            className="text-[10px] font-mono uppercase mb-2"
            style={{ color: "var(--muted)", letterSpacing: "0.3em" }}
          >
            new article
          </div>
          <h1 className="font-serif text-4xl">Write</h1>
        </div>
        <div
          className="flex gap-2 text-[11px] font-mono"
          style={{ color: "var(--muted)" }}
        >
          <span
            className="px-3 py-1.5 rounded"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {wordCount} words
          </span>
          <span
            className="px-3 py-1.5 rounded"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            ~{readMin} min read
          </span>
        </div>
      </div>

      <p
        className="text-sm mb-6 max-w-2xl font-news"
        style={{ color: "var(--muted)", fontStyle: "italic" }}
      >
        Publishing mints a soulbound NFT to your wallet. The content hash is
        anchored on OPN Chain. The body is cached locally for the MVP.
      </p>

      <div className="panel">
        <input
          className="w-full bg-transparent border-0 text-3xl md:text-4xl font-serif mb-3 focus:outline-none"
          style={{ color: "var(--paper)" }}
          placeholder="An untitled story…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="h-px mb-4" style={{ background: "var(--border)" }} />
        <textarea
          className="w-full bg-transparent border-0 font-news text-lg leading-relaxed h-[60vh] resize-none focus:outline-none"
          style={{ color: "var(--paper)" }}
          placeholder="Tell your story. The chain is listening."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="mt-6 flex items-center gap-4 sticky bottom-4">
        <button
          className="btn btn-primary"
          disabled={
            !isConnected || !title || !body || isPending || isConfirming
          }
          onClick={publish}
        >
          {isPending || isConfirming
            ? "Publishing…"
            : "Publish to OPN Chain →"}
        </button>
        {!isConnected && (
          <span
            className="text-xs"
            style={{ color: "var(--muted)" }}
          >
            Connect wallet to publish.
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
