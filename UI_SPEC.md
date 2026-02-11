# RapidRoutes UI Overhaul — Source of Truth (UI_SPEC)

## Scope + Safety Rules (Non-Negotiable)
- UI/styling/layout changes only unless a phase explicitly says otherwise.
- DO NOT modify backend business logic, Supabase queries, canonical rules, archive flows, analytics logic, or database schema.
- DO NOT touch FloorSpaceCalculator.
- Any AI integration must be via server route using env var `GEMINI_API_KEY`. No client-side keys.

## Design Principles (Non-Negotiable)
- Cards MUST be visually distinct from background:
  - Card backgrounds: opacity 0.3–0.5 (never 0.1–0.2)
  - Borders: opacity 0.3–0.5 minimum
  - Add depth: shadows + subtle glows on major cards
- Full saturation colors. No washed-out palette.
- Text must be white/light gray (no dark gray as primary text).
- Consistency across pages: same background system, same tokens.

## Color Palette (Exact)
bgBase: #0a0e1a

primaryBlue: #3b82f6
primaryBlueLight: #60a5fa
primaryBlueDark: #2563eb

accentTeal: #14b8a6
accentTealLight: #2dd4bf
accentTealDark: #0d9488

successGreen: #10b981
successGreenLight: #34d399
warningAmber: #f59e0b
warningAmberLight: #fbbf24
dangerRed: #ef4444
dangerRedLight: #f87171

equipFlatbed: #f97316
equipVan: #8b5cf6
equipReefer: #0ea5e9

textPrimary: #ffffff
textSecondary: #e2e8f0
textMuted: #cbd5e1
textSubtle: #94a3b8
textDark: #64748b

cardDark: #1e293b
cardDarker: #0f172a

## Animated Background System (Required on all main pages)
3-layer structure:
- fixed base background (bgBase) z=0
- fixed animated radial gradient overlay z=1 (pointer-events none)
- content layer z=10

Animation: 45s smooth transform shift.

## Core Components (Tokens)
Implement as reusable classes/components in the repo’s existing styling system.

### Cards
Variants: card-blue, card-amber, card-teal, card-green, card-dark
- background gradient opacity 0.3–0.5
- border opacity 0.3–0.5
- shadow + glow
- hover: lift + stronger glow

### Buttons
btn-primary (blue gradient), btn-secondary (teal gradient), btn-outline, btn-icon

### Inputs
form-input, form-label, section-header

## Heatmap Visibility (Dashboard)
- Heatmap colors must be vivid like weather radar
- Opacity 0.8–1.0
- Boost saturation/brightness if library supports it

## AI Chat (Sales Resources)
- Ephemeral chat only: React state only; no persistence.
- Server route: /pages/api/ai/chat.js uses `process.env.GEMINI_API_KEY`
- Frontend calls /api/ai/chat

## Phases (Execution Order)
Phase 1 — Foundation ONLY
- Add PageWrapper (animated background) and apply to Dashboard/Lanes/SalesResources/Recap
- Add global tokens (colors, card/button/input system)
- No page restructuring beyond wrappers

Phase 2 — Dashboard Visual Alignment
- Apply tokens to dashboard UI + heatmap tuning
- No analytics logic changes

Phase 3 — Lanes UI
- Apply tokens and layout improvements
- Modal wrap for city selection reusing existing logic

Phase 4 — Sales Resources UI + Gemini proxy + chat UI
- Implement /api/ai/chat.js
- Build resource library UI with stub data (local files later)

Phase 5 — Recap UI polish
- Apply tokens; ensure archived lanes/CSV behavior remains unchanged

