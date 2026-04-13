# Phase 8 — Command Palette (cmd+k)

## Goal
Global command palette accessible from anywhere in the desktop app via `cmd+k`. All major actions wired. React-based UI in Tauri 2.0.

## Component (`src/components/CommandPalette.tsx`)
Using a library like `cmdk` for robust and accessible command palette behavior.
```tsx
<CommandPalette>
  <SearchInput />      {/* fuzzy search */}
  <CommandList>
    <CommandItem />
  </CommandList>
  <PreviewPane />      {/* optional, for context */}
</CommandPalette>
```

## Command registry
```tsx
interface Command {
    id: string;
    label: string;
    keywords: string[];
    icon?: React.ReactNode;
    action: () => void;
}
```

## Commands list (v1)
| Label | Keywords | Action |
|-------|----------|--------|
| New Task | task, add, create | CreateTask |
| New Event | event, calendar | CreateEvent |
| Go to Tasks | tasks, list | NavigateTasks |
| Go to Calendar | calendar, week | NavigateCalendar |
| Connect Google Calendar | connect, google, bind | BindCalendar |
| Jump to Today | today, now | JumpToDate(today) |
| Sign Out | logout, signout | SignOut |

## Fuzzy search
Handled by `cmdk` or a small custom fuzzy matcher on `label + keywords`.

## UX
- Opens with `cmd+k` from any view using global shortcut hooks
- `↑` / `↓` to navigate, `Enter` to execute, `Escape` to close
- Animate in (opacity + slight scale/translate) using Framer Motion or CSS transitions
- Positioned center-top of window (Raycast style)
- Styled with Tailwind to match the app theme with blurred background

## Integration with NLP input
If the palette is opened while a task is selected → pre-fill "Schedule Task {title}" as the top command.

## Milestone
`cmd+k` opens palette. All default commands work. Fuzzy search filters correctly. UI feels snappy natively.
