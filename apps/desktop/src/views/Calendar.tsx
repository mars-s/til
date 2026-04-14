import { useEffect, useState } from "react";
import WeekView from "./calendar/Week";
import MonthView from "./calendar/Month";
import CalendarSidebar from "../components/CalendarSidebar";
import { type CalendarEvent, type Task } from "../lib/invoke";
import { getSupabase } from "../lib/supabase";
import { fetchTasks, fetchEvents, fetchCalendars, updateTaskDate } from "../lib/db";

type CalView = "week" | "month";

interface CalendarProps {
  calView: CalView;
  onCalViewChange: (v: CalView) => void;
}

export default function Calendar({ calView, onCalViewChange }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendars, setCalendars] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      fetchTasks(),
      fetchCalendars(),
    ])
      .then(([evs, tsks, cals]) => {
        setEvents(evs);
        setTasks(tsks);
        setCalendars(cals);
      })
      .finally(() => setLoading(false));
  }, []);

  // Keyboard shortcuts for calendar-internal views
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "w") {
        e.preventDefault();
        onCalViewChange("week");
      }
      if (e.key === "m") {
        e.preventDefault();
        onCalViewChange("month");
      }
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

  // Scheduled tasks (with time) to show on calendar
  const scheduledTasks = tasks.filter(
    (t) => t.scheduled_at !== null && t.status !== "Done",
  );

  const handleEventCreate = async (title: string, startAt: string, endAt: string) => {
    try {
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call edge function to create in Google Calendar
      const { data: _createData, error } = await supabase.functions.invoke('create-calendar-event', {
        body: {
          title,
          start_at: startAt,
          end_at: endAt,
        }
      });

      if (error) throw error;

      // Refresh events from DB
      const freshEvents = await fetchEvents();
      setEvents(freshEvents);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Sidebar */}
      <CalendarSidebar
        unscheduledTasks={unscheduledTasks}
        onTaskClick={() => {}}
        onTaskDragStart={() => {}}
        calendars={calendars}
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
          <WeekView
            events={events}
            tasks={scheduledTasks}
            onDayClick={handleDayClick}
            onTaskSchedule={async (taskId, scheduledAt) => {
              await updateTaskDate(taskId, scheduledAt);
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === taskId ? { ...t, scheduled_at: scheduledAt } : t,
                ),
              );
            }}
            onEventCreate={handleEventCreate}
          />
        ) : (
          <MonthView events={events} tasks={scheduledTasks} onDayClick={handleDayClick} />
        )}
      </div>
    </div>
  );
}
