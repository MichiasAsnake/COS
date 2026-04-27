"use client";
import { useMemo } from "react";

export function StripePlaceholder({ label, hue = 280, seed = 1 }: { label?: string; hue?: number; seed?: number }) {
  const angle = useMemo(() => 30 + (seed * 17) % 90, [seed]);
  const lift = (seed * 7) % 6;
  const id = `p-${seed}-${hue}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform={`rotate(${angle})`}>
          <rect width="8" height="8" fill={`oklch(${0.22 + lift * 0.01} 0.02 ${hue})`} />
          <line x1="0" y1="0" x2="0" y2="8" stroke={`oklch(${0.30 + lift * 0.01} 0.03 ${hue})`} strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {label ? (
        <text x="50" y="54" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="6" fill={`oklch(0.85 0.02 ${hue} / 0.7)`} letterSpacing="0.4">
          {label}
        </text>
      ) : null}
    </svg>
  );
}

export function PlatformGlyphs({ which = ["A", "B", "C"] }: { which?: string[] }) {
  return (
    <span className="platforms">
      <span className="label">Channels</span>
      {which.map((k) => (
        <svg key={k} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {k === "A" && <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 16V8l6 4-6 4z" /></>}
          {k === "B" && <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17" cy="7" r="0.7" fill="currentColor" /></>}
          {k === "C" && <><circle cx="12" cy="12" r="8" /><path d="M9 9l6 6M15 9l-6 6" /></>}
          {k === "D" && <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9 12h6" /></>}
        </svg>
      ))}
    </span>
  );
}

export function Spark() {
  const pts = [4, 8, 6, 12, 9, 15, 11, 18, 14, 17, 20, 16, 22, 19, 25, 21, 28, 24, 26, 22, 28];
  const path = pts.map((y, i) => `${i === 0 ? "M" : "L"}${(i * 100) / (pts.length - 1)},${30 - y}`).join(" ");
  return (
    <svg className="sys-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.18 295)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.68 0.18 295)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100,30 L0,30 Z`} fill="url(#sg)" />
      <path d={path} fill="none" stroke="oklch(0.78 0.16 295)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
