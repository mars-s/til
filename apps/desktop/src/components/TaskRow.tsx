import React, { useCallback, useRef, useState } from "react";
import { type Task, type Priority } from "../lib/invoke";

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Urgent: "var(--p-urgent)",
  High:   "var(--p-high)",
  Medium: "var(--p-medium)",
  Low:    "var(--p-low)",
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const HOLD_MS = 500;

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);

  const startHold = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      holdStartRef.current = Date.now();
      holdTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - holdStartRef.current;
        const progress = Math.min(elapsed / HOLD_MS, 1);
        setHoldProgress(progress);
        if (elapsed >= HOLD_MS) {
          clearInterval(holdTimerRef.current!);
          setHoldProgress(0);
          onToggle(task.id);
        }
      }, 16);
    },
    [task.id, onToggle],
  );

  const endHold = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(0);
      if (elapsed < 200) {
        onToggle(task.id);
      }
    },
    [task.id, onToggle],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -120));
  };
  const onTouchEnd = () => {
    if (swipeX < -80) {
      onDelete(task.id);
    } else {
      setSwipeX(0);
    }
  };

  const isDone = task.status === "Done";
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Delete reveal (swipe) */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center px-4"
        style={{ background: "var(--rose)", width: 80 }}
      >
        <span
          style={{
            color: "var(--ink)",
            fontSize: 12,
            fontFamily: "var(--font-ui)",
            fontWeight: 500,
          }}
        >
          Delete
        </span>
      </div>

      {/* Card */}
      <div
        className="task-card"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0,
          borderRadius: "var(--r-md)",
          background: "var(--ink-3)",
          overflow: "hidden",
          cursor: "default",
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? "transform 0.2s ease" : "none",
        }}
        onClick={() => setExpanded((x) => !x)}
      >
        {/* Priority strip */}
        <div
          style={{
            width: 3,
            alignSelf: "stretch",
            background: priorityColor,
            flexShrink: 0,
            opacity: isDone ? 0.3 : 1,
          }}
        />

        {/* Checkbox */}
        <button
          style={{
            padding: "11px 10px",
            flexShrink: 0,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={() => {
            if (holdTimerRef.current) {
              clearInterval(holdTimerRef.current);
              holdTimerRef.current = null;
              setHoldProgress(0);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {isDone ? (
              <>
                <circle cx="8" cy="8" r="7" fill="var(--jade)" stroke="var(--jade)" strokeWidth="1" />
                <path
                  d="M5 8 L7 10 L11 6"
                  stroke="var(--ink)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 20,
                    strokeDashoffset: 0,
                    animation: "checkFill 0.2s ease both",
                  }}
                />
              </>
            ) : (
              <circle cx="8" cy="8" r="7" fill="none" stroke="var(--ash)" strokeWidth="1.5" />
            )}
          </svg>
          {/* Hold progress ring */}
          {holdProgress > 0 && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                transform: "rotate(-90deg)",
                pointerEvents: "none",
              }}
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="12"
                fill="none"
                stroke={priorityColor}
                strokeWidth="2"
                strokeDasharray={`${holdProgress * 75.4} 75.4`}
                opacity="0.8"
              />
            </svg>
          )}
        </button>

        {/* Content */}
        <div style={{ flex: 1, padding: "10px 12px 10px 4px", minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 450,
              color: isDone ? "var(--text-3)" : "var(--text-1)",
              textDecoration: isDone ? "line-through" : "none",
              textDecorationColor: "var(--text-4)",
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
            }}
          >
            {task.title}
          </div>

          {/* Metadata chips */}
          {(task.scheduled_at || task.duration_minutes != null || task.tags.length > 0) && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 5,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {task.scheduled_at && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--sky)",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  ◷ {formatTime(task.scheduled_at)}
                </span>
              )}
              {task.duration_minutes != null && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-3)",
                  }}
                >
                  {task.duration_minutes}m
                </span>
              )}
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--violet)",
                    padding: "0 5px",
                    background: "rgba(155,116,212,0.1)",
                    borderRadius: 3,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Expanded details */}
          {expanded && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {task.deadline_at && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--rose)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  ⚑ due {formatTime(task.deadline_at)}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-4)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {task.priority}
                </span>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: priorityColor,
                    opacity: 0.7,
                  }}
                />
              </div>
              <button
                style={{
                  marginTop: 4,
                  padding: "4px 10px",
                  background: "rgba(224,85,85,0.1)",
                  border: "1px solid rgba(224,85,85,0.2)",
                  borderRadius: "var(--r-sm)",
                  color: "var(--rose)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
              >
                Delete task
              </button>
            </div>
          )}
        </div>

        {/* Right actions — hover-revealed */}
        <div
          className="task-actions"
          style={{ padding: "8px 10px", display: "flex", alignItems: "center" }}
        >
          <button
            style={{
              color: "var(--text-3)",
              fontSize: 18,
              lineHeight: 1,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "var(--r-sm)",
            }}
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
