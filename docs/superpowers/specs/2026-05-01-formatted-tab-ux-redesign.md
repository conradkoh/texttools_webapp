# Formatted Tab UX Redesign

**Date:** 2026-05-01  
**Status:** Approved

## Problem

The Formatted tab in the PDF Parser has too many states and too much text:
- 7 state types (`checking`, `idle`, `downloading`, `loading`, `ready`, `generating`, `done`, `error`)
- Cache check on mount causes a visible "Checking for cached model..." flash
- Two-step button flow (Download Model → Format to Markdown) feels disconnected
- Paragraphs of explanatory text clutter the UI

## Goal

Reduce to 4 clean states, collapse the flow into a single button action, and replace verbose text with symbols and short labels.

## Design

### Target State Machine

```
idle → busy → done
  ↑       ↓      ↓
  └─ error ←─────┘
```

Four states, all transitions triggered internally.

### State Details

**idle**
- Centered layout (same vertical position as busy/done to avoid layout shift)
- Large icon: `✦`
- Heading: "Format with AI"
- Single button: "? Format to Markdown"
- Below button, if model not cached: small pill `? ~1 GB` indicating one-time download
- If cached: no pill, just the button

**busy**
- Same centered layout as idle
- Progress bar (10px, blue gradient fill, no shimmer animation)
- Single short label below bar:
  - During download: "Downloading model... 42%"
  - From cache: "Loading model..."
  - During formatting: "Formatting..."
- The busy state covers all three sub-states (download, cache load, generation) — the user does not need to distinguish

**done**
- Full-height layout replacing the centered view
- Toolbar at top: [Copy Markdown] [Download .md] [Re-run] [New Parse]
- Rendered markdown content fills the remaining space
- No success message, no confirmation text

**error**
- Same centered layout as idle
- Red icon: `⚠`
- Short error message (truncated, no stack traces)
- "Try again" button — re-enters busy state

### Flow

1. User clicks Formatted tab → idle state renders
2. User clicks "? Format to Markdown"
3. Internally: check cache → load/ download model if needed → run formatting
4. User sees `busy` state with progress until `done` or `error`
5. Single click, single wait, single result

### What Goes Away

- `checking` state — cache check happens inside the button click, invisible to user
- `loading` / `downloading` split — both collapse into `busy`
- `ready` state — user never sees an intermediate "ready to format" stage
- All explanatory paragraphs about AI, local processing, privacy
- "SmolLM2-1.7B" model name in UI text

### Hook Changes (`useMarkdownFormatter`)

```typescript
interface FormatterState {
  status: 'idle' | 'busy' | 'done' | 'error';
  progress: number;      // 0-1
  progressLabel: string; // shown during busy
  result: string;
  error: string | null;
  cached: boolean;       // used only in idle to decide if pill shows
}
```

- Remove `useEffect` cache check on mount — cache is checked inside `formatText`
- `formatText(rawText)` becomes the single entry point:
  1. Set status to `busy`
  2. Check `hasModelInCache`, set `cached` internally
  3. Call `CreateMLCEngine` with progress callback
  4. Run inference (chunked if needed)
  5. Set `done` or `error`
- Remove `loadModel` as a public function — it's internal to `formatText`
- Keep `reset` and `dispose` for cleanup

### FormattedTab Changes

| Before | After |
|---|---|
| Multiple conditional blocks per status | Four clear branches: idle, busy, done, error |
| "? 1,050 MB" paragraph | "? ~1 GB" pill |
| "SmolLM2-1.7B" and "No data leaves your machine" prose | Removed |
| Separate Download / Format buttons | Single button always |
| `hasModelInCache` on mount | Inside button click |
| 198 lines | Targeting ~120 lines |

## Non-Goals

- Changing the raw text tab or upload flow
- Adding new formatting actions (summarize, translate)
- Changing the markdown renderer
- Mobile responsiveness
- Progressive enhancement for non-WebGPU browsers

## Files Changed

- `src/client/hooks/useMarkdownFormatter.ts` — state machine collapse, single entry point
- `src/client/components/templates/FormattedTab.tsx` — UI rewrite to match new states
