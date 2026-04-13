import React, { useCallback, useEffect, useState } from "react";
import Tasks from "./views/Tasks";
import Calendar from "./views/Calendar";
import CommandPalette, { type CommandId } from "./components/CommandPalette";
import { AuthScreen } from "./components/AuthScreen";
import { useAuth } from "./hooks/useAuth";

type Tab = "tasks" | "calendar";
type CalView = "week" | "month";

export default function App() {
  const { session, loading, authError, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [calView, setCalView] = useState<CalView>("week");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusInputSignal, setFocusInputSignal] = useState(0);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // cmd+k — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      // cmd+n — focus task input
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setActiveTab("tasks");
        setFocusInputSignal((s) => s + 1);
        return;
      }

      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // tab — switch tabs
      if (e.key === "Tab") {
        e.preventDefault();
        setActiveTab((t) => (t === "tasks" ? "calendar" : "tasks"));
        return;
      }

      // escape — close palette
      if (e.key === "Escape") {
        setPaletteOpen(false);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCommand = useCallback((id: CommandId) => {
    switch (id) {
      case "new-task":
        setActiveTab("tasks");
        setFocusInputSignal((s) => s + 1);
        break;
      case "new-event":
        setActiveTab("calendar");
        break;
      case "switch-calendar":
        setActiveTab("calendar");
        break;
      case "switch-tasks":
        setActiveTab("tasks");
        break;
      case "go-to-today":
        setActiveTab("calendar");
        break;
      case "week-view":
        setActiveTab("calendar");
        setCalView("week");
        break;
      case "month-view":
        setActiveTab("calendar");
        setCalView("month");
        break;
    }
  }, []);

  // Loading spinner while checking stored session
  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full"
          style={{
            borderColor: "var(--accent)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  // Not authenticated — show onboarding
  if (!session) {
    return <AuthScreen externalError={authError} />;
  }

  // Authenticated — main app
  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--bg)", color: "var(--text-primary)" }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 py-2 flex-shrink-0 select-none"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {(["tasks", "calendar"] as Tab[]).map((tab) => (
          <button
            key={tab}
            className="px-4 py-1.5 rounded-md text-sm font-medium capitalize"
            style={{
              background: activeTab === tab ? "var(--surface)" : "transparent",
              color:
                activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
              border:
                activeTab === tab ? "1px solid var(--border)" : "1px solid transparent",
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "tasks" ? "Tasks" : "Calendar"}
          </button>
        ))}

        <div className="flex-1" />

        {/* cmd+k hint */}
        <button
          className="px-2 py-1 rounded text-xs"
          style={{
            background: "var(--surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          onClick={() => setPaletteOpen(true)}
          title="Open command palette"
        >
          ⌘K
        </button>

        {/* Sign out */}
        <button
          className="px-3 py-1 rounded text-xs ml-2"
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          onClick={signOut}
          title="Sign out"
        >
          Sign out
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "tasks" ? (
          <Tasks focusInputSignal={focusInputSignal} />
        ) : (
          <Calendar calView={calView} onCalViewChange={setCalView} />
        )}
      </div>

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onCommand={handleCommand}
      />
    </div>
  );
}
