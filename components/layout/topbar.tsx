"use client";
import { Icons } from "@/components/icons";

interface TopbarProps {
  projectName: string;
  onShare: () => void;
}

export function Topbar({ projectName, onShare }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="crumb">
        <span>Projects</span>
        <span className="sep">/</span>
        <span className="here">{projectName}</span>
      </div>
      <div className="top-actions">
        <button className="btn primary" onClick={onShare} type="button">
          <Icons.share width={14} height={14} /> Share
        </button>
        <button className="btn-icon" title="Favorite project" type="button"><Icons.star width={15} height={15} /></button>
        <button className="btn-icon" title="More project actions" type="button"><Icons.more width={16} height={16} /></button>
      </div>
    </div>
  );
}
