"use client";
import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="brass-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4b97d" />
          <stop offset="1" stopColor="#b08d57" />
        </linearGradient>
      </defs>
      {/* Quill stem (diagonal) */}
      <path
        d="M14 36 L26 14"
        stroke="url(#brass-grad)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Feather barbs */}
      <path
        d="M22 18 L18 16 M24 22 L20 20 M26 26 L22 24 M28 30 L24 28"
        stroke="#b08d57"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Ink drop (stamp red) */}
      <circle cx="13" cy="38" r="2.5" fill="#9b2c2c" />
      <circle cx="13" cy="38" r="1" fill="#b03838" opacity="0.6" />
      {/* Open-book base */}
      <path
        d="M8 38 L24 36 L40 38 L40 42 L24 40 L8 42 Z"
        fill="url(#brass-grad)"
        opacity="0.4"
      />
      <path
        d="M24 36 L24 40"
        stroke="#1a0f0a"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export default function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="transition-transform group-hover:rotate-3">
        <LogoMark size={40} />
      </div>
      <div className="leading-none flex flex-col gap-1">
        <span
          className="font-display text-[24px] tracking-tight"
          style={{ color: "var(--parchment)" }}
        >
          Ink<span style={{ color: "var(--brass-2)", fontStyle: "italic" }}>Fi</span>
        </span>
        {tagline && (
          <span
            className="font-mono text-[9px] uppercase"
            style={{ color: "var(--brass)", letterSpacing: "0.3em" }}
          >
            Library of Letters
          </span>
        )}
      </div>
    </Link>
  );
}
