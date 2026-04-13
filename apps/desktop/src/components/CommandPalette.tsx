import { useEffect } from "react";
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
  icon?: string;
}

const COMMANDS: CommandItem[] = [
  { id: "new-task",        label: "New Task",            shortcut: "⌘N",  icon: "+" },
  { id: "new-event",       label: "New Event",                            icon: "◈" },
  { id: "switch-calendar", label: "Switch to Calendar",  shortcut: "Tab", icon: "▦" },
  { id: "switch-tasks",    label: "Switch to Tasks",     shortcut: "Tab", icon: "☰" },
  { id: "go-to-today",     label: "Go to Today",         shortcut: "T",   icon: "◎" },
  { id: "week-view",       label: "Week View",           shortcut: "W",   icon: "▤" },
  { id: "month-view",      label: "Month View",          shortcut: "M",   icon: "▦" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onCommand: (id: CommandId) => void;
}

export default function CommandPalette({ open, onClose, onCommand }: CommandPaletteProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          background: "var(--ink-3)",
          border: "1px solid var(--border-2)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          style={{ background: "transparent" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        >
          {/* Search input */}
          <div
            style={{
              borderBottom: "1px solid var(--border)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ color: "var(--text-3)", fontSize: 14 }}>⌘</span>
            <Command.Input
              autoFocus
              placeholder="Type a command…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-1)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                caretColor: "var(--amber)",
              }}
            />
          </div>

          <Command.List
            style={{
              maxHeight: 320,
              overflow: "auto",
              padding: "6px",
            }}
          >
            <Command.Empty
              style={{
                padding: "20px 16px",
                textAlign: "center",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
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
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  color: "var(--text-1)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  userSelect: "none",
                }}
                className="cmd-item"
              >
                {/* Icon */}
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--smoke)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--amber)",
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {cmd.icon ?? "›"}
                </span>

                <span style={{ flex: 1 }}>{cmd.label}</span>

                {cmd.shortcut && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-3)",
                      background: "var(--smoke)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid var(--border)",
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
    </div>
  );
}
