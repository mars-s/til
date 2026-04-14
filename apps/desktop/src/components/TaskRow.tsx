import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarIcon, Tag, ListTodo, Flag, Trash2, Circle, FileText, CheckCircle2 } from "lucide-react";
import { type Task, type Priority } from "../lib/invoke";
import { updateTaskTitle, updateTaskDescription, updateTaskSubtasks, updateTaskTags, ensureTag } from "../lib/db";
import DatePickerPopover from "./DatePickerPopover";
import DeadlinePopover from "./DeadlinePopover";
import TagPopover from "./TagPopover";

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDate: (id: string, date: string | null) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Urgent: "var(--p-urgent)",
  High: "var(--p-high)",
  Medium: "var(--p-medium)",
  Low: "var(--p-low)",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch { return iso; }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return iso; }
}

export default function TaskRow({ task, onToggle, onDelete, onUpdateDate, onUpdateTask }: TaskRowProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(task.title);
  const [descInput, setDescInput] = useState(task.description || "");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState("");

  // Popover states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const HOLD_MS = 400;

  // Keep local inputs in sync when task prop changes externally
  useEffect(() => { setTitleInput(task.title); }, [task.title]);
  useEffect(() => { setDescInput(task.description || ""); }, [task.description]);

  useEffect(() => {
    if (isEditingTitle) setTimeout(() => titleInputRef.current?.focus(), 30);
  }, [isEditingTitle]);

  // Collapse on outside click
  useEffect(() => {
    if (!isExpanded) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowDatePicker(false);
        setShowTagPicker(false);
        setShowDeadlinePicker(false);
        setShowSubtaskInput(false);
        setIsEditingTitle(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [isExpanded]);

  // ── Title ──────────────────────────────────────────────────────────────────

  const saveTitle = async () => {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTask(task.id, { title: trimmed });
      await updateTaskTitle(task.id, trimmed);
    } else {
      setTitleInput(task.title);
    }
  };

  // ── Description ────────────────────────────────────────────────────────────

  const saveDescription = async () => {
    const newDesc = descInput.trim() === "" ? null : descInput;
    if (newDesc !== (task.description ?? null)) {
      onUpdateTask(task.id, { description: newDesc });
      await updateTaskDescription(task.id, newDesc);
    }
  };

  // ── Subtasks ───────────────────────────────────────────────────────────────

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    const updated = [...(task.subtasks || []), { title: newSubtask.trim(), completed: false }];
    onUpdateTask(task.id, { subtasks: updated });
    await updateTaskSubtasks(task.id, updated);
    setNewSubtask("");
  };

  const handleSubtaskKey = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); await addSubtask(); }
    if (e.key === "Escape") { setNewSubtask(""); setShowSubtaskInput(false); }
  };

  const toggleSubtask = async (index: number) => {
    const updated = (task.subtasks || []).map((st, i) =>
      i === index ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask(task.id, { subtasks: updated });
    await updateTaskSubtasks(task.id, updated);
  };

  const startEditSubtask = (index: number, title: string) => {
    setEditingSubtaskIndex(index);
    setEditingSubtaskText(title);
  };

  const saveSubtaskEdit = async () => {
    if (editingSubtaskIndex === null) return;
    const updated = [...(task.subtasks || [])];
    const trimmed = editingSubtaskText.trim();
    if (!trimmed) {
      // Delete if cleared
      updated.splice(editingSubtaskIndex, 1);
    } else if (trimmed !== updated[editingSubtaskIndex].title) {
      updated[editingSubtaskIndex] = { ...updated[editingSubtaskIndex], title: trimmed };
    }
    setEditingSubtaskIndex(null);
    onUpdateTask(task.id, { subtasks: updated });
    await updateTaskSubtasks(task.id, updated);
  };

  const handleSubtaskEditKey = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); await saveSubtaskEdit(); }
    if (e.key === "Escape") { setEditingSubtaskIndex(null); }
  };

  // ── Tags ───────────────────────────────────────────────────────────────────

  const handleToggleTag = async (tag: string) => {
    const current = task.tags || [];
    const isRemoving = current.includes(tag);
    const updated = isRemoving ? current.filter((t) => t !== tag) : [...current, tag];
    onUpdateTask(task.id, { tags: updated });
    await updateTaskTags(task.id, updated);
    if (!isRemoving) await ensureTag(tag);
  };

  // ── Checkbox hold ─────────────────────────────────────────────────────────

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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
  }, [task.id, onToggle]);

  const endHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
    const elapsed = Date.now() - holdStartRef.current;
    setHoldProgress(0);
    if (elapsed < 200) onToggle(task.id);
  }, [task.id, onToggle]);

  // ── Popovers ───────────────────────────────────────────────────────────────

  const togglePopover = (target: "date" | "deadline" | "tag") => {
    setShowDatePicker(target === "date" ? !showDatePicker : false);
    setShowDeadlinePicker(target === "deadline" ? !showDeadlinePicker : false);
    setShowTagPicker(target === "tag" ? !showTagPicker : false);
  };

  const hasOpenMenu = showDatePicker || showTagPicker || showDeadlinePicker;
  const isDone = task.status === "Done";
  const priorityColor = PRIORITY_COLORS[task.priority];
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0;

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: isExpanded ? "var(--ink-3)" : "transparent",
        boxShadow: isExpanded ? "var(--shadow-md)" : "none",
        borderRadius: "var(--r-md)",
      }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      style={{ marginBottom: 2, position: "relative", zIndex: isExpanded ? 10 : 2, cursor: "default" }}
      className="task-row"
      onClick={(e) => {
        e.stopPropagation();
        if (!isExpanded) setIsExpanded(true);
      }}
      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "var(--ink-2)"; }}
      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", flexDirection: "column", padding: isExpanded ? "8px 12px 12px 14px" : "6px 8px" }}>
        {/* ── Header row ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Priority bar */}
          <div style={{
            width: 3, height: 14, borderRadius: 2, background: isDone ? "var(--jade)" : priorityColor,
            flexShrink: 0, opacity: isDone ? 0.2 : 0.75, marginRight: 2,
          }} />

          {/* Checkbox */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            style={{ padding: 2, flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", position: "relative", outline: "none" }}
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={() => {
              if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; setHoldProgress(0); }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <AnimatePresence mode="wait">
                {isDone ? (
                  <motion.g key="done" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }}>
                    <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="var(--jade)" stroke="var(--jade)" strokeWidth="1" />
                    <motion.path d="M4.5 8 L7 10.5 L11.5 5.5" stroke="var(--ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.g>
                ) : (
                  <motion.rect key="todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="none" stroke="var(--ash)" strokeWidth="1.5" />
                )}
              </AnimatePresence>
            </svg>
            {holdProgress > 0 && !isDone && (
              <svg style={{ position: "absolute", inset: -2, width: 19, height: 19, pointerEvents: "none", transform: "rotate(-90deg)" }} viewBox="0 0 20 20">
                <rect x="2" y="2" width="16" height="16" rx="4.5" fill="none" stroke={priorityColor} strokeWidth="2" strokeDasharray={`${holdProgress * 56} 56`} opacity="0.8" />
              </svg>
            )}
          </motion.button>

          {/* Title */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleInput(task.title); setIsEditingTitle(false); } }}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 400, color: "var(--text-1)",
                background: "transparent", border: "none", outline: "none", flex: 1, letterSpacing: "-0.01em",
              }}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (isExpanded) setIsEditingTitle(true);
                else setIsExpanded(true);
              }}
              style={{
                fontSize: 14, fontWeight: 400, color: isDone ? "var(--text-3)" : "var(--text-1)",
                textDecoration: isDone ? "line-through" : "none", textDecorationColor: "var(--text-4)",
                letterSpacing: "-0.01em", transition: "color 0.15s", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", flex: "0 1 auto",
                cursor: isExpanded ? "text" : "default",
              }}
            >
              {task.title}
            </div>
          )}

          {/* Inline meta icons (collapsed only) */}
          {!isExpanded && (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {task.description && <FileText size={13} color="var(--text-4)" strokeWidth={1.5} />}
              {hasSubtasks && <ListTodo size={14} color="var(--text-4)" strokeWidth={1.5} />}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Metadata chips (collapsed only) */}
          {!isExpanded && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              {task.tags.length > 0 && (
                <div style={{ display: "flex", gap: 3 }}>
                  {task.tags.map((tag) => (
                    <span key={tag} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--violet)", background: "rgba(155,116,212,0.08)", padding: "2px 5px", borderRadius: 3 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {task.scheduled_at && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isDone ? "var(--text-4)" : "var(--sky)", display: "flex", alignItems: "center", gap: 3 }}>
                  {formatDate(task.scheduled_at)} {formatTime(task.scheduled_at)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Expanded content ──────────────────────────────────────────── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: hasOpenMenu ? "visible" : "hidden", paddingLeft: 24 }}
            >
              {/* Notes textarea */}
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                onBlur={saveDescription}
                onClick={(e) => e.stopPropagation()}
                placeholder="Notes"
                rows={2}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "var(--text-2)", fontSize: 13, resize: "none", width: "100%",
                  fontFamily: "var(--font-ui)", marginTop: 8, lineHeight: 1.5,
                }}
              />

              {/* Subtasks */}
              {(hasSubtasks || showSubtaskInput) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, marginBottom: 4 }}>
                  {(task.subtasks || []).map((st, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSubtask(i); }}
                        style={{ background: "none", border: "none", display: "flex", padding: 0, cursor: "pointer", flexShrink: 0 }}
                      >
                        {st.completed
                          ? <CheckCircle2 size={13} color="var(--jade)" />
                          : <Circle size={13} color="var(--text-4)" />}
                      </button>
                      {editingSubtaskIndex === i ? (
                        <input
                          autoFocus
                          value={editingSubtaskText}
                          onChange={(e) => setEditingSubtaskText(e.target.value)}
                          onBlur={saveSubtaskEdit}
                          onKeyDown={handleSubtaskEditKey}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1, background: "transparent", border: "none", outline: "none",
                            fontSize: 13, color: "var(--text-1)", fontFamily: "var(--font-ui)",
                          }}
                        />
                      ) : (
                        <span
                          onClick={(e) => { e.stopPropagation(); startEditSubtask(i, st.title); }}
                          style={{
                            fontSize: 13, flex: 1, cursor: "text",
                            color: st.completed ? "var(--text-4)" : "var(--text-2)",
                            textDecoration: st.completed ? "line-through" : "none",
                          }}
                        >
                          {st.title}
                        </span>
                      )}
                    </div>
                  ))}

                  {showSubtaskInput && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Circle size={13} color="var(--sky)" style={{ flexShrink: 0 }} />
                      <input
                        autoFocus
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={handleSubtaskKey}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="New subtask…"
                        style={{
                          flex: 1, background: "transparent", border: "none", outline: "none",
                          fontSize: 13, color: "var(--text-1)", fontFamily: "var(--font-ui)",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Toolbar */}
              <div
                ref={anchorRef}
                style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 10, position: "relative" }}
              >
                {showDatePicker && (
                  <DatePickerPopover
                    anchorRef={anchorRef}
                    initialDate={task.scheduled_at}
                    onSelect={(d) => { onUpdateDate(task.id, d); setShowDatePicker(false); }}
                  />
                )}
                {showTagPicker && (
                  <TagPopover
                    anchorRef={anchorRef}
                    selectedTags={task.tags}
                    onToggleTag={handleToggleTag}
                    onClose={() => setShowTagPicker(false)}
                  />
                )}
                {showDeadlinePicker && (
                  <DeadlinePopover
                    anchorRef={anchorRef}
                    initialDate={task.deadline_at}
                    onSelect={() => setShowDeadlinePicker(false)}
                  />
                )}

                <ToolbarBtn
                  active={!!task.scheduled_at}
                  activeColor="var(--sky)"
                  onClick={(e) => { e.stopPropagation(); togglePopover("date"); }}
                >
                  <CalendarIcon size={15} />
                </ToolbarBtn>
                <ToolbarBtn
                  active={task.tags.length > 0}
                  activeColor="var(--violet)"
                  onClick={(e) => { e.stopPropagation(); togglePopover("tag"); }}
                >
                  <Tag size={15} />
                </ToolbarBtn>
                <ToolbarBtn
                  active={hasSubtasks || showSubtaskInput}
                  activeColor="var(--amber)"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubtaskInput((v) => !v);
                    setShowDatePicker(false); setShowDeadlinePicker(false); setShowTagPicker(false);
                  }}
                >
                  <ListTodo size={15} />
                </ToolbarBtn>
                <ToolbarBtn
                  active={!!task.deadline_at}
                  activeColor="var(--rose)"
                  onClick={(e) => { e.stopPropagation(); togglePopover("deadline"); }}
                >
                  <Flag size={15} />
                </ToolbarBtn>

                <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />

                <ToolbarBtn
                  active={false}
                  activeColor="var(--rose)"
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                  hoverColor="var(--rose)"
                >
                  <Trash2 size={15} />
                </ToolbarBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ToolbarBtn({
  children, active, activeColor, hoverColor, onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  activeColor: string;
  hoverColor?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = active ? activeColor : hovered ? (hoverColor ?? "var(--text-1)") : "var(--text-3)";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: "transparent", border: "none", color, cursor: "pointer", display: "flex", padding: 2, transition: "color 0.12s" }}
    >
      {children}
    </button>
  );
}
