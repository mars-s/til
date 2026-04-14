import { useState } from "react";
import { type Task, type Priority } from "../lib/invoke";

const PRIORITY_COLORS: Record<Priority, string> = {
  Urgent: "var(--rose)",
  High:   "var(--p-high)",
  Medium: "var(--amber)",
  Low:    "var(--p-low)",
};

interface TaskBlockProps {
  task: Task;
  height: number;
  top: number;
  onToggle?: (id: string) => void;
}

export default function TaskBlock({ task, height, top, onToggle }: TaskBlockProps) {
  const color = PRIORITY_COLORS[task.priority];
  const h = Math.max(height, 24);
  const isComplete = task.status === "Done";

  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        left: 2,
        right: 3,
        top,
        height: h,
        borderRadius: 6,
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
        background: isComplete ? "transparent" : `${color}18`,
        border: `1px solid ${color}${hovered ? "80" : "45"}`,
        opacity: isComplete ? 0.45 : 1,
        padding: "3px 6px",
        transition: "all 0.15s ease",
        boxShadow: hovered && !isComplete ? "var(--shadow-sm)" : "none",
        transform: hovered && !isComplete ? "translateY(-1px)" : "none",
      }}
      onClick={() => onToggle?.(task.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={task.title}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Checkbox */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: `1.5px solid ${color}`,
            background: isComplete ? color : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isComplete && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2 2 4-4" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 500,
            color: isComplete ? "var(--text-3)" : "var(--text-1)",
            textDecoration: isComplete ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: "14px",
            flex: 1,
          }}
        >
          {task.title}
        </div>
      </div>
    </div>
  );
}
