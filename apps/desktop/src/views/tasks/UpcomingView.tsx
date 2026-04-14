import { motion } from "framer-motion";
import { type Task } from "../../lib/invoke";
import TaskRow from "../../components/TaskRow";

interface UpcomingViewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDate: (id: string, date: string | null) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "var(--p-urgent)",
  High: "var(--p-high)",
  Medium: "var(--p-medium)",
  Low: "var(--p-low)",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDayString(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === tomorrow.getTime()) return "Tomorrow";
  
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

export default function UpcomingView({ tasks, onToggle, onDelete, onUpdateDate, onUpdateTask }: UpcomingViewProps) {
  // Filter only scheduled future tasks and sort by date safely
  const scheduled = tasks
    .filter((t) => t.status !== "Done" && t.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  // Group by local date string (YYYY-MM-DD)
  const grouped = scheduled.reduce((acc, task) => {
    const d = new Date(task.scheduled_at!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 160,
          gap: 10,
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.3 }}>🗓</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontStyle: "italic",
            color: "var(--text-3)",
          }}
        >
          No upcoming tasks scheduled
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", flexDirection: "column", gap: 32 }}
    >
      {entries.map(([dateKey, dayTasks]) => {
        const d = new Date(dateKey); // Using YYYY-MM-DD parses correctly in local generally
        const displayDayNum = String(d.getDate()).padStart(2, "0");
        const displayDayStr = getDayString(dateKey);

        return (
          <div key={dateKey} style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
            {/* Left Column: Date & Day */}
            <div style={{ width: 140, flexShrink: 0, display: "flex", alignItems: "baseline", gap: 8, paddingRight: 20 }}>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  lineHeight: 1,
                  letterSpacing: "-0.03em"
                }}
              >
                {displayDayNum}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-2)",
                  textTransform: "capitalize"
                }}
              >
                {displayDayStr}
              </span>
            </div>

            {/* Subdued horizon line underlying the row starts here just above the tasks */}
            <div style={{ position: "absolute", top: 26, left: 140, right: 0, height: 1, background: "var(--border)", opacity: 0.5, zIndex: 0 }} />

            {/* Right Column: Tasks mapped minimally */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, zIndex: 1, paddingTop: 40 }}>
              {dayTasks.map((task) => (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  onToggle={onToggle} 
                  onDelete={onDelete} 
                  onUpdateDate={onUpdateDate} 
                  onUpdateTask={onUpdateTask || (() => {})} 
                />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
