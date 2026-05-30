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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="ink-chip mb-2">new article</div>
          <h1 className="font-serif text-4xl font-semibold">Write</h1>
        </div>
        <div className="flex gap-2 text-xs font-mono text-ink-mute">
          <span className="ink-stat">{wordCount} words</span>
          <span className="ink-stat">~{readMin} min read</span>
        </div>
      </div>

      <p className="text-ink-mute text-sm mb-8 max-w-2xl">
        Publishing mints a soulbound NFT to your wallet. The content hash is
        anchored on OPN Chain. The body is cached locally for the MVP, then
        rendered on the article page.
      </p>

      <div className="ink-card p-8">
        <input
          className="w-full bg-transparent border-0 text-3xl md:text-4xl font-serif font-semibold mb-4 focus:outline-none placeholder:text-ink-mute"
          placeholder="An untitled story…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="h-px bg-ink-border mb-4" />
        <textarea
          className="w-full bg-transparent border-0 font-serif text-lg leading-relaxed h-[60vh] resize-none focus:outline-none placeholder:text-ink-mute"
          placeholder="Tell your story. The chain is listening."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="mt-6 flex items-center gap-4 sticky bottom-4">
        <button
          className="ink-btn"
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
          <span className="text-ink-mute text-sm">Connect wallet to publish.</span>
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
