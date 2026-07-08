# UI Stability Policies — Flat Modern Design

## 1. Design Tokens (Single Source of Truth)

All visual values live in `src/designTokens.css`. Tailwind consumes them via the `@theme` block in `src/index.css`.

**Colors:** Use token-mapped Tailwind classes only. NO arbitrary hex values (`bg-[#...]`, `text-[#...]`, `border-[#...]`).
- Primary: `bg-primary`, `text-primary`, `border-primary`
- Surfaces: `bg-surface-bg`, `bg-surface-card`, `bg-surface-sidebar`
- Borders: `border-border-default`, `border-border-strong`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- Semantic: `bg-success`, `text-warning`, `bg-error-light`, etc.

**Border Radius:**
- Badges/chips: `rounded-badge` (4px)
- Buttons/inputs: `rounded-btn` (6px)
- Cards/modals: `rounded-card` (6px)
- Circular exceptions: `rounded-full`

**Typography:** Use token sizes only — `text-xs` (11px), `text-sm` (12px), `text-base` (13px), `text-md` (14px), `text-lg` (16px), `text-xl` (18px). NO arbitrary sizes (`text-[13px]`).

## 2. Zero Shadows

`box-shadow: none` enforced globally. NO `shadow-*` Tailwind classes.
Use borders (`border-border-default`) for visual separation.

## 3. GPU Performance

- NO `backdrop-filter: blur()` combined with shadows on scrollable containers
- Use flat backgrounds with opacity (`bg-black/80`, `bg-white/95`) instead
- Animations must use GPU-accelerated properties only: `transform`, `opacity`
- No animating `width`, `height`, `margin`, `padding`, `top`, `left`

## 4. Base Components

Use the components in `src/components/ui/` for consistency:
- `<Button variant="primary|secondary|ghost" size="sm|md">`
- `<Card>` — standard container
- `<Badge status="authorized|registered|pending|rejected|draft|cancelled">`
- `<Input label="..." error="...">`
- `<Table>`, `<Table.Head>`, `<Table.Row>`, `<Table.Cell>`

## 5. React Performance

- Wrap catalog/list components in `React.memo`
- `useMemo()` for expensive computations
- `useCallback()` for function props
- Virtual lists for collections > 100 items
