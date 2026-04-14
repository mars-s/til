import { useEffect, useState, useRef, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as chrono from "chrono-node";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  format,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  differenceInDays,
} from "date-fns";
import { CalendarIcon, Star, Moon, Archive, Plus, ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";

interface DatePickerPopoverProps {
  anchorRef?: RefObject<HTMLDivElement | null>;
  initialDate?: string | null;
  onSelect: (isoDate: string | null) => void;
  onClose: () => void;
}

interface Suggestion {
  date: Date;
  daysDiff: number;
  hasTime?: boolean;
}

function getRelativeDaysText(diff: number) {
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export default function DatePickerPopover({ initialDate, onSelect, onClose }: DatePickerPopoverProps) {
  const [inputText, setInputText] = useState("");
  const [currentMonth, setCurrentMonth] = useState(
    initialDate ? new Date(initialDate) : new Date()
  );
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Non-blocking ASYNC NLP Parsing logic
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (inputText.trim().length <= 1) {
      setSuggestions([]);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    
    // Non-blocking parse in event loop / promise microtask
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await new Promise<Suggestion[]>((resolve) => {
          setTimeout(() => {
            const parsed = chrono.parse(inputText, new Date(), { forwardDate: true });
            if (parsed.length === 0) return resolve([]);
            
            const baseDate = parsed[0].start.date();
            const today = new Date();
            today.setHours(0,0,0,0);
            const refBase = new Date(baseDate);
            refBase.setHours(0,0,0,0);
            
            let predicted: Suggestion[] = [{
              date: baseDate,
              daysDiff: differenceInDays(refBase, today),
              hasTime: parsed[0].start.isCertain('hour')
            }];

            // Multi-prediction heuristic for weekday primitives (like "friday")
            const isWeekdayOnly = /^(mon|tue|wed|thu|fri|sat|sun)(day|s)?$/i.test(inputText.trim());
            if (isWeekdayOnly) {
              const week2 = addWeeks(baseDate, 1);
              const week3 = addWeeks(baseDate, 2);
              
              const week2Ref = new Date(week2); week2Ref.setHours(0,0,0,0);
              const week3Ref = new Date(week3); week3Ref.setHours(0,0,0,0);

              predicted.push({ date: week2, daysDiff: differenceInDays(week2Ref, today) });
              predicted.push({ date: week3, daysDiff: differenceInDays(week3Ref, today) });
            }
            resolve(predicted);
          }, 0);
        });
        
        setSuggestions(results);
        setSelectedIndex(0);
      } finally {
        setIsTyping(false);
      }
    }, 150); // 150ms debounce
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(s => (s + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(s => (s - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onSelect(suggestions[selectedIndex].date.toISOString());
        return;
      }
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputText.trim() === "") {
        onSelect(null);
      } else if (suggestions.length > 0) {
        onSelect(suggestions[0].date.toISOString());
      }
    }
  };

  const setDate = (d: Date) => {
    onSelect(d.toISOString());
  };

  const setTonight = () => {
    const tonight = new Date();
    tonight.setHours(19, 0, 0, 0); // 7 PM Evening
    onSelect(tonight.toISOString());
  };

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: 36,
        right: 0,
        width: 260,
        background: "var(--ink-4)",
        border: "1px solid var(--border-2)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 50,
        padding: "10px",
        fontFamily: "var(--font-ui)",
        color: "var(--text-1)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search / NLP Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--ink-2)",
          borderRadius: "var(--r-sm)",
          padding: "6px 10px",
          marginBottom: suggestions.length > 0 ? 8 : 10,
        }}
      >
        <CalendarIcon size={14} color="var(--text-3)" style={{ marginRight: 8 }} />
        <input
          ref={inputRef}
          value={inputText}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="When"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-1)",
            fontSize: 14,
            width: "100%",
          }}
        />
        {/* Subtle loading spinner for async representation if we want it */}
      </div>

      {/* ASYNC PREVIEWS OR DEFAULT UI */}
      {suggestions.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s.date.toISOString())}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: selectedIndex === i ? "var(--sky)" : "transparent",
                border: "none",
                borderRadius: "var(--r-sm)",
                color: selectedIndex === i ? "var(--ink)" : "var(--text-1)",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CalendarDays 
                  size={16} 
                  color={selectedIndex === i ? "var(--ink)" : "var(--rose)"} 
                />
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {format(s.date, "E, d MMM")}
                  {s.hasTime && <span style={{ opacity: 0.6, marginLeft: 6 }}>{format(s.date, "h:mm a")}</span>}
                </span>
              </div>
              <span style={{ 
                fontSize: 13, 
                color: selectedIndex === i ? "rgba(0,0,0,0.6)" : "var(--text-4)",
                fontWeight: 500
              }}>
                {getRelativeDaysText(s.daysDiff)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Quick Sets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            <button
              onClick={() => setDate(new Date())}
              className="hover:bg-[var(--ink-2)]"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "4px 6px",
                background: "transparent", border: "none", color: "var(--text-1)",
                fontSize: 14, fontWeight: 500, borderRadius: "var(--r-sm)", cursor: "pointer",
              }}
            >
              <Star size={16} fill="var(--amber)" color="var(--amber)" />
              Today
            </button>
            <button
              onClick={setTonight}
              className="hover:bg-[var(--ink-2)]"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "4px 6px",
                background: "transparent", border: "none", color: "var(--text-1)",
                fontSize: 14, fontWeight: 500, borderRadius: "var(--r-sm)", cursor: "pointer",
              }}
            >
              <Moon size={16} fill="var(--sky)" color="var(--sky)" />
              This Evening
            </button>
          </div>

          {/* Mini Calendar */}
          <div style={{ userSelect: "none", marginBottom: 10 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
              {weekDays.map((wd) => (
                <div key={wd} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>
                  {wd}
                </div>
              ))}
            </div>
            
            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 }}>
              {days.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isSel = initialDate && isSameDay(day, new Date(initialDate));
                const isTod = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setDate(day)}
                    className="hover:bg-[var(--ink-2)]"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      height: 28, fontSize: 13, fontWeight: 600,
                      color: isSel ? "var(--ink)" : isCurrentMonth ? "var(--text-1)" : "var(--text-4)",
                      background: isSel ? "var(--sky)" : "transparent",
                      borderRadius: "50%", cursor: "pointer", margin: "0 auto", width: 28, position: "relative",
                    }}
                  >
                    {idx === 0 && day.getDate() > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)) }}
                        style={{ position: 'absolute', left: -2, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    {isTod && !isSel ? (
                      <Star size={12} fill="var(--text-3)" color="var(--text-3)" />
                    ) : (
                      day.getDate()
                    )}

                    {idx === days.length - 1 && day.getDate() < 15 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)) }}
                        style={{ position: 'absolute', right: -2, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

          {/* Bottom Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              onClick={() => onSelect(null)}
              className="hover:bg-[var(--ink-2)]"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "4px 6px",
                background: "transparent", border: "none", color: "var(--text-1)",
                fontSize: 14, fontWeight: 500, borderRadius: "var(--r-sm)", cursor: "pointer",
              }}
            >
              <Archive size={16} color="var(--amber)" fill="var(--amber)" />
              Someday
            </button>
            <button
              className="hover:bg-[var(--ink-2)]"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "4px 6px",
                background: "transparent", border: "none", color: "var(--text-3)",
                fontSize: 14, fontWeight: 500, borderRadius: "var(--r-sm)", cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Reminder
            </button>
          </div>
        </  >
      )}
    </motion.div>
  );
}
