import { useEffect, useState } from "react";
import WeekView from "./calendar/Week";
import MonthView from "./calendar/Month";
import CalendarSidebar from "../components/CalendarSidebar";
import { type CalendarEvent, type Task } from "../lib/invoke";
import { fetchTasks, fetchEvents } from "../lib/db";

type CalView = "week" | "month";

interface CalendarProps {
  calView: CalView;
  onCalViewChange: (v: CalView) => void;
}

export default function Calendar({ calView, onCalViewChange }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      fetchTasks(),
    ])
      .then(([evs, tsks]) => {
        setEvents(evs);
        setTasks(tsks);
      })
      .finally(() => setLoading(false));
  }, []);

  // Keyboard shortcuts for calendar-internal views
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "w") onCalViewChange("week");
      if (e.key === "m") onCalViewChange("month");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCalViewChange]);

  const handleDayClick = (date: Date) => {
    onCalViewChange("week");
    void date;
  };

  const unscheduledTasks = tasks.filter(
    (t) => t.scheduled_at === null && t.status !== "Done",
  );

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Sidebar */}
      <CalendarSidebar
        unscheduledTasks={unscheduledTasks}
        onTaskClick={() => {}}
      />

      {/* Main calendar area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* View switcher sub-nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "8px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            background: "var(--ink-2)",
          }}
        >
          {(["week", "month"] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => onCalViewChange(v)}
              style={{
                padding: "4px 12px",
                borderRadius: "var(--r-sm)",
                background: calView === v ? "var(--smoke)" : "transparent",
                color: calView === v ? "var(--text-1)" : "var(--text-3)",
                border: calView === v ? "1px solid var(--border-2)" : "1px solid transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: calView === v ? 500 : 400,
                cursor: "pointer",
                letterSpacing: "0.01em",
                textTransform: "capitalize",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            loading…
          </div>
        ) : calView === "week" ? (
          <WeekView events={events} onDayClick={handleDayClick} />
        ) : (
          <MonthView events={events} onDayClick={handleDayClick} />
        )}
      </div>
    </div>
  );
}
