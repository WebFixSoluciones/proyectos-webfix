# Design Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the entire UI to Flat Modern Design using a Token-First approach — new blue professional palette, zero shadows, minimal border-radius (4-6px), and reusable UI components.

**Architecture:** CSS variables in `designTokens.css` are the single source of truth. The `@theme` block in `index.css` maps them to Tailwind utilities. Five base UI components (`Button`, `Card`, `Badge`, `Input`, `Table`) enforce the design system. All files migrate from hardcoded values to tokens.

**Tech Stack:** React 19, Vite, Tailwind CSS 4 (via `@tailwindcss/postcss`), CSS custom properties.

## Global Constraints

- Zero `box-shadow` anywhere — depth only via borders
- No `backdrop-filter` on scrollable containers
- No arbitrary hex values in Tailwind (`bg-[#...]`, `text-[#...]`) — use token-mapped classes
- All border-radius via tokens: `--radius-sm` (4px), `--radius-md` (6px), `--radius-lg` (6px)
- All font sizes via tokens: `--text-xs` through `--text-xl`
- Animations only use `transform` and `opacity` (GPU-safe)
- Primary color: `#2563EB` (blue professional)

---

### Task 1: Update Design Tokens

**Files:**
- Modify: `src/designTokens.css`

**Produces:**
- All CSS custom properties consumed by Tasks 2-8

- [ ] **Step 1: Replace the entire `:root` block in `src/designTokens.css`**

Replace the full contents of `src/designTokens.css` with:

```css
:root {
  /* Primary */
  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --primary-light: #EFF6FF;
  --primary-muted: #DBEAFE;

  /* Surfaces */
  --surface-bg: #F8FAFC;
  --surface-card: #FFFFFF;
  --surface-sidebar: #F1F5F9;

  /* Borders */
  --border-default: #E2E8F0;
  --border-strong: #CBD5E1;

  /* Text */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;

  /* Semantic */
  --success: #16A34A;
  --success-light: #F0FDF4;
  --warning: #D97706;
  --warning-light: #FFFBEB;
  --error: #DC2626;
  --error-light: #FEF2F2;
  --info: #2563EB;
  --info-light: #EFF6FF;

  /* Status badges */
  --status-authorized-bg: var(--success-light);
  --status-authorized-text: var(--success);
  --status-authorized-border: #BBF7D0;
  --status-registered-bg: var(--info-light);
  --status-registered-text: var(--primary);
  --status-registered-border: var(--primary-muted);
  --status-pending-bg: var(--warning-light);
  --status-pending-text: var(--warning);
  --status-pending-border: #FDE68A;
  --status-rejected-bg: var(--error-light);
  --status-rejected-text: var(--error);
  --status-rejected-border: #FECACA;
  --status-draft-bg: var(--surface-sidebar);
  --status-draft-text: var(--text-secondary);
  --status-draft-border: var(--border-default);
  --status-cancelled-bg: var(--surface-sidebar);
  --status-cancelled-text: var(--text-muted);
  --status-cancelled-border: var(--border-default);

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 6px;

  /* Typography */
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Legacy aliases (consumed by existing utility classes until fully migrated) */
  --primary-color: var(--primary);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-light: var(--primary-light);
  --color-primary-text: #FFFFFF;
  --stripe-text-primary: var(--text-primary);
  --stripe-text-secondary: var(--text-secondary);
  --stripe-text-tertiary: var(--text-secondary);
  --stripe-border: var(--border-default);
  --stripe-border-light: var(--border-default);
  --stripe-bg: var(--surface-bg);
  --stripe-surface: var(--surface-card);
  --radius-card: var(--radius-lg);
  --radius-button: var(--radius-md);
  --radius-input: var(--radius-md);
  --radius-badge: var(--radius-sm);
}
```

- [ ] **Step 2: Verify the app still loads**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build completes with no errors (warnings about unused vars are OK).

- [ ] **Step 3: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add src/designTokens.css
git commit -m "feat: update design tokens to blue professional palette"
```

---

### Task 2: Update Tailwind Theme Mapping and Global Styles

**Files:**
- Modify: `src/index.css`

**Consumes:** CSS variables from Task 1
**Produces:** Tailwind utility classes (`bg-primary`, `text-secondary`, `border-default`, `rounded-card`, etc.) consumed by Tasks 3-8

- [ ] **Step 1: Replace the `@theme` block in `src/index.css`**

Find the existing `@theme { ... }` block and replace it entirely with:

```css
@theme {
  /* Colors */
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-light: var(--primary-light);
  --color-primary-muted: var(--primary-muted);
  --color-surface-bg: var(--surface-bg);
  --color-surface-card: var(--surface-card);
  --color-surface-sidebar: var(--surface-sidebar);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-success: var(--success);
  --color-success-light: var(--success-light);
  --color-warning: var(--warning);
  --color-warning-light: var(--warning-light);
  --color-error: var(--error);
  --color-error-light: var(--error-light);
  --color-info: var(--info);
  --color-info-light: var(--info-light);

  /* Status badge colors */
  --color-status-authorized-bg: var(--status-authorized-bg);
  --color-status-authorized-text: var(--status-authorized-text);
  --color-status-authorized-border: var(--status-authorized-border);
  --color-status-registered-bg: var(--status-registered-bg);
  --color-status-registered-text: var(--status-registered-text);
  --color-status-registered-border: var(--status-registered-border);
  --color-status-pending-bg: var(--status-pending-bg);
  --color-status-pending-text: var(--status-pending-text);
  --color-status-pending-border: var(--status-pending-border);
  --color-status-rejected-bg: var(--status-rejected-bg);
  --color-status-rejected-text: var(--status-rejected-text);
  --color-status-rejected-border: var(--status-rejected-border);
  --color-status-draft-bg: var(--status-draft-bg);
  --color-status-draft-text: var(--status-draft-text);
  --color-status-draft-border: var(--status-draft-border);
  --color-status-cancelled-bg: var(--status-cancelled-bg);
  --color-status-cancelled-text: var(--status-cancelled-text);
  --color-status-cancelled-border: var(--status-cancelled-border);

  /* Border radius */
  --radius-card: var(--radius-lg);
  --radius-btn: var(--radius-md);
  --radius-badge: var(--radius-sm);
  --radius-input: var(--radius-md);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);

  /* Typography */
  --text-xs: var(--text-xs);
  --text-sm: var(--text-sm);
  --text-base: var(--text-base);
  --text-md: var(--text-md);
  --text-lg: var(--text-lg);
  --text-xl: var(--text-xl);
  --font-weight-normal: var(--font-weight-normal);
  --font-weight-medium: var(--font-weight-medium);
  --font-weight-semibold: var(--font-weight-semibold);
  --font-weight-bold: var(--font-weight-bold);

  /* Spacing */
  --spacing-1: var(--space-1);
  --spacing-2: var(--space-2);
  --spacing-3: var(--space-3);
  --spacing-4: var(--space-4);
  --spacing-5: var(--space-5);
  --spacing-6: var(--space-6);
  --spacing-8: var(--space-8);

  /* Font */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 2: Update global utility classes**

In the same file, find and update the following utility classes to use the new tokens:

1. Update `.btn-primary` background from `var(--primary-color)` to `var(--primary)`, hover to `var(--primary-hover)`.
2. Update `.card-std` to use `border-color: var(--border-default)`, `border-radius: var(--radius-lg)`, remove any `box-shadow`.
3. Update `input` styles: border to `var(--border-default)`, focus border to `var(--primary)`, border-radius to `var(--radius-md)`.
4. Update `.badge-status` to use `border-radius: var(--radius-sm)`, `font-size: var(--text-xs)`.
5. Update `.surface-card` to use `background: var(--surface-card)`, `border-color: var(--border-default)`.
6. Remove all `box-shadow` declarations from utility classes. Keep `--shadow-card`, `--shadow-modal`, `--shadow-dropdown` variable definitions removed (already gone from Task 1).
7. Remove the `--color-gray-*` custom values from the old `@theme` block (they are replaced by the semantic tokens).

- [ ] **Step 3: Verify build**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add src/index.css
git commit -m "feat: update Tailwind theme mapping to new design tokens"
```

---

### Task 3: Create Base UI Components

**Files:**
- Create: `src/components/ui/Button.jsx`
- Create: `src/components/ui/Card.jsx`
- Create: `src/components/ui/Badge.jsx`
- Create: `src/components/ui/Input.jsx`
- Create: `src/components/ui/Table.jsx`
- Create: `src/components/ui/index.js`

**Consumes:** Tailwind classes from Task 2
**Produces:** `<Button>`, `<Card>`, `<Badge>`, `<Input>`, `<Table>` components consumed by Tasks 4-8

- [ ] **Step 1: Create `src/components/ui/Button.jsx`**

```jsx
const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-transparent text-text-primary border border-border-default hover:bg-primary-light',
  ghost: 'bg-transparent text-primary hover:bg-primary-light',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function Button({ variant = 'primary', size = 'md', disabled, className = '', children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-btn transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/Card.jsx`**

```jsx
export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`bg-surface-card border border-border-default rounded-card p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/Badge.jsx`**

```jsx
const statusStyles = {
  authorized: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  registered: 'bg-status-registered-bg text-status-registered-text border-status-registered-border',
  pending: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  rejected: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  draft: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled-text border-status-cancelled-border',
};

export default function Badge({ status = 'draft', className = '', children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-badge ${statusStyles[status] || statusStyles.draft} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/Input.jsx`**

```jsx
export default function Input({ label, error, className = '', ...rest }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-base bg-white border rounded-input text-text-primary placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 ${error ? 'border-error' : 'border-border-default'} ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/ui/Table.jsx`**

```jsx
function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-sm text-left ${className}`}>{children}</table>
    </div>
  );
}

function Head({ children, className = '' }) {
  return (
    <thead className={`bg-surface-sidebar text-text-secondary text-xs uppercase tracking-wider ${className}`}>
      {children}
    </thead>
  );
}

function Row({ children, className = '', ...rest }) {
  return (
    <tr className={`border-b border-border-default hover:bg-primary-light transition-colors duration-100 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

function Cell({ children, header, className = '', ...rest }) {
  const Tag = header ? 'th' : 'td';
  return (
    <Tag className={`px-3 py-2.5 ${header ? 'font-medium' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

Table.Head = Head;
Table.Row = Row;
Table.Cell = Cell;

export default Table;
```

- [ ] **Step 6: Create barrel export `src/components/ui/index.js`**

```js
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Badge } from './Badge';
export { default as Input } from './Input';
export { default as Table } from './Table';
```

- [ ] **Step 7: Verify build**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build succeeds. Components are tree-shaken if unused.

- [ ] **Step 8: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add src/components/ui/
git commit -m "feat: create base UI components (Button, Card, Badge, Input, Table)"
```

---

### Task 4: Migrate Sidebar

**Files:**
- Modify: `src/components/Sidebar.jsx`

**Consumes:** Tailwind classes from Task 2

This is the highest-violation file (~15 hardcoded colors, 10+ arbitrary font sizes, 2 `color-mix()` calls).

- [ ] **Step 1: Replace all hardcoded color classes**

Apply these replacements throughout `Sidebar.jsx`:

| Find | Replace with |
|------|-------------|
| `bg-[#F6F9FC]` | `bg-surface-bg` |
| `text-[#0A2540]` | `text-text-primary` |
| `text-[#333333]` | `text-text-secondary` |
| `text-[#1a1a1a]` | `text-text-primary` |
| `text-[#425466]` | `text-text-secondary` |
| `text-[#CD2B31]` | `text-error` |
| `border-[#E6EBF1]` | `border-border-default` |
| `bg-[#F2F4F7]` | `bg-surface-sidebar` |
| `text-[var(--primary-color)]` | `text-primary` |
| `bg-[var(--primary-color)]` | `bg-primary` |
| `bg-[color-mix(in_srgb,var(--primary-color)_8%,transparent)]` | `bg-primary-light` |
| `bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]` | `bg-primary-light` |

- [ ] **Step 2: Replace arbitrary font sizes**

| Find | Replace with |
|------|-------------|
| `text-[10px]` | `text-xs` |
| `text-[11px]` | `text-xs` |
| `text-[12px]` | `text-sm` |
| `text-[13px]` | `text-base` |
| `text-[14px]` | `text-md` |

- [ ] **Step 3: Verify build and visual check**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build succeeds. Open the app and verify the sidebar renders with the new blue palette, correct text sizes, and no visual regressions in navigation.

- [ ] **Step 4: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add src/components/Sidebar.jsx
git commit -m "refactor: migrate Sidebar to design tokens"
```

---

### Task 5: Migrate Login and Register Pages

**Files:**
- Modify: `src/pages/LoginPage.jsx`
- Modify: `src/pages/RegisterPage.jsx`

**Consumes:** Tailwind classes from Task 2

- [ ] **Step 1: Migrate `LoginPage.jsx` colors**

Apply these replacements:

| Find | Replace with |
|------|-------------|
| `bg-[#fafafa]` | `bg-surface-bg` |
| `bg-[#f8fafc]` | `bg-surface-bg` |
| `from-[#1C40F2]` | `from-primary` |
| `to-[#6366f1]` | `to-primary-hover` |
| `from-[#1C40F2]/10` | `from-primary/10` |
| `to-[#a855f7]/10` | `to-primary-muted` |
| `bg-[#1C40F2]` | `bg-primary` |
| `hover:bg-[#1633c1]` | `hover:bg-primary-hover` |
| `focus:border-[#1C40F2]` | `focus:border-primary` |
| `focus:ring-[#1C40F2]/20` | `focus:ring-primary/20` |

- [ ] **Step 2: Migrate `LoginPage.jsx` radius and shadows**

| Find | Replace with |
|------|-------------|
| `rounded-[10px]` | `rounded-btn` |
| `hover:shadow-[0_0_20px_rgba(28,64,242,0.25)]` | _(remove entirely)_ |
| `shadow-xl shadow-blue-500/20` | _(remove entirely)_ |

- [ ] **Step 3: Migrate `LoginPage.jsx` font sizes**

| Find | Replace with |
|------|-------------|
| `text-[18px]` | `text-xl` |
| `text-[12px]` | `text-sm` |

- [ ] **Step 4: Migrate `RegisterPage.jsx`**

Apply the same color, radius, shadow, and font-size replacements as LoginPage. The register page follows the same visual structure.

- [ ] **Step 5: Verify build**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build succeeds. Login and Register pages render with blue palette, flat design, no shadows.

- [ ] **Step 6: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add src/pages/LoginPage.jsx src/pages/RegisterPage.jsx
git commit -m "refactor: migrate Login and Register pages to design tokens"
```

---

### Task 6: Migrate Dashboard Components

**Files:**
- Modify: `src/components/dashboard/ErpDashboard.jsx`
- Modify: `src/components/dashboard/GeneralSettings.jsx`
- Modify: `src/components/dashboard/HiringServicesModule.jsx`
- Modify: `src/components/dashboard/SupportModule.jsx`

**Consumes:** Tailwind classes from Task 2, `<Card>` from Task 3

- [ ] **Step 1: Migrate `ErpDashboard.jsx`**

This is the second-highest violation file. Apply these changes:

**Colors:**
| Find | Replace with |
|------|-------------|
| `text-[var(--primary-color)]` | `text-primary` |
| `bg-[#1a1a1a]/40` | `bg-text-primary/40` |
| `border-white/[0.08]` | `border-white/10` |
| `bg-white/[0.08]` | `bg-white/10` |

**Shadows (remove all):**
| Find | Replace with |
|------|-------------|
| `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` | _(remove)_ |
| `shadow-[0_0_8px_rgba(59,130,246,0.5)]` | _(remove)_ |
| `shadow-[0_4px_20px_rgba(239,68,68,0.08)]` | _(remove)_ |
| `shadow-[0_4px_20px_rgba(249,115,22,0.08)]` | _(remove)_ |
| `shadow-md` | _(remove)_ |
| `shadow-sm` | _(remove)_ |
| `hover:shadow-*` | _(remove)_ |

**Border radius:**
| Find | Replace with |
|------|-------------|
| `rounded-2xl` | `rounded-card` |
| `rounded-3xl` | `rounded-card` |
| `rounded-[10px]` | `rounded-card` |

**Font sizes:**
| Find | Replace with |
|------|-------------|
| `text-[10px]` | `text-xs` |
| `text-[11px]` | `text-xs` |
| `text-[13px]` | `text-base` |
| `text-[14px]` | `text-md` |

**Backdrop:**
| Find | Replace with |
|------|-------------|
| `backdrop-blur-md` | _(remove)_ |

- [ ] **Step 2: Migrate `GeneralSettings.jsx`**

Apply color replacements:
| Find | Replace with |
|------|-------------|
| `bg-[#1a1a1a]` | `bg-text-primary` |
| `bg-[#151517]` | `bg-text-primary` |
| `bg-[#F6F9FC]` | `bg-surface-bg` |
| `shadow-2xl` | _(remove)_ |
| `rounded-2xl` | `rounded-card` |

- [ ] **Step 3: Migrate `HiringServicesModule.jsx`**

Apply same replacement patterns: hardcoded colors to tokens, arbitrary radius to `rounded-card`, remove shadows.

- [ ] **Step 4: Migrate `SupportModule.jsx`**

Apply same replacement patterns.

- [ ] **Step 5: Verify build**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add src/components/dashboard/
git commit -m "refactor: migrate dashboard components to design tokens"
```

---

### Task 7: Migrate Finance Components, Inventory, and Remaining Pages

**Files:**
- Modify: `src/components/finances/*.jsx` (~13 files)
- Modify: `src/components/inventory/*.tsx` (~5 files)
- Modify: `src/components/common/IconRenderer.jsx`
- Modify: `src/pages/SuperAdminPage.jsx`
- Modify: `src/pages/BillingPortal.jsx`
- Modify: `src/pages/PublicRideView.jsx`
- Modify: `src/pages/Landing*.jsx` (~6 files)
- Modify: `src/constants/appData.js`

**Consumes:** Tailwind classes from Task 2

This is a bulk migration task. Apply the same patterns from Tasks 4-6 systematically to every remaining file.

- [ ] **Step 1: Migrate Finance components**

For each file in `src/components/finances/`:

1. Replace all `bg-[#...]` with the closest semantic token class (`bg-surface-bg`, `bg-surface-card`, `bg-primary`, `bg-success-light`, etc.)
2. Replace all `text-[#...]` with semantic token classes (`text-text-primary`, `text-text-secondary`, `text-error`, etc.)
3. Replace all `border-[#...]` with `border-border-default` or `border-border-strong`
4. Replace all `rounded-2xl`, `rounded-3xl`, `rounded-[Xpx]` with `rounded-card`
5. Remove all `shadow-*` classes
6. Replace all `text-[Npx]` with the closest token size
7. Replace hardcoded status badge markup (e.g., `bg-[#E6FAF0] text-[#0E6245]`) with token classes (`bg-status-authorized-bg text-status-authorized-text`)

Key files with known violations:
- `FinanceDashboard.jsx`: `shadow-[0_4px_20px...]`, `backdrop-blur-xl`, `rounded-2xl`
- `ComprasSriView.jsx`: Hardcoded status badge colors
- `ComprasGastosView.jsx`: Hardcoded hex colors
- `AccountsReceivablePayable.jsx`: Hardcoded background colors

- [ ] **Step 2: Migrate Inventory components**

For each `.tsx` file in `src/components/inventory/`:
Apply the same 7-step pattern from Step 1. These files may also have TypeScript type annotations — preserve them.

- [ ] **Step 3: Migrate `IconRenderer.jsx`**

Check for hardcoded colors or arbitrary values and replace with tokens.

- [ ] **Step 4: Migrate remaining pages**

For `SuperAdminPage.jsx`, `BillingPortal.jsx`, `PublicRideView.jsx`:
Apply the same 7-step pattern.

- [ ] **Step 5: Migrate Landing pages**

For all `Landing*.jsx` files:
1. Replace `rounded-2xl` with `rounded-card`
2. Replace hardcoded colors with tokens
3. Remove shadows
4. Replace arbitrary font sizes
5. The landing pages use `.landing-card`, `.landing-button-primary` CSS classes — update those classes in `index.css` to use the new tokens (background `var(--primary)`, border-radius `var(--radius-md)`, no shadow).

- [ ] **Step 6: Update Kanban colors in `appData.js`**

In `src/constants/appData.js`, update `COLUMN_COLORS`:
- Remove all `dark:` variants (no dark mode)
- Replace `bg-[#1a1a1a]/40` with `bg-text-primary/40`
- Replace `border-white/[0.08]` with `border-border-default`
- Keep standard Tailwind color classes (`bg-blue-50/70`, `bg-green-50/70`, etc.) since these are semantic Kanban column colors, not design-system violations

- [ ] **Step 7: Verify build**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add src/components/finances/ src/components/inventory/ src/components/common/ src/pages/ src/constants/appData.js
git commit -m "refactor: migrate all remaining components and pages to design tokens"
```

---

### Task 8: Update Policies and Validate

**Files:**
- Modify: `ui_stability_policies.md`

**Consumes:** All prior tasks completed

- [ ] **Step 1: Update `ui_stability_policies.md`**

Replace the full content with:

```markdown
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
```

- [ ] **Step 2: Run violation scan**

Run these commands to verify no violations remain:

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"

echo "=== Hardcoded hex colors ==="
grep -rn 'bg-\[#\|text-\[#\|border-\[#' src/components/ src/pages/ --include="*.jsx" --include="*.tsx" | grep -v node_modules || echo "NONE FOUND ✓"

echo "=== Shadow classes ==="
grep -rn 'shadow-' src/components/ src/pages/ --include="*.jsx" --include="*.tsx" | grep -v node_modules | grep -v 'shadow-none' || echo "NONE FOUND ✓"

echo "=== Arbitrary border-radius ==="
grep -rn 'rounded-\[' src/components/ src/pages/ --include="*.jsx" --include="*.tsx" | grep -v node_modules || echo "NONE FOUND ✓"

echo "=== Arbitrary font sizes ==="
grep -rn 'text-\[[0-9]' src/components/ src/pages/ --include="*.jsx" --include="*.tsx" | grep -v node_modules || echo "NONE FOUND ✓"

echo "=== Backdrop blur ==="
grep -rn 'backdrop-blur' src/components/ src/pages/ --include="*.jsx" --include="*.tsx" | grep -v node_modules || echo "NONE FOUND ✓"
```

Expected: All checks return "NONE FOUND ✓". If violations remain, go back and fix them.

- [ ] **Step 3: Final build**

Run: `cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix" && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "/e/CLOUD WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix"
git add ui_stability_policies.md
git commit -m "docs: update UI stability policies for Flat Modern Design system"
```
