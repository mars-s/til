import { type Task, type Priority } from "../lib/invoke";

const PRIORITY_COLORS: Record<Priority, string> = {
  Urgent: "var(--p-urgent)",
  High:   "var(--p-high)",
  Medium: "var(--p-medium)",
  Low:    "var(--p-low)",
};

interface CalendarSidebarProps {
  unscheduledTasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskDragStart?: (taskId: string) => void;
  calendars: { id: string; name: string; color: string }[];
}

const CALENDARS = [
  { id: "default-til", name: "Til", color: "var(--amber)" },
  { id: "default-personal", name: "Personal", color: "var(--jade)" },
  { id: "default-work", name: "Work", color: "var(--sky)" },
];

export default function CalendarSidebar({ unscheduledTasks, onTaskClick, onTaskDragStart, calendars = CALENDARS }: CalendarSidebarProps) {
  return (
    <div
      style={{
        width: 264,
        minWidth: 264,
        maxWidth: 264,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--ink-2)",
        borderRight: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* INBOX section — top 62% */}
      <div
        style={{
          flex: "0 0 62%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: "16px 0 0",
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            padding: "0 16px",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontStyle: "italic",
              color: "var(--text-1)",
              lineHeight: 1.2,
            }}
          >
            Inbox
          </span>
          {unscheduledTasks.length > 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-2)",
                background: "var(--amber)",
                padding: "1px 5px",
                borderRadius: 3,
                lineHeight: 1.6,
              }}
            >
              {unscheduledTasks.length}
            </span>
          )}
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {unscheduledTasks.length === 0 ? (
            <div
              style={{
                padding: "20px 8px",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-4)",
              }}
            >
              no unscheduled tasks
            </div>
          ) : (
            unscheduledTasks.map((task) => (
              <button
                key={task.id}
                draggable
                onClick={() => onTaskClick(task)}
                onDragStart={(e) => {
                  e.dataTransfer.setData("taskId", task.id);
                  e.dataTransfer.effectAllowed = "move";
                  onTaskDragStart?.(task.id);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: "var(--r-sm)",
                  background: "transparent",
                  border: "none",
                  cursor: "grab",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--ink-4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {/* Priority dot */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: PRIORITY_COLORS[task.priority],
                    flexShrink: 0,
                    opacity: 0.8,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--text-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {task.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />

      {/* CALENDARS section — bottom 38% */}
      <div
        style={{
          flex: "0 0 38%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: "14px 0 0",
        }}
      >
        {/* Section header */}
        <div
          style={{
            padding: "0 16px",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Calendars
          </span>
        </div>

        {/* Calendar list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {calendars.map((cal) => (
            <div
              key={cal.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 8px",
                borderRadius: "var(--r-sm)",
              }}
            >
              {/* Color dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: cal.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--text-2)",
                  flex: 1,
                }}
              >
                {cal.name}
              </span>
              {/* Toggle indicator */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: cal.color,
                  opacity: 0.7,
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
