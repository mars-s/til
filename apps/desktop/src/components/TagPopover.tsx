import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import { fetchTags } from "../lib/db";

interface TagPopoverProps {
  anchorRef?: React.RefObject<HTMLDivElement | null>;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClose: () => void;
}

export default function TagPopover({ selectedTags, onToggleTag, onClose }: TagPopoverProps) {
  const [inputText, setInputText] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchTags()
      .then(setAvailableTags)
      .catch(() => setAvailableTags([]));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Enter" && inputText.trim()) {
      onToggleTag(inputText.trim().toLowerCase().replace(/\s+/g, "-"));
      setInputText("");
    }
  };

  const filtered = availableTags.filter(
    (t) => t.toLowerCase().includes(inputText.toLowerCase()) && !selectedTags.includes(t)
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{
        position: "absolute",
        bottom: 36,
        right: 0,
        width: 200,
        background: "var(--ink-4)",
        border: "1px solid var(--border-2)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 50,
        padding: "6px",
        fontFamily: "var(--font-ui)",
        color: "var(--text-1)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Selected tags row */}
      {selectedTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 6px 6px", borderBottom: "1px solid var(--border)" }}>
          {selectedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--violet)",
                background: "rgba(155,116,212,0.12)",
                border: "none",
                borderRadius: 4,
                padding: "2px 6px",
                cursor: "pointer",
              }}
            >
              #{tag} ×
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--ink-2)",
          borderRadius: "var(--r-sm)",
          padding: "6px 10px",
          margin: "4px 0",
        }}
      >
        <Tag size={13} color="var(--text-3)" style={{ marginRight: 8, flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag…"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-1)",
            fontSize: 13,
            width: "100%",
          }}
        />
      </div>

      {/* Tag list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 180, overflowY: "auto" }}>
        {filtered.map((tag) => (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              background: "transparent",
              border: "none",
              color: "var(--text-1)",
              fontSize: 13,
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ink-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Tag size={12} color="var(--text-4)" />
            <span>{tag}</span>
          </button>
        ))}
        {inputText.trim() && !availableTags.includes(inputText.trim().toLowerCase()) && (
          <button
            onClick={() => { onToggleTag(inputText.trim().toLowerCase().replace(/\s+/g, "-")); setInputText(""); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              background: "transparent",
              border: "none",
              color: "var(--violet)",
              fontSize: 13,
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ink-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Tag size={12} color="var(--violet)" />
            <span>Create "{inputText.trim()}"</span>
          </button>
        )}
        {filtered.length === 0 && !inputText.trim() && availableTags.length === 0 && (
          <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-4)", fontStyle: "italic" }}>
            Type to create a tag
          </div>
        )}
      </div>
    </motion.div>
  );
}
