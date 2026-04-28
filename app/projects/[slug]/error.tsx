"use client";

export default function ProjectError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-0)", color: "var(--fg-1)", padding: 24 }}>
      <div style={{ maxWidth: 520, border: "1px solid var(--line-soft)", borderRadius: "var(--r-lg)", padding: 24, background: "var(--bg-1)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Project failed to load</div>
        <h1 style={{ margin: "8px 0 10px" }}>Could not open this workspace</h1>
        <p style={{ color: "var(--fg-2)", lineHeight: 1.5 }}>{error.message}</p>
        <button className="btn primary" onClick={reset} type="button">Try again</button>
      </div>
    </div>
  );
}
