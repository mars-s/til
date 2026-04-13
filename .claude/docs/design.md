# Til App Design System

This document outlines the core visual primitives, tokens, and overarching design philosophy for the `til` desktop application. 

## Design Philosophy

The app is built around a distinct "warm dark mode" aesthetic. Rather than using generic flat grays and stark whites, the design leans heavily into rich black/brown ink hues paired with analog, tactile typography. It creates a focused, comfortable environment designed to fade away so the tasks stand out.

- **Tactility over Flatness**: Elements feature subtle layered shadows, tight borders (mostly relying on very faint white overlays), and micro-animations to mimic physical affordances.
- **Warmth**: A persistent fractal noise blend alongside text colored in soft off-whites and sandy tones (`f0e8dc`) reduces harsh blue-light strain, evoking the feeling of vintage dashboards or dimly lit studies.
- **Focus**: UI elements are largely monochromatic until interaction or state necessitates color (e.g., active task statuses, command palette selections).

---

## 1. Typography

The application utilizes a deliberate three-tier font system to establish visual rhythm:

- **Display**: `'Instrument Serif', Georgia, serif`
  Typically used for top-level navigation, hero copy, and empty states. It is mostly styled in *italic* to provide a sophisticated, editorial contrast to the rigidity of the tasks.
  
- **UI / Base**: `'Geist', system-ui, sans-serif`
  The workhorse variable font for the majority of the interface. Legible, sharp, and tightly kerned.
  
- **Monospace**: `'DM Mono', 'JetBrains Mono', monospace`
  Employed for numbers, counts, times, dates, and subtle system hints.

## 2. Color Palette

The environment is built on a series of nested "Inks"—off-black shades with slight warm/brown undertones.

### Base Layers (Surfaces & Backgrounds)
- `--ink` (`#080808`): Deepest layer, app background.
- `--ink-2` (`#101010`): Sub-navigation backgrounds.
- `--ink-3` (`#161616`): Main interactive surfaces (cards, modals).
- `--ink-4` (`#1e1e1e`): Surface hover states.
- `--smoke` (`#282828`): Active toggles, selected buttons.
- `--ash` (`#363636`): Scrollbar thumbs, borders of empty avatars.

### Text Hierarchy
Text relies heavily on warm cream and sandy taupe rather than pure white.
- `--text-1` (`#f0e8dc`): High contrast (Body text, input text)
- `--text-2` (`#a89880`): Medium contrast (Descriptions, subtitles)
- `--text-3` (`#6a6058`): Low contrast (Metadata, inactive tabs, UI hints)
- `--text-4` (`#3d3830`): Ultra low contrast (Footers, micro-copy dividers)

### Accents & Statuses
Colors are used sparingly and mapped strictly to semantics or NLP spans.
- **Amber** (`#e8a842` / `#f0bc64`): Primary brand color, In-Progress status, Primary buttons
- **Jade** (`#3eb58a`): Completed / Done statuses, dates
- **Rose** (`#e05555`): Urgent priorities, errors/warnings
- **Sky** (`#5b9cf0`): Times, medium priorities
- **Violet** (`#9b74d4`): Durations, low priorities

---

## 3. Structural Primitives

### Borders & Dividers
Borders rarely use solid colors. Instead, they leverage low-opacity white to catch simulated "light" naturally over any surface depth.
- `--border`: `rgba(255, 255, 255, 0.055)`
- `--border-2`: `rgba(255, 255, 255, 0.09)`

### Radii / Corners
- `--r-sm` (`5px`): Internal buttons, command hints (`cmd+k`)
- `--r-md` (`9px`): Standard components, primary actions
- `--r-lg` (`14px`): Floating inputs, task buckets
- `--r-xl` (`20px`): Main auth cards, large modal windows

### Depth & Shadows
Shadows in the application are designed to push components "off the glass." They combine heavy black under-shadows with an immediate 1px white internal highlight.
- `--shadow-sm`: Used heavily on hovering over task cards for immediate pop.
- `--shadow-md`: Command palettes, floating contextual menus.
- `--shadow-lg`: Auth windows, main prominent overlays.

---

## 4. Nuances & Micro-Interactions

- **Grain Masking**: A fixed SVG fractional noise filter sits atop the generic app body pointer-events-none layer, breaking apart pixel uniformity.
- **The "Tilt" Animation (Fade Up)**: Dialogs, the central input, and sidebars utilize a 0.25s `fadeUp` entrance sequence that drops from `opacity: 0; transform: translateY(6px)` into view.
- **Fluid Checks**: Completing a task fills a circle through an SVG `stroke-dashoffset` path drawing animation, offering analog satisfaction when striking out a task. 
- **Color Transitions**: All background shifts (on button hovers, task card focuses) execute over a crisp `0.15s` timing threshold to feel snappy but not instaneous.
