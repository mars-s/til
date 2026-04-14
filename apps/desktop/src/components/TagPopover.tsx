import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";

interface TagPopoverProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClose: () => void;
}

const MOCK_TAGS = ["Errand", "Home", "Office", "Important", "Pending"];

export default function TagPopover({ selectedTags, onToggleTag, onClose }: TagPopoverProps) {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputText.trim()) {
      onToggleTag(inputText.trim());
      setInputText("");
    }
  };

  const filteredTags = MOCK_TAGS.filter(t => t.toLowerCase().includes(inputText.toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        position: "absolute",
        bottom: 36, // Float upwards since it's typically positioned at bottom right of task
        right: 0,
        width: 180,
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--ink-2)",
          borderRadius: "var(--r-sm)",
          padding: "6px 10px",
          marginBottom: 6,
        }}
      >
        <Tag size={14} color="var(--text-3)" style={{ marginRight: 8 }} />
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tags"
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

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filteredTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className="hover:bg-[var(--ink-2)]"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              background: selectedTags.includes(tag) ? "var(--ink-2)" : "transparent",
              border: "none",
              color: "var(--text-1)",
              fontSize: 14,
              fontWeight: 500,
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
            }}
          >
            <Tag size={13} color="var(--text-3)" />
            {tag}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
