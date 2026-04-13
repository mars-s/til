import React, { useEffect, useState } from "react";
import WeekView from "./calendar/Week";
import MonthView from "./calendar/Month";
import { getEvents, type CalendarEvent } from "../lib/invoke";

type CalView = "week" | "month";

interface CalendarProps {
  calView: CalView;
  onCalViewChange: (v: CalView) => void;
}

export default function Calendar({ calView, onCalViewChange }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then(setEvents)
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
    // Clicking a day in month view switches to week view
    onCalViewChange("week");
    // WeekView manages its own weekStart state; scroll to clicked date
    // via a signal would need lifting — for now just switch views
    void date;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav */}
      <div
        className="flex items-center gap-1 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {(["week", "month"] as CalView[]).map((v) => (
          <button
            key={v}
            className="px-3 py-1 rounded text-xs font-medium capitalize"
            style={{
              background: calView === v ? "var(--accent)" : "var(--surface-hover)",
              color: calView === v ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => onCalViewChange(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center flex-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Loading…
        </div>
      ) : calView === "week" ? (
        <WeekView events={events} onDayClick={handleDayClick} />
      ) : (
        <MonthView events={events} onDayClick={handleDayClick} />
      )}
    </div>
  );
}
