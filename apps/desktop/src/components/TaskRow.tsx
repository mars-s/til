import React, { useCallback, useRef, useState } from "react";
import { type Task, type Priority, type TaskStatus } from "../lib/invoke";

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Low: "#6b7280",
  Medium: "#3b82f6",
  High: "#f59e0b",
  Urgent: "#ef4444",
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  Todo: "○",
  InProgress: "◔",
  Done: "●",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  Todo: "var(--status-todo)",
  InProgress: "var(--status-inprogress)",
  Done: "var(--status-done)",
};

export default function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0–1
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
    [task.id, onToggle]
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
        // Short click — just toggle
        onToggle(task.id);
      }
    },
    [task.id, onToggle]
  );

  // Touch swipe-to-delete
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

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Delete reveal */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center px-4"
        style={{ background: "#ef4444", width: "80px" }}
      >
        <span className="text-white text-sm font-medium">Delete</span>
      </div>

      {/* Row content */}
      <div
        className="relative flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
        style={{
          background: "var(--surface)",
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? "transform 0.2s ease" : "none",
          borderBottom: "1px solid var(--border)",
        }}
        onClick={() => setExpanded((x) => !x)}
      >
        {/* Status circle / hold-to-toggle */}
        <button
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center relative mt-0.5"
          style={{
            border: `2px solid ${STATUS_COLORS[task.status]}`,
            background: "transparent",
            cursor: "pointer",
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
          {/* Hold progress ring */}
          {holdProgress > 0 && (
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 20 20"
            >
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke={STATUS_COLORS[task.status]}
                strokeWidth="2"
                strokeDasharray={`${holdProgress * 50.3} 50.3`}
                opacity="0.8"
              />
            </svg>
          )}
          <span
            className="text-xs leading-none"
            style={{ color: STATUS_COLORS[task.status], fontSize: "9px" }}
          >
            {STATUS_ICONS[task.status]}
          </span>
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm leading-5"
              style={{
                color: isDone ? "var(--text-secondary)" : "var(--text-primary)",
                textDecoration: isDone ? "line-through" : "none",
              }}
            >
              {task.title}
            </span>
            <PriorityBadge priority={task.priority} />
          </div>

          {task.scheduled_at && (
            <div className="mt-0.5 text-xs" style={{ color: "var(--span-time)" }}>
              {formatDate(task.scheduled_at)}
            </div>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-2 space-y-1">
              {task.deadline_at && (
                <div className="text-xs" style={{ color: "var(--span-date)" }}>
                  Due: {formatDate(task.deadline_at)}
                </div>
              )}
              {task.duration_minutes != null && (
                <div className="text-xs" style={{ color: "var(--span-duration)" }}>
                  Duration: {task.duration_minutes}m
                </div>
              )}
              {task.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        background: "var(--span-tag)22",
                        color: "var(--span-tag)",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                className="text-xs mt-2 px-2 py-1 rounded"
                style={{
                  background: "#ef444422",
                  color: "#ef4444",
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

        {/* Expand chevron */}
        <span
          className="flex-shrink-0 text-xs mt-1 transition-transform duration-150"
          style={{
            color: "var(--text-secondary)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "Medium") return null;
  const color = PRIORITY_COLORS[priority];
  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {priority}
    </span>
  );
}

function formatDate(iso: string): string {
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
