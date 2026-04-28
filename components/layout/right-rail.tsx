"use client";
import { Icons } from "@/components/icons";
import { mapActivityForRail, mapAgentRunsForRail, mapFeedbackForRail } from "@/lib/workspace/right-rail";
import type { ActivityEventSummary, AgentRunSummary, FeedbackEventSummary } from "@/types/projects";

const FB_OPTIONS = ["Make it more premium", "Less generic", "More playful", "More urgent", "Tighter copy"];

interface RightRailProps {
  feedback: string[];
  setFeedback: (f: string[]) => void;
  onSendFeedback: () => void;
  agentRuns: AgentRunSummary[];
  activityEvents: ActivityEventSummary[];
  feedbackEvents: FeedbackEventSummary[];
}

export function RightRail({ feedback, setFeedback, onSendFeedback, agentRuns, activityEvents, feedbackEvents }: RightRailProps) {
  const toggle = (chip: string) =>
    setFeedback(feedback.includes(chip) ? feedback.filter((x) => x !== chip) : [...feedback, chip]);
  const agents = mapAgentRunsForRail(agentRuns);
  const activities = mapActivityForRail(activityEvents);
  const feedbackHistory = mapFeedbackForRail(feedbackEvents);

  return (
    <aside className="rail">
      <div className="rail-eyebrow">Project Agents</div>

      <div className="rail-section">
        <div className="rail-head">
          <div className="rail-title">Tasks &amp; Agents</div>
          <span className="rail-link">{agents.length} recent</span>
        </div>
        <div>
          {agents.length === 0 ? (
            <div className="rail-empty">No agent runs yet. Run a stage action to populate this queue.</div>
          ) : agents.map((a) => (
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
                {a.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section feedback-card">
        <div className="rail-head">
          <div className="rail-title">Feedback Loop</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-2)", letterSpacing: "0.06em" }}>PLANNING LENS</span>
        </div>
        <div style={{ position: "relative", paddingBottom: 30 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)" }}>Direction feedback lens</div>
          <div className="fb-input">Pick lenses to guide Direction. Persisted revisions happen in Production feedback actions.</div>
          <div className="fb-chips">
            {FB_OPTIONS.map((c) => (
              <button key={c} className="fb-chip" data-active={feedback.includes(c) ? "true" : "false"} onClick={() => toggle(c)}>
                {c}
              </button>
            ))}
          </div>
          <button className="fb-send" title="Use Production feedback actions" onClick={onSendFeedback}>
            <Icons.arrowR width={14} height={14} />
          </button>
        </div>
        <div className="feedback-history">
          {feedbackHistory.length === 0 ? (
            <div className="rail-empty">No persisted feedback yet.</div>
          ) : feedbackHistory.map((item) => (
            <div className="feedback-event" key={item.id}>
              <span>{item.label}</span>
              <small>{item.time}</small>
              {item.instruction && <p>{item.instruction}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-head">
          <div className="rail-title">Activity Feed</div>
          <span className="rail-link">{activities.length} events</span>
        </div>
        {activities.length > 0 && <div className="act-day">Recent</div>}
        {activities.length === 0 ? (
          <div className="rail-empty">No activity has been logged for this project yet.</div>
        ) : activities.map((a) => (
          <div className="act-row" key={a.id}>
            <div className="act-av" data-agent={a.agent ? "true" : "false"}>{a.initials}</div>
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
