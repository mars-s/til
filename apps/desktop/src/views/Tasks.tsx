import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskInput from "../components/TaskInput";
import TaskRow from "../components/TaskRow";
import UpcomingView from "./tasks/UpcomingView";
import { type Task, type ParsedTask } from "../lib/invoke";
import {
  fetchTasks,
  insertTask,
  updateTaskStatus,
  updateTaskDate,
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
  onUpdateDate: (id: string, date: string | null) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  italic?: boolean;
  showDate?: boolean;
}

function Section({ title, tasks, onToggle, onDelete, onUpdateDate, onUpdateTask, italic, showDate }: SectionProps) {
  if (tasks.length === 0) return null;
  return (
    <motion.section layout style={{ marginBottom: 40 }}>
      {/* Section Header */}
      <motion.div
        layout="position"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            color: italic ? "var(--text-1)" : "var(--text-2)",
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
            opacity: 0.5,
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
            color: "var(--text-4)",
          }}
        >
          {tasks.length}
        </span>
      </motion.div>

      {/* Task List */}
      <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdateDate={onUpdateDate}
              onUpdateTask={onUpdateTask}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}

export default function Tasks({ focusInputSignal }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New States for hiding input and toggling view
  const [showInput, setShowInput] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "upcoming">("list");
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((err) => console.error("Failed to load tasks:", err))
      .finally(() => setLoading(false));
  }, []);

  // Global toggle handler (cmd+n or Space)
  useEffect(() => {
    if (focusInputSignal > 0) {
      setShowInput(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [focusInputSignal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
      
      if (e.key === " " && !showInput) {
        e.preventDefault();
        setShowInput(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && showInput) {
        setShowInput(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showInput]);

  const handleSubmit = useCallback(async (parsed: ParsedTask) => {
    const taskData: Omit<Task, "id"> = {
      title: parsed.title,
      status: "Todo",
      priority: parsed.priority,
      scheduled_at: parsed.scheduled_at,
      deadline_at: parsed.deadline_at,
      duration_minutes: parsed.duration_minutes,
      created_at: new Date().toISOString(),
      tags: parsed.tags,
      description: null,
      subtasks: [],
    };
    const task = await insertTask(taskData);
    setTasks((prev) => [task, ...prev]);
    // Close input immediately after entry (mimic minimalist UI)
    setShowInput(false);
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

  const handleUpdateDate = useCallback(async (id: string, scheduled_at: string | null) => {
    await updateTaskDate(id, scheduled_at);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, scheduled_at } : t)),
    );
  }, []);

  const handleUpdateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
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
    <div 
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
      onDoubleClick={() => {
        if (!showInput) {
          setShowInput(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
        }}
        className="animate-fadeUp"
      >
        {/* Toggle Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 4, background: "var(--ink-4)", padding: "2px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: viewMode === "list" ? 500 : 400,
                color: viewMode === "list" ? "var(--text-1)" : "var(--text-3)",
                background: viewMode === "list" ? "var(--ink-2)" : "transparent",
                border: "none",
                borderRadius: "8px",
                padding: "4px 12px",
                cursor: "pointer",
                boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.5)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Anytime
            </button>
            <button
              onClick={() => setViewMode("upcoming")}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: viewMode === "upcoming" ? 500 : 400,
                color: viewMode === "upcoming" ? "var(--text-1)" : "var(--text-3)",
                background: viewMode === "upcoming" ? "var(--ink-2)" : "transparent",
                border: "none",
                borderRadius: "8px",
                padding: "4px 12px",
                cursor: "pointer",
                boxShadow: viewMode === "upcoming" ? "0 1px 3px rgba(0,0,0,0.5)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Upcoming
            </button>
          </div>
          
          <div style={{ flex: 1 }} />
          
          {/* Subtle hint for adding task */}
          {!showInput && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-4)", userSelect: "none" }}
            >
              Press Space to add task
            </motion.span>
          )}
        </div>

        {/* NLP Input — Hidden by default */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", scale: 1, marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, scale: 0.98, marginBottom: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  background: "var(--ink-3)",
                  border: "1px solid var(--border-2)",
                  borderRadius: "var(--r-lg)",
                  padding: "4px",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <TaskInput onSubmit={handleSubmit} inputRef={inputRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              Nothing yet — add your first task
            </div>
          </div>
        ) : viewMode === "list" ? (
          <motion.div layout>
            <Section
              title="Today"
              tasks={todayTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdateDate={handleUpdateDate}
              onUpdateTask={handleUpdateTask}
              italic
              showDate
            />
            <Section
              title="Scheduled"
              tasks={scheduledTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdateDate={handleUpdateDate}
              onUpdateTask={handleUpdateTask}
            />
            <Section
              title="Someday"
              tasks={somedayTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdateDate={handleUpdateDate}
              onUpdateTask={handleUpdateTask}
            />
            <Section
              title="Completed"
              tasks={doneTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdateDate={handleUpdateDate}
              onUpdateTask={handleUpdateTask}
            />
          </motion.div>
        ) : (
          <UpcomingView tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} onUpdateDate={handleUpdateDate} onUpdateTask={handleUpdateTask} />
        )}
      </div>
    </div>
  );
}
