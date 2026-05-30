"use client";
import Link from "next/link";

/** Library / archive logo: wax seal with quill nib silhouette inside. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-hidden
    >
      <defs>
        <radialGradient id="seal-grad" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#d4ad6e" />
          <stop offset="0.55" stopColor="#b08d57" />
          <stop offset="1" stopColor="#7a5d34" />
        </radialGradient>
        <filter id="emboss" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      {/* outer wax seal disk */}
      <circle cx="24" cy="24" r="22" fill="url(#seal-grad)" />
      {/* engraved ring */}
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="#1a0f0a"
        strokeWidth="0.7"
        opacity="0.55"
      />
      {/* quill nib (centered) */}
      <path
        d="M24 11 L30 24 L24 36 L18 24 Z"
        fill="#1a0f0a"
        opacity="0.85"
      />
      {/* nib slit */}
      <path
        d="M24 22 L24 36"
        stroke="#d4ad6e"
        strokeWidth="0.8"
        opacity="0.7"
      />
      {/* drop ink */}
      <circle cx="24" cy="33" r="1.6" fill="#d4ad6e" />
      {/* highlight gloss */}
      <ellipse
        cx="17"
        cy="16"
        rx="6"
        ry="3"
        fill="#fff5e0"
        opacity="0.18"
      />
    </svg>
  );
}

export default function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="transition-transform group-hover:rotate-2 duration-300">
        <LogoMark size={36} />
      </div>
      <div className="leading-tight flex flex-col">
        <span className="font-display text-[22px] tracking-tight font-semibold text-paper">
          Ink<span className="text-brass">Fi</span>
        </span>
        {tagline && (
          <span className="font-mono text-[9px] uppercase mt-0.5 text-brass tracking-[0.28em]">
            archive of finance
          </span>
        )}
      </div>
    </Link>
  );
}
