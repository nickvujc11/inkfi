"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi } from "@/lib/abis";
import { loadArticles, type LocalArticle } from "@/lib/articles";
import { fmt, shortAddr } from "@/lib/format";

export default function Home() {
  const { data: nextId } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "nextId",
  });

  const total = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: total }, (_, i) => total - i); // newest first

  return (
    <div>
      <section className="text-center py-16 border-b border-ink-border">
        <div className="inline-block px-3 py-1 rounded-full border border-ink-border text-xs text-ink-mute mb-6">
          {total} {total === 1 ? "article" : "articles"} on-chain · OPN Testnet
        </div>
        <h1 className="text-5xl md:text-6xl font-serif tracking-tight">
          Write Once.
          <br />
          <span className="text-ink-accent">Earn Forever.</span>
        </h1>
        <p className="text-ink-mute mt-6 max-w-xl mx-auto">
          Decentralized publishing where every article is a yield-bearing asset.
          Tip, stake, and stream. No platforms. No middlemen. Just OPN Chain.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/write" className="ink-btn">
            ✍ Start Writing
          </Link>
          <Link href="#feed" className="ink-btn-ghost">
            Explore Articles
          </Link>
        </div>
      </section>

      <section id="feed" className="py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif">Latest Articles</h2>
          <span className="text-ink-mute text-sm">
            Sorted by recency · live from chain
          </span>
        </div>

        {total === 0 ? (
          <div className="ink-card p-12 text-center text-ink-mute">
            <div className="text-4xl mb-3">✍</div>
            No articles yet. Be the first writer on InkFi.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {ids.map((id) => (
              <ArticleCard key={id} id={id} />
            ))}
          </div>
        )}
      </section>

      <section className="py-12 border-t border-ink-border">
        <h2 className="text-2xl font-serif mb-6">Why InkFi</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: "✍",
              title: "Write",
              body: "Distraction-free editor. Publish to OPN Chain. Article becomes a soulbound NFT proving authorship.",
            },
            {
              icon: "◈",
              title: "Stake",
              body: "Fans deposit OPN on articles they believe in. When the article gets tipped, stakers earn real yield.",
            },
            {
              icon: "∞",
              title: "Stream",
              body: "Subscribers stream OPN to writers per second. Real-time income, made viable by OPN's fast finality.",
            },
          ].map((f) => (
            <div key={f.title} className="ink-card p-6">
              <div className="text-3xl">{f.icon}</div>
              <div className="font-semibold mt-3">{f.title}</div>
              <div className="text-ink-mute text-sm mt-2">{f.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ArticleCard({ id }: { id: number }) {
  const { data } = useReadContract({
    address: ADDR.ArticleNFT,
    abi: articleNftAbi,
    functionName: "articles",
    args: [BigInt(id)],
  });

  const [local, setLocal] = useState<LocalArticle | undefined>();
  useEffect(() => {
    setLocal(loadArticles()[id]);
  }, [id]);

  if (!data) {
    return (
      <div className="ink-card p-5 animate-pulse">
        <div className="h-4 bg-ink-border rounded w-2/3" />
        <div className="h-3 bg-ink-border rounded w-full mt-3" />
        <div className="h-3 bg-ink-border rounded w-5/6 mt-2" />
      </div>
    );
  }

  const [writer, createdAt, version, contentURI] = data as readonly [
    `0x${string}`,
    bigint,
    number,
    string,
    `0x${string}`
  ];

  return (
    <Link href={`/article/${id}`} className="block">
      <div className="ink-card p-5 hover:border-ink-accent transition">
        <div className="flex items-center justify-between text-xs text-ink-mute">
          <span className="font-mono">#{id}</span>
          <span>v{version}</span>
        </div>
        <h3 className="font-serif text-xl mt-2 line-clamp-2">
          {local?.title ?? "(untitled)"}
        </h3>
        <p className="text-ink-mute text-sm mt-2 line-clamp-3">
          {local?.body?.slice(0, 200) ?? contentURI}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-ink-mute">
          <span className="font-mono">{shortAddr(writer)}</span>
          <span>{new Date(Number(createdAt) * 1000).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}
