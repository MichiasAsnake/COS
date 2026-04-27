"use client";
import { Icons } from "@/components/icons";

const AGENTS = [
  { id: "cd", name: "Creative Director",  task: "Generate territories",         status: "done" },
  { id: "cw", name: "Copywriter",         task: "Generate hooks + scripts",     status: "done" },
  { id: "ad", name: "Art Director",       task: "Visual direction + prompts",   status: "progress" },
  { id: "pp", name: "Production Planner", task: "Shot list + deliverables",     status: "pending" },
  { id: "qa", name: "QA Critic",          task: "Review outputs",               status: "pending" },
];

const ACTIVITY = [
  { who: "CX", agent: true,  text: <><b>Codex</b> (QA Agent) reviewed 2 assets</>,               time: "8m ago" },
  { who: "JA", agent: false, text: <><b>Jori</b> generated 4 new outputs</>,                      time: "10m ago" },
  { who: "KW", agent: false, text: <><b>Karri</b> left feedback on 3 assets</>,                   time: "16m ago" },
  { who: "CD", agent: true,  text: <><b>Creative Director</b> completed territory generation</>,   time: "20m ago" },
];

const FB_OPTIONS = ["Make it more premium", "Less generic", "More playful", "More urgent", "Tighter copy"];

interface RightRailProps {
  feedback: string[];
  setFeedback: (f: string[]) => void;
  onSendFeedback: () => void;
}

export function RightRail({ feedback, setFeedback, onSendFeedback }: RightRailProps) {
  const toggle = (chip: string) =>
    setFeedback(feedback.includes(chip) ? feedback.filter((x) => x !== chip) : [...feedback, chip]);

  return (
    <aside className="rail">
      <div className="rail-eyebrow">Project Agents</div>

      <div className="rail-section">
        <div className="rail-head">
          <div className="rail-title">Tasks &amp; Agents</div>
          <button className="rail-link">View all</button>
        </div>
        <div>
          {AGENTS.map((a) => (
            <div className="agent-row" key={a.id}>
              <div className="agent-icon" aria-hidden="true">
                <Icons.person width={16} height={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="agent-name">
                  {a.name} <span style={{ color: "var(--fg-2)", fontWeight: 400, fontSize: 11 }}>Agent</span>
                </div>
                <div className="agent-task">{a.task}</div>
              </div>
              <div className="agent-status" data-s={a.status}>
                {a.status === "done" ? "Done" : a.status === "progress" ? "In Progress" : "Pending"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section feedback-card">
        <div className="rail-head">
          <div className="rail-title">Feedback Loop</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-2)", letterSpacing: "0.06em" }}>LOCALIZED</span>
        </div>
        <div style={{ position: "relative", paddingBottom: 30 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)" }}>Refine territory outputs</div>
          <div className="fb-input">Tell the AI what to change or improve.</div>
          <div className="fb-chips">
            {FB_OPTIONS.map((c) => (
              <button key={c} className="fb-chip" data-active={feedback.includes(c) ? "true" : "false"} onClick={() => toggle(c)}>
                {c}
              </button>
            ))}
          </div>
          <button className="fb-send" title="Apply feedback" onClick={onSendFeedback}>
            <Icons.arrowR width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-head">
          <div className="rail-title">Activity Feed</div>
          <button className="rail-link">View all</button>
        </div>
        <div className="act-day">Today</div>
        {ACTIVITY.map((a, i) => (
          <div className="act-row" key={i}>
            <div className="act-av" data-agent={a.agent ? "true" : "false"}>{a.who}</div>
            <div style={{ flex: 1 }}>
              <div className="act-text">{a.text}</div>
              <div className="act-time">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
