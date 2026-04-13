import { useCallback, useEffect, useRef, useState } from "react";
import TaskInput from "../components/TaskInput";
import TaskRow from "../components/TaskRow";
import { type Task, type ParsedTask } from "../lib/invoke";
import {
  fetchTasks,
  insertTask,
  updateTaskStatus,
  removeTask,
} from "../lib/db";

interface TasksProps {
  focusInputSignal: number;
}

function nextStatus(current: Task["status"]): "todo" | "in_progress" | "done" {
  switch (current) {
    case "Todo":
      return "in_progress";
    case "InProgress":
      return "done";
    case "Done":
      return "todo";
  }
}

function formatSectionDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function isToday(isoStr: string | null): boolean {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isFuture(isoStr: string | null): boolean {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return d > todayEnd;
}

interface SectionProps {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  italic?: boolean;
  showDate?: boolean;
}

function Section({ title, tasks, onToggle, onDelete, italic, showDate }: SectionProps) {
  if (tasks.length === 0) return null;
  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: "var(--text-1)",
            fontStyle: italic ? "italic" : "normal",
            lineHeight: 1.2,
          }}
        >
          {title}
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "var(--border)",
            alignSelf: "center",
            marginBottom: 2,
          }}
        />
        {showDate && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-3)",
            }}
          >
            {formatSectionDate(new Date())}
          </span>
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          {tasks.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

export default function Tasks({ focusInputSignal }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((err) => console.error("Failed to load tasks:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (focusInputSignal > 0) {
      inputRef.current?.focus();
    }
  }, [focusInputSignal]);

  const handleSubmit = useCallback(async (parsed: ParsedTask) => {
    const taskData: Omit<Task, "id"> = {
      title: parsed.title,
      status: "Todo",
      priority: parsed.priority,
      scheduled_at: parsed.scheduled_at,
      deadline_at: parsed.deadline_at,
      duration_minutes: parsed.duration_minutes,
      tags: parsed.tags,
    };
    const task = await insertTask(taskData);
    setTasks((prev) => [task, ...prev]);
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = nextStatus(task.status);
    await updateTaskStatus(id, next);
    const statusMap: Record<string, Task["status"]> = {
      todo: "Todo",
      in_progress: "InProgress",
      done: "Done",
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: statusMap[next] } : t)),
    );
  }, [tasks]);

  const handleDelete = useCallback(async (id: string) => {
    await removeTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Section buckets
  const todayTasks = tasks.filter(
    (t) => t.status !== "Done" && (isToday(t.scheduled_at) || t.status === "InProgress"),
  );
  const scheduledTasks = tasks.filter(
    (t) => t.status !== "Done" && !isToday(t.scheduled_at) && isFuture(t.scheduled_at),
  );
  const somedayTasks = tasks.filter(
    (t) => t.status !== "Done" && !t.scheduled_at && t.status === "Todo"
      && !todayTasks.includes(t),
  );
  const doneTasks = tasks.filter((t) => t.status === "Done");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
        }}
        className="animate-fadeUp"
      >
        {/* NLP Input */}
        <div
          style={{
            marginBottom: 32,
            background: "var(--ink-3)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r-lg)",
            padding: "2px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <TaskInput onSubmit={handleSubmit} inputRef={inputRef} />
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 120,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            loading…
          </div>
        ) : tasks.length === 0 ? (
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
            <div style={{ fontSize: 28, opacity: 0.3 }}>◇</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontStyle: "italic",
                color: "var(--text-3)",
              }}
            >
              Nothing yet — add your first task above
            </div>
          </div>
        ) : (
          <>
            <Section
              title="Today"
              tasks={todayTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              italic
              showDate
            />
            <Section
              title="Scheduled"
              tasks={scheduledTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
            <Section
              title="Someday"
              tasks={somedayTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
            <Section
              title="Completed"
              tasks={doneTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
