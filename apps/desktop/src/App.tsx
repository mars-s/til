import { useCallback, useEffect, useState } from "react";
import Tasks from "./views/Tasks";
import Calendar from "./views/Calendar";
import CommandPalette, { type CommandId } from "./components/CommandPalette";
import { AuthScreen } from "./components/AuthScreen";
import { useAuth } from "./hooks/useAuth";

type Tab = "tasks" | "calendar";
type CalView = "week" | "month";

function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 1 L17 9 L9 17 L1 9 Z" fill="none" stroke="var(--amber)" strokeWidth="1.2"/>
      <path d="M9 1 L17 9 L9 9 Z" fill="var(--amber)" opacity="0.85"/>
    </svg>
  );
}

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
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--ink)",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            border: "1.5px solid var(--ash)",
            borderTopColor: "var(--amber)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated — show onboarding
  if (!session) {
    return <AuthScreen externalError={authError} />;
  }

  // Authenticated — main app
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--ink)" }}>
      {/* Top bar — 44px */}
      <div
        style={{
          height: 44,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 0,
          paddingLeft: 16,
          paddingRight: 12,
          background: "var(--ink-2)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginRight: 20 }}>
          <LogoMark size={18} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontStyle: "italic",
              color: "var(--text-1)",
              letterSpacing: "-0.01em",
            }}
          >
            til
          </span>
        </div>

        {/* Tab buttons */}
        {(["tasks", "calendar"] as Tab[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--amber)" : "2px solid transparent",
                color: active ? "var(--amber)" : "var(--text-3)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                padding: "0 14px",
                height: 44,
                cursor: "pointer",
                letterSpacing: "0.01em",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
              }}
            >
              {tab === "tasks" ? "Tasks" : "Calendar"}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* cmd+k hint */}
        <button
          onClick={() => setPaletteOpen(true)}
          title="Open command palette (⌘K)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 9px",
            background: "var(--smoke)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r-sm)",
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
        >
          ⌘K
        </button>

        {/* User dot / sign out */}
        <button
          onClick={signOut}
          title="Sign out"
          style={{
            marginLeft: 8,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--ash)",
            border: "1px solid var(--border-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-3)",
            fontSize: 11,
            fontFamily: "var(--font-ui)",
          }}
        >
          ◦
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
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
