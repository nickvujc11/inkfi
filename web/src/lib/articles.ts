"use client";
// Browser-side article store. For the MVP we keep article bodies in
// localStorage keyed by tokenId. The on-chain `contentURI` we record is a
// `inkfi-local://<id>` placeholder; production swap this for IPFS/Arweave.

export type LocalArticle = {
  id: number;
  title: string;
  body: string;
  writer: string;
  createdAt: number;
};

const KEY = "inkfi.articles.v1";

export function loadArticles(): Record<number, LocalArticle> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveArticle(a: LocalArticle) {
  if (typeof window === "undefined") return;
  const all = loadArticles();
  all[a.id] = a;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getArticle(id: number): LocalArticle | undefined {
  return loadArticles()[id];
}
