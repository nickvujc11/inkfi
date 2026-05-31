"use client";

interface Props {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export default function Sparkline({
  data,
  color = "var(--brass)",
  height = 32,
  className = "",
}: Props) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${w},${height}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className={className}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.4" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
