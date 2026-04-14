import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarIcon, Tag, ListTodo, Flag, Trash2, Circle, Menu, FileText, CheckCircle2 } from "lucide-react";
import { type Task, type Priority } from "../lib/invoke";
import { updateTaskTitle, updateTaskDescription, updateTaskSubtasks } from "../lib/db";
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
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function TaskRow({ task, onToggle, onDelete, onUpdateDate, onUpdateTask }: TaskRowProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(task.title);
  const [descInput, setDescInput] = useState(task.description || "");

  const titleInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditingTitle) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isEditingTitle]);

  const saveTitle = async () => {
    setIsEditingTitle(false);
    if (titleInput.trim() !== task.title && titleInput.trim() !== "") {
      const newTitle = titleInput.trim();
      onUpdateTask(task.id, { title: newTitle });
      await updateTaskTitle(task.id, newTitle);
    } else {
      setTitleInput(task.title);
    }
  };

  const saveDescription = async () => {
    if (descInput !== (task.description || "")) {
      const newDesc = descInput.trim() === "" ? null : descInput;
      onUpdateTask(task.id, { description: newDesc });
      await updateTaskDescription(task.id, newDesc);
    }
  };
  
  // Popover States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  
  // Real mapped subtasks
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  const anchorRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const HOLD_MS = 400;

  // Global click outside listener
  useEffect(() => {
    if (!isExpanded) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowDatePicker(false);
        setShowTagPicker(false);
        setShowDeadlinePicker(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [isExpanded]);

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
        onToggle(task.id);
      }
    },
    [task.id, onToggle]
  );

  const togglePopover = (target: "date" | "deadline" | "tag") => {
    setShowDatePicker(target === "date" ? !showDatePicker : false);
    setShowDeadlinePicker(target === "deadline" ? !showDeadlinePicker : false);
    setShowTagPicker(target === "tag" ? !showTagPicker : false);
  };

  const hasOpenMenu = showDatePicker || showTagPicker || showDeadlinePicker;
  const isDone = task.status === "Done";
  const priorityColor = PRIORITY_COLORS[task.priority];

  // Helper for subtask submission
  const handleSubtaskKey = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newSubtask.trim()) {
      const updated = [...(task.subtasks || []), { title: newSubtask.trim(), completed: false }];
      onUpdateTask(task.id, { subtasks: updated });
      await updateTaskSubtasks(task.id, updated);
      setNewSubtask("");
    }
  };

  const toggleSubtask = async (index: number) => {
    const updated = [...(task.subtasks || [])];
    updated[index].completed = !updated[index].completed;
    onUpdateTask(task.id, { subtasks: updated });
    await updateTaskSubtasks(task.id, updated);
  };

  return (
    <motion.div
      layout
      ref={rowRef}
      initial={{ opacity: 0, y: 5 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: isExpanded ? "var(--ink-3)" : "transparent",
        boxShadow: isExpanded ? "var(--shadow-md)" : "none",
        scale: 1,
        borderRadius: "var(--r-md)",
      }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      style={{
        marginBottom: isExpanded ? 8 : 2,
        marginTop: isExpanded ? 6 : 0,
        position: "relative",
        zIndex: isExpanded ? 10 : 2,
        cursor: "default",
      }}
      className="task-row group"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsExpanded(true);
      }}
      onMouseEnter={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.background = "var(--ink-2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <motion.div
        layout
        style={{ display: "flex", flexDirection: "column", padding: isExpanded ? "8px 12px 12px 14px" : "6px 8px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Priority indicator */}
          <div
            style={{
              width: 4, height: isExpanded ? 14 : 12, transition: "height 0.2s ease",
              borderRadius: 2, background: priorityColor, flexShrink: 0,
              opacity: isDone ? 0.2 : 0.8, marginRight: 2,
            }}
          />

          {/* Checkbox */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            style={{
              padding: "2px", flexShrink: 0, background: "transparent", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", position: "relative", outline: "none",
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
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <AnimatePresence mode="wait">
                {isDone ? (
                  <motion.g key="done" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
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

          {/* Task Title */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              style={{
                fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 400,
                color: "var(--text-1)", background: "transparent", border: "none", outline: "none",
                flex: 1, paddingBottom: 1, letterSpacing: "-0.01em",
              }}
            />
          ) : (
            <motion.div
              layout="position"
              onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
              style={{
                fontSize: 14, fontWeight: 400, color: isDone ? "var(--text-3)" : "var(--text-1)",
                textDecoration: isDone ? "line-through" : "none", textDecorationColor: "var(--text-4)",
                letterSpacing: "-0.01em", transition: "all 0.2s ease", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", paddingBottom: 1, cursor: "text"
              }}
            >
              {task.title}
            </motion.div>
          )}

          {/* Inline UI Icons (Notes/Subtasks) */}
          {!isExpanded && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 4 }}>
              {task.description && <FileText size={12} color="var(--text-4)" strokeWidth={2.5} />}
              {task.subtasks?.length > 0 && <ListTodo size={13} color="var(--text-4)" strokeWidth={2.5} />}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Basic Metadata */}
          {!isExpanded && (
            <motion.div layout="position" style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
              {task.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4 }}>
                  {task.tags.map((tag) => (
                    <span key={tag} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--violet)", background: "rgba(155,116,212,0.08)", padding: "2px 6px", borderRadius: 4 }}>#{tag}</span>
                  ))}
                </div>
              )}
              {task.scheduled_at && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isDone ? "var(--text-4)" : "var(--sky)", display: "flex", alignItems: "center", gap: 4 }}>
                  {formatDate(task.scheduled_at)} {formatTime(task.scheduled_at)}
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Expanded View Elements */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              style={{ 
                overflow: hasOpenMenu ? "visible" : "hidden", // Fixes popup clipping!
                paddingLeft: 36, display: "flex", flexDirection: "column" 
              }}
            >
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                onBlur={saveDescription}
                placeholder="Notes"
                style={{
                  background: "transparent", border: "none", outline: "none", color: "var(--text-2)",
                  fontSize: 13, resize: "none", height: 36, fontFamily: "var(--font-ui)", marginTop: 6,
                }}
              />

              {/* Subtasks Block */}
              {showSubtasks && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}
                >
                  {task.subtasks?.map((st, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); toggleSubtask(i); }} style={{ background: "none", border: "none", display: "flex", padding: 0, cursor: "pointer" }}>
                        {st.completed ? (
                          <CheckCircle2 size={12} color="var(--jade)" />
                        ) : (
                          <Circle size={12} color="var(--text-4)" />
                        )}
                      </button>
                      <span style={{ fontSize: 13, color: st.completed ? "var(--text-4)" : "var(--text-2)", textDecoration: st.completed ? "line-through" : "none", flex: 1 }}>{st.title}</span>
                      <Menu size={14} color="var(--text-4)" />
                    </div>
                  ))}
                  
                  {/* New subtask input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Circle size={12} color="var(--sky)" />
                    <input 
                      autoFocus
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={handleSubtaskKey}
                      placeholder="subtask"
                      style={{ 
                        background: "transparent", border: "none", outline: "none", 
                        fontSize: 13, color: "var(--text-1)", flex: 1 
                      }}
                    />
                    <Menu size={14} color="var(--text-4)" />
                  </div>
                </motion.div>
              )}

              {/* Action Toolbar Bottom Right */}
              <div ref={anchorRef} style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 12, position: "relative" }}>
                
                {/* Independent Popovers rendering into Portals */}
                {showDatePicker && (
                  <DatePickerPopover 
                    anchorRef={anchorRef}
                    initialDate={task.scheduled_at}
                    onSelect={(d) => { onUpdateDate(task.id, d); setShowDatePicker(false); }}
                    onClose={() => setShowDatePicker(false)}
                  />
                )}

                {showTagPicker && (
                  <TagPopover 
                    anchorRef={anchorRef}
                    selectedTags={task.tags}
                    onToggleTag={() => {}} // Hook up mapping logic here later!
                    onClose={() => setShowTagPicker(false)}
                  />
                )}

                {showDeadlinePicker && (
                  <DeadlinePopover 
                    anchorRef={anchorRef}
                    initialDate={task.deadline_at}
                    onSelect={(d) => { /* Update deadline securely later */ setShowDeadlinePicker(false); }}
                    onClose={() => setShowDeadlinePicker(false)}
                  />
                )}
                
                <button
                  onClick={(e) => { e.stopPropagation(); togglePopover("date"); }}
                  className="hover:text-[var(--text-1)]"
                  style={{ background: "transparent", border: "none", color: task.scheduled_at ? "var(--sky)" : "var(--text-3)", cursor: "pointer", display: "flex", padding: 0 }}
                >
                  <CalendarIcon size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePopover("tag"); }}
                  className="hover:text-[var(--text-1)]"
                  style={{ background: "transparent", border: "none", color: task.tags.length > 0 ? "var(--violet)" : "var(--text-3)", cursor: "pointer", display: "flex", padding: 0 }}
                >
                  <Tag size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); setShowDatePicker(false); setShowDeadlinePicker(false); setShowTagPicker(false); }}
                  className="hover:text-[var(--text-1)]"
                  style={{ background: "transparent", border: "none", color: showSubtasks || task.subtasks?.length > 0 ? "var(--amber)" : "var(--text-3)", cursor: "pointer", display: "flex", padding: 0 }}
                >
                  <ListTodo size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePopover("deadline"); }}
                  className="hover:text-[var(--text-1)]"
                  style={{ background: "transparent", border: "none", color: task.deadline_at ? "var(--rose)" : "var(--text-3)", cursor: "pointer", display: "flex", padding: 0 }}
                >
                  <Flag size={16} />
                </button>
                
                <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
                
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                  className="hover:text-[var(--rose)]"
                  style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", display: "flex", padding: 0 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
