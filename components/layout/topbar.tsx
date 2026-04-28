"use client";
import { Icons } from "@/components/icons";

interface TopbarProps {
  projectName: string;
  onShare: () => void;
  onRename: () => void;
}

export function Topbar({ projectName, onShare, onRename }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="crumb">
        <span>Projects</span>
        <span className="sep">/</span>
        <span className="here">{projectName}</span>
      </div>
      <div className="top-actions">
        <button className="btn" onClick={onRename} type="button">
          <Icons.edit width={14} height={14} /> Rename
        </button>
        <button className="btn primary" onClick={onShare} type="button">
          <Icons.share width={14} height={14} /> Share
        </button>
        <button className="btn-icon" title="More project actions are not enabled yet" type="button" disabled><Icons.more width={16} height={16} /></button>
      </div>
    </div>
  );
}
