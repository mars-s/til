import { useEffect, useState, useRef } from "react";
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
import { Flag, ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";

interface DeadlinePopoverProps {
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

export default function DeadlinePopover({ initialDate, onSelect, onClose }: DeadlinePopoverProps) {
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

  // Async NLP Parsing logic
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (inputText.trim().length <= 1) {
      setSuggestions([]);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    
    // Non-blocking parse
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
          }, 0); // microtask offload
        });
        
        setSuggestions(results);
        setSelectedIndex(0);
      } finally {
        setIsTyping(false);
      }
    }, 150);
    
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
        bottom: 36,
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
        <Flag size={14} color="var(--text-3)" style={{ marginRight: 8 }} />
        <input
          ref={inputRef}
          value={inputText}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Deadline"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-1)",
            fontSize: 14,
            width: "100%",
          }}
        />
      </div>

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
        <div style={{ userSelect: "none", marginBottom: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
            {weekDays.map((wd) => (
              <div key={wd} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>
                {wd}
              </div>
            ))}
          </div>
          
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
                  {day.getDate() === 1 && !isSel && !isTod ? (
                    <span style={{ fontSize: 10, lineHeight: 1, textAlign: "center", color: "var(--text-1)" }}>
                      {format(day, "MMM")}<br/>1
                    </span>
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
      )}
    </motion.div>
  );
}
