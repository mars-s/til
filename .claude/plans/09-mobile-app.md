# Phase 9 — Mobile App (Expo + React Native)

## Goal
iOS app mirroring desktop functionality. Uses til-core WASM for NLP, Supabase for data, Liquid Glass UI.

## Setup
```bash
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript
npx expo install expo-router react-native-safe-area-context \
  react-native-screens react-native-blur @supabase/supabase-js
```

## Directory structure
```
apps/mobile/
├── app/
│   ├── _layout.tsx         # root layout, auth gate
│   ├── (auth)/
│   │   └── login.tsx       # Google sign-in screen
│   └── (tabs)/
│       ├── _layout.tsx     # Liquid Glass tab bar
│       ├── tasks.tsx
│       └── calendar.tsx
├── components/
│   ├── TaskRow.tsx
│   ├── TaskInput/
│   │   ├── index.tsx
│   │   └── SpanHighlight.tsx   # coloured NLP chips
│   ├── CalendarGrid.tsx
│   └── LiquidGlassNav.tsx
├── lib/
│   ├── supabase.ts
│   ├── til-core/           # wasm-pack output (gitignored, generated)
│   └── google-calendar.ts
└── hooks/
    ├── useTasks.ts         # Supabase Realtime subscription
    └── useCalendar.ts
```

## Liquid Glass UI
```typescript
// LiquidGlassNav.tsx — iOS 26 material
import { BlurView } from 'expo-blur';

// Tab bar: BlurView intensity=80, tint="systemMaterial"
// Task cards: BlurView intensity=40 over background gradient
// Modals: full liquid glass sheet
```

## NLP in Mobile
```typescript
// lib/til-core/index.ts
import init, { parse_task, parse_event } from './til_core_bg.wasm';

export async function initTilCore() { await init(); }
export { parse_task, parse_event };

// SpanHighlight.tsx — renders coloured ranges inline in TextInput
```

## Supabase client (`lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../packages/til-types/src/database';

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Realtime subscription (`hooks/useTasks.ts`)
```typescript
useEffect(() => {
  const channel = supabase
    .channel('tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks',
        filter: `user_id=eq.${userId}` }, handleChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [userId]);
```

## Env (`.env` in `apps/mobile/`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```
(No service role key — never in client app)

## Milestone
App runs on iOS simulator. Google sign-in works. Tasks tab shows real-time synced tasks. NLP input highlights spans as user types. Calendar tab shows week grid.
