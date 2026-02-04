# RapidRoutes Enterprise Design System

**Inspiration**: Clean enterprise UIs from cloud storage apps, HR dashboards, banking applications, and modern SaaS products

## Core Design Principles

1. **Information Density**: Show more data with less scrolling - compact but readable
2. **Professional Polish**: Shadows, borders, spacing that feels expensive
3. **Fast Workflow**: Keyboard shortcuts, instant feedback, no unnecessary clicks
4. **Visual Hierarchy**: Clear primary/secondary/tertiary levels
5. **Consistency**: Same patterns everywhere - predictable UX

---

## Color System

### Light Mode (Default)
```css
Backgrounds:
- Primary:   #ffffff (pure white)
- Secondary: #f8fafc (subtle gray)
- Tertiary:  #f1f5f9 (cards on cards)
- Elevated:  #ffffff + shadow (floating elements)

Text:
- Primary:   #0f172a (almost black, readable)
- Secondary: #475569 (labels, metadata)
- Tertiary:  #94a3b8 (hints, placeholders)

Borders:
- Default:   #e2e8f0 (subtle separation)
- Strong:    #cbd5e1 (emphasis)
- Subtle:    #f1f5f9 (barely there)

Accent Colors:
- Primary:   #0284c7 (professional blue)
- Success:   #16a34a (green for actions)
- Warning:   #ea580c (orange for caution)
- Danger:    #dc2626 (red for destructive)
```

### Dark Mode
```css
Backgrounds:
- Primary:   #0f172a (deep slate)
- Secondary: #1e293b (lighter slate)
- Tertiary:  #334155 (card backgrounds)
- Elevated:  #1e293b + shadow

Text:
- Primary:   #f1f5f9 (bright white-ish)
- Secondary: #cbd5e1 (readable gray)
- Tertiary:  #64748b (subtle metadata)

Borders:
- Default:   #334155 (visible but not harsh)
- Strong:    #475569 (clear separation)
- Subtle:    #1e293b (barely visible)

Accent Colors:
- Primary:   #0ea5e9 (lighter blue for dark bg)
- Success:   #22c55e (vibrant green)
- Warning:   #fb923c (warm orange)
- Danger:    #ef4444 (bright red)
```

---

## Typography Scale

```
Font Family: System UI Stack
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
'Oxygen', 'Ubuntu', 'Cantarell', 'Helvetica Neue', sans-serif

Sizes:
- 2xs:  0.625rem (10px) - Tiny labels
- xs:   0.75rem  (12px) - Metadata, timestamps
- sm:   0.875rem (14px) - Body text, forms
- base: 1rem     (16px) - Headings, buttons
- lg:   1.125rem (18px) - Page titles
- xl:   1.25rem  (20px) - Hero headings
- 2xl:  1.5rem   (24px) - Dashboard metrics

Weights:
- Regular: 400 (body text)
- Medium:  500 (labels, buttons)
- Semibold: 600 (headings, emphasis)
- Bold:    700 (rare, special emphasis)

Line Heights:
- Tight:  1.25 (headings)
- Normal: 1.5  (body text)
- Relaxed: 1.75 (long-form content)
```

---

## Spacing System

```
xs:  0.25rem (4px)  - Tight gaps
sm:  0.5rem  (8px)  - Small spacing
md:  1rem    (16px) - Standard spacing
lg:  1.5rem  (24px) - Section spacing
xl:  2rem    (32px) - Page margins
2xl: 3rem    (48px) - Major sections
```

---

## Component Library

### Cards
```jsx
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">
    Content goes here
  </div>
  <div className="card-footer">
    <button className="btn btn-primary">Action</button>
  </div>
</div>
```

**Visual Style**:
- White background (light) / Slate background (dark)
- 1px border with subtle color
- Small shadow on default, medium shadow on hover
- Rounded corners (8px)
- Smooth hover transition (200ms)

### Buttons
```jsx
// Primary Action
<button className="btn btn-primary">Save Lane</button>

// Secondary Action
<button className="btn btn-secondary">Cancel</button>

// Success Action
<button className="btn btn-success">Mark Posted</button>

// Danger Action
<button className="btn btn-danger">Delete</button>

// Sizes
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary">Default</button>
<button className="btn btn-primary btn-lg">Large</button>
```

**Visual Style**:
- Solid background with border
- Icon + text (optional icon)
- Shadow on hover
- Disabled state: 50% opacity
- Fast transition (150ms)

### Status Badges
```jsx
<span className="badge badge-pending">PENDING</span>
<span className="badge badge-active">ACTIVE</span>
<span className="badge badge-posted">POSTED</span>
<span className="badge badge-covered">COVERED</span>
```

**Visual Style**:
- Pill shape (fully rounded)
- Uppercase text, tight letter-spacing
- Small padding, compact
- Color-coded by status
- Semi-transparent background + solid text

### Tables (Compact)
```jsx
<table className="table-compact">
  <thead>
    <tr>
      <th>Reference</th>
      <th>Origin</th>
      <th>Destination</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>RR80331</td>
      <td>Atlanta, GA</td>
      <td>Chicago, IL</td>
      <td><span className="badge badge-active">ACTIVE</span></td>
      <td>
        <button className="btn btn-sm">Edit</button>
      </td>
    </tr>
  </tbody>
</table>
```

**Visual Style**:
- Sticky header (stays visible on scroll)
- Zebra striping optional
- Hover row highlight
- Sortable columns (click to sort)
- Compact padding (save vertical space)

### Forms
```jsx
<div>
  <label className="form-label">Origin City</label>
  <input 
    type="text" 
    className="form-input" 
    placeholder="Enter city name"
  />
</div>
```

**Visual Style**:
- Clean borders, not heavy
- Focus state: blue border + subtle shadow
- Placeholder text: tertiary color
- Error state: red border + red text
- Consistent height across all inputs

---

## Page Layouts

### Lanes Page (Redesigned)
```
┌────────────────────────────────────────────────┐
│ 🔍 Search lanes...        [+ New Lane] [CSV]  │
├────────────────────────────────────────────────┤
│ TABLE VIEW (Compact)                           │
│ ┌──────┬─────────────┬─────────────┬────────┐ │
│ │ REF  │ ORIGIN      │ DESTINATION │ STATUS │ │
│ ├──────┼─────────────┼─────────────┼────────┤ │
│ │ RR###│ City, ST    │ City, ST    │ ACTIVE │ │
│ │ RR###│ City, ST    │ City, ST    │ POSTED │ │
│ └──────┴─────────────┴─────────────┴────────┘ │
└────────────────────────────────────────────────┘

Right-click row: Quick context menu
- Edit Lane
- Select Cities
- View Recap
- Mark Posted
- Delete
```

### City Selection (Table View)
```
┌────────────────────────────────────────────────┐
│ Origin: Atlanta, GA → Destination: Chicago, IL │
├────────────────────────────────────────────────┤
│ PICKUP CITIES             │ DELIVERY CITIES    │
│ ☑ Atlanta, GA (ATL 15mi)  │ ☑ Chicago, IL      │
│ ☐ Marietta, GA (ATL 22mi) │ ☐ Naperville, IL   │
│ ☑ Live Oak, FL (FL_JAX)   │ ☑ Plainfield, IL   │
│ ...                       │ ...                │
│                           │                    │
│ Selected: 5 pickup × 13 delivery = 65 pairs    │
│                [Cancel]  [Save Selections]     │
└────────────────────────────────────────────────┘

Click column header to sort by:
- City name (A-Z)
- KMA code
- Distance (nearest first)
```

### Recap Page (Cards)
```
┌────────────────────────────────────────────────┐
│ 📋 Active Lane Postings (8)                    │
├────────────────────────────────────────────────┤
│ ╔════════════════════════════════════════════╗ │
│ ║ RR80331 | FD • 48ft | 45,000-45,750 lbs   ║ │
│ ║ Fitzgerald, GA → Clinton, SC      [POSTED] ║ │
│ ╠════════════════════════════════════════════╣ │
│ ║ ✅ Your Selected Cities                    ║ │
│ ║ (5 pickup × 5 delivery = 25 pairs)         ║ │
│ ║                                            ║ │
│ ║ PICKUP CITIES      │ DELIVERY CITIES       ║ │
│ ║ • Junction City, GA│ • Reed Creek, GA      ║ │
│ ║   KMA: AI_MON      │   KMA: GA_ATL         ║ │
│ ║                                            ║ │
│ ║ 📋 View All 25 Pairs with RR# ▼            ║ │
│ ╚════════════════════════════════════════════╝ │
└────────────────────────────────────────────────┘
```

---

## Animation & Transitions

### Micro-interactions
```css
- Button hover: 150ms ease
- Card hover: 200ms ease
- Page transitions: 300ms ease
- Modal fade-in: 200ms ease
- Toast notifications: 250ms ease
```

### Loading States
- Skeleton loaders (animated gradient)
- Spinner for actions (inline)
- Progress bar for bulk operations
- Optimistic updates (show immediately, rollback on error)

---

## Shadows (Elevation)

```css
Small (sm):    0 1px 2px rgba(0,0,0,0.05)
Medium (md):   0 4px 6px rgba(0,0,0,0.1)
Large (lg):    0 10px 15px rgba(0,0,0,0.1)
XLarge (xl):   0 20px 25px rgba(0,0,0,0.1)

Usage:
- sm: Input fields, small cards
- md: Default cards, dropdown menus
- lg: Modals, floating panels
- xl: Overlays, important dialogs
```

---

## Border Radius

```css
Small (sm):  4px  - Badges, small buttons
Medium (md): 6px  - Inputs, default buttons
Large (lg):  8px  - Cards, panels
XLarge (xl): 12px - Modal dialogs
Full:        9999px - Pills, avatars
```

---

## Iconography

**Icon Library**: Lucide Icons (or Heroicons)
- 16px: Inline with text
- 20px: Buttons, navigation
- 24px: Page headers
- 32px: Empty states

**Style**: Outline icons (not filled) for consistency

---

## Keyboard Shortcuts

```
Navigation:
⌘/Ctrl + Shift + H  →  Dashboard
⌘/Ctrl + Shift + L  →  Lanes
⌘/Ctrl + Shift + R  →  Recap
⌘/Ctrl + Shift + N  →  New Lane

Actions:
Enter               →  Submit form
Esc                 →  Close modal/cancel
⌘/Ctrl + S          →  Save
⌘/Ctrl + K          →  Search/Command palette

Appearance:
⌘/Ctrl + Shift + L  →  Toggle dark/light mode

Help:
?                   →  Show keyboard shortcuts
```

---

## Responsive Breakpoints

```css
Mobile:  < 640px   (stack everything)
Tablet:  640-1024px (2-column layouts)
Desktop: > 1024px  (3+ columns, side-by-side)
Wide:    > 1536px  (max content width 1600px)
```

---

## Example: Professional Lane Card

```jsx
<div className="card">
  <div className="card-header" style={{ 
    display: 'flex', 
    justifyContent: 'space-between',
    alignItems: 'center' 
  }}>
    <div>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
        Atlanta, GA → Chicago, IL
      </h3>
      <div style={{ 
        fontSize: '0.75rem', 
        color: 'var(--color-text-secondary)',
        marginTop: '0.25rem'
      }}>
        FD • 48ft • 45,000 lbs • Pickup: 2025-10-03
      </div>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <span className="badge badge-active">ACTIVE</span>
      <span style={{
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        color: 'var(--color-success)'
      }}>
        RR80331
      </span>
    </div>
  </div>
  
  <div className="card-body">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{ 
          fontSize: '0.75rem', 
          fontWeight: 600, 
          color: 'var(--color-text-secondary)',
          marginBottom: '0.5rem'
        }}>
          PICKUP CITIES (5)
        </div>
        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div>• Atlanta, GA <span style={{ color: 'var(--color-primary)' }}>KMA: ATL</span></div>
          <div>• Marietta, GA <span style={{ color: 'var(--color-primary)' }}>KMA: ATL</span></div>
          ...
        </div>
      </div>
      <div>
        <div style={{ 
          fontSize: '0.75rem', 
          fontWeight: 600, 
          color: 'var(--color-text-secondary)',
          marginBottom: '0.5rem'
        }}>
          DELIVERY CITIES (13)
        </div>
        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div>• Chicago, IL <span style={{ color: 'var(--color-warning)' }}>KMA: CHI</span></div>
          <div>• Naperville, IL <span style={{ color: 'var(--color-warning)' }}>KMA: CHI</span></div>
          ...
        </div>
      </div>
    </div>
  </div>
  
  <div className="card-footer" style={{ 
    display: 'flex', 
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
      5 pickup × 13 delivery = 65 total pairs
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button className="btn btn-sm btn-secondary">Edit</button>
      <button className="btn btn-sm btn-primary">View Recap</button>
      <button className="btn btn-sm btn-success">Mark Posted</button>
    </div>
  </div>
</div>
```

---

## Weekend Implementation Plan

### Saturday Morning (Forms & Entry)
1. Redesign lane entry form (compact, 2-column)
2. Add inline validation
3. Professional date pickers
4. Equipment dropdown with icons

### Saturday Afternoon (Tables & Lists)
1. Convert lanes list to sortable table
2. Add context menus (right-click)
3. Bulk actions (select multiple lanes)
4. Quick filters (status, equipment, date range)

### Sunday Morning (City Selection)
1. Table view for city selection (sortable)
2. Checkboxes with KMA/miles in line
3. Live pair count calculation
4. "Select All KMA" quick action

### Sunday Afternoon (Polish)
1. Apply theme to all pages
2. Add loading skeletons
3. Smooth page transitions
4. Test keyboard shortcuts
5. Mobile responsiveness check

---

## Success Metrics

✅ Professional appearance (looks enterprise-grade)
✅ Fast workflow (fewer clicks, more keyboard)
✅ Information density (see more without scrolling)
✅ Consistent patterns (predictable UX)
✅ Accessible (keyboard nav, proper labels)
✅ Performant (smooth animations, instant feedback)

**Goal**: RapidRoutes looks and feels like a $50K/year SaaS product, not a side project.
