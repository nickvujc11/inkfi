"use client";
import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
      <path
        d="M24 8 L36 22 L24 42 L12 22 Z"
        fill="none"
        stroke="#c9a84c"
        strokeWidth="2"
      />
      <path
        d="M24 22 L24 42"
        stroke="#c9a84c"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <circle
        cx="14"
        cy="16"
        r="5"
        fill="none"
        stroke="#2952cc"
        strokeWidth="2"
      />
      <circle
        cx="34"
        cy="16"
        r="5"
        fill="none"
        stroke="#2952cc"
        strokeWidth="2"
      />
      <path d="M19 16 L29 16" stroke="#2952cc" strokeWidth="2" />
      <circle cx="24" cy="38" r="3" fill="#c9a84c" />
    </svg>
  );
}

export default function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="transition-transform group-hover:rotate-3">
        <LogoMark size={36} />
      </div>
      <div className="leading-tight flex flex-col">
        <span
          className="font-serif text-[22px] tracking-tight"
          style={{ color: "var(--paper)" }}
        >
          Ink<span style={{ color: "var(--gold)" }}>Fi</span>
        </span>
        {tagline && (
          <span
            className="font-mono text-[10px] uppercase mt-[-2px]"
            style={{ color: "var(--gold)", letterSpacing: "0.25em" }}
          >
            Open Finance for Writers
          </span>
        )}
      </div>
    </Link>
  );
}
