# Phase 10 — Smart Scheduler

## Goal
Find optimal time slots for tasks. Local heuristic (fast, offline) + AI-enhanced (Claude via edge function). Dashed suggestion blocks in calendar.

## Local Heuristic (`packages/til-core/src/scheduler/heuristic.rs`)
```rust
pub struct Suggestion {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub confidence: f32,       // 0.0 – 1.0
    pub reason: String,
}

pub fn find_suggestions(
    task: &ParsedTask,
    events: &[CalendarEvent],
    preferences: &UserPreferences,
) -> Vec<Suggestion> {
    // 1. Build 14-day free/busy map from events
    // 2. Find gaps >= task.duration_minutes
    // 3. Score each gap:
    //    - morning bonus for high/urgent priority
    //    - penalise back-to-back blocks
    //    - prefer within working hours (preferences.work_hours)
    //    - penalise fragmented gaps
    // 4. Return top 3 sorted by score
}

pub struct UserPreferences {
    pub work_hours: (u8, u8),    // e.g. (9, 18)
    pub focus_time: (u8, u8),    // e.g. (9, 12) — deep work window
    pub timezone: Tz,
}
```

## AI-Enhanced (`supabase/functions/smart-schedule/index.ts`)
> **Anthropic key is optional.** Set `AI_SCHEDULING_ENABLED=true` + `ANTHROPIC_API_KEY` in Supabase Edge Function secrets to activate. Without them, the function returns empty and the app silently falls back to the local heuristic. A toggle in app Settings (desktop + mobile) lets the user enable/disable AI suggestions independently of the key being set.
```typescript
import Anthropic from '@anthropic-ai/sdk';

// POST /functions/smart-schedule
// Body: { task, free_slots, preferences }

const client = new Anthropic();

const message = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: `You are a scheduling assistant. Given this task and free time slots,
rank the top 3 slots and provide a brief reason for each.

Task: ${JSON.stringify(task)}
Free slots: ${JSON.stringify(free_slots)}
User preferences: ${JSON.stringify(preferences)}

Return JSON: { suggestions: [{ start, end, confidence, reason }] }`
  }]
});
```

## Suggestion UX
1. User clicks "Schedule" on a task (or uses cmd+k → "Schedule Task")
2. Local heuristic runs instantly → 3 dashed blocks appear in calendar
3. AI call fires in background → updates reasons when ready
4. User clicks a dashed block → commits it (solid block + Google Cal event)
5. Rejected suggestions disappear

## Desktop integration (`src/views/calendar/week.rs`)
```rust
// SuggestionBlock renders with dashed border + ghost opacity
// Click → dispatch Action::CommitSuggestion(suggestion)
// CommitSuggestion → calls SyncClient::schedule_task() → creates Google Cal event
```

## Mobile integration (`components/CalendarGrid.tsx`)
Same UX: dashed blocks, tap to commit.

## Milestone
Select an unscheduled task → 3 dashed suggestions appear in week view with reasons. Click one → block becomes solid, Google Cal event created, task.scheduled_at updated.
