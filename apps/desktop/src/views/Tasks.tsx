import React, { useCallback, useEffect, useRef, useState } from "react";
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
  focusInputSignal: number; // increment to trigger focus
}

// Map the cycled-to next status for the toggle action
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

export default function Tasks({ focusInputSignal }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tasks from Supabase on mount
  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((err) => console.error("Failed to load tasks:", err))
      .finally(() => setLoading(false));
  }, []);

  // Focus input when signal fires
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
    // Map string status back to typed status
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

  const pending = tasks.filter((t) => t.status !== "Done");
  const done = tasks.filter((t) => t.status === "Done");

  return (
    <div className="flex flex-col h-full">
      {/* Input area */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <TaskInput onSubmit={handleSubmit} inputRef={inputRef} />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div
            className="flex items-center justify-center h-32"
            style={{ color: "var(--text-secondary)" }}
          >
            Loading…
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <div className="text-2xl">○</div>
            <div style={{ color: "var(--text-secondary)" }}>
              No tasks yet — add one above
            </div>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section>
                {pending.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            )}

            {done.length > 0 && (
              <section>
                <div
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: "var(--text-secondary)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Completed ({done.length})
                </div>
                {done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
