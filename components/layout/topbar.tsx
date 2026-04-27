"use client";
import { Icons } from "@/components/icons";

interface TopbarProps {
  onShare: () => void;
}

export function Topbar({ onShare }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="crumb">
        <span>Projects</span>
        <span className="sep">/</span>
        <span className="here">Project Atlas</span>
      </div>
      <div className="top-actions">
        <button className="btn primary" onClick={onShare}>
          <Icons.share width={14} height={14} /> Share
        </button>
        <button className="btn-icon" title="Favorite"><Icons.star width={15} height={15} /></button>
        <button className="btn-icon" title="More"><Icons.more width={16} height={16} /></button>
      </div>
    </div>
  );
}
