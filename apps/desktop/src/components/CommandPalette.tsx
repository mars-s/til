import React, { useEffect } from "react";
import { Command } from "cmdk";

export type CommandId =
  | "new-task"
  | "new-event"
  | "switch-calendar"
  | "switch-tasks"
  | "go-to-today"
  | "week-view"
  | "month-view";

interface CommandItem {
  id: CommandId;
  label: string;
  shortcut?: string;
}

const COMMANDS: CommandItem[] = [
  { id: "new-task", label: "New Task", shortcut: "cmd+n" },
  { id: "new-event", label: "New Event" },
  { id: "switch-calendar", label: "Switch to Calendar", shortcut: "tab" },
  { id: "switch-tasks", label: "Switch to Tasks", shortcut: "tab" },
  { id: "go-to-today", label: "Go to Today", shortcut: "t" },
  { id: "week-view", label: "Week View", shortcut: "w" },
  { id: "month-view", label: "Month View", shortcut: "m" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onCommand: (id: CommandId) => void;
}

export default function CommandPalette({
  open,
  onClose,
  onCommand,
}: CommandPaletteProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          style={{ background: "transparent" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        >
          <div
            style={{
              borderBottom: "1px solid var(--border)",
              padding: "12px 16px",
            }}
          >
            <Command.Input
              autoFocus
              placeholder="Type a command..."
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "14px",
              }}
            />
          </div>

          <Command.List style={{ maxHeight: "320px", overflow: "auto", padding: "8px" }}>
            <Command.Empty
              style={{
                padding: "16px",
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "13px",
              }}
            >
              No commands found.
            </Command.Empty>

            {COMMANDS.map((cmd) => (
              <Command.Item
                key={cmd.id}
                value={cmd.label}
                onSelect={() => {
                  onCommand(cmd.id);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
                className="cmd-item"
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--surface-hover)",
                      color: "var(--text-secondary)",
                      fontFamily: "monospace",
                    }}
                  >
                    {cmd.shortcut}
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>

      <style>{`
        .cmd-item[data-selected="true"],
        .cmd-item[aria-selected="true"] {
          background: var(--surface-hover) !important;
        }
      `}</style>
    </div>
  );
}
