# Biblioteca de Componentes — Flat Modern Design

Implementaciones listas para usar. Copiar y adaptar al contexto.
Todos usan los tokens de `tokens.md`.

---

## Tabla de contenidos
1. [Navegación / Sidebar](#navegación)
2. [Cards de estadísticas](#stat-cards)
3. [Tabla de datos](#tabla)
4. [Formulario completo](#formulario)
5. [Modal](#modal)
6. [Empty state](#empty-state)
7. [Avatar + List item](#avatar-list)
8. [Tabs](#tabs)
9. [Dropdown menu](#dropdown)
10. [Toast / Alert](#toast)

---

## 1. Sidebar compacto (admin panel)

```jsx
// React — Sidebar de sistema administrativo
const Sidebar = ({ items, active, onSelect }) => (
  <aside style={{
    width: 220, minHeight: '100vh',
    background: '#fff',
    borderRight: '1px solid var(--border-default)',
    padding: '16px 0',
    display: 'flex', flexDirection: 'column', gap: 2,
    flexShrink: 0
  }}>
    {/* Logo */}
    <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border-default)', marginBottom: 8 }}>
      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Antigravity</span>
    </div>
    {/* Nav items */}
    {items.map(item => (
      <button key={item.id} onClick={() => onSelect(item.id)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 16px',
        margin: '0 8px',
        borderRadius: 'var(--radius-md)',
        background: active === item.id ? 'var(--action-primary-light)' : 'transparent',
        color: active === item.id ? 'var(--action-primary)' : 'var(--text-secondary)',
        fontWeight: active === item.id ? 500 : 400,
        fontSize: '0.875rem',
        border: 'none', cursor: 'pointer',
        transition: 'all 150ms ease',
        textAlign: 'left'
      }}>
        <span style={{ opacity: active === item.id ? 1 : 0.7 }}>{item.icon}</span>
        {item.label}
      </button>
    ))}
  </aside>
)
```

---

## 2. Stat cards (dashboard)

```jsx
const StatCard = ({ label, value, change, icon, color = 'blue' }) => {
  const colors = {
    blue: { bg: 'var(--blue-50)', text: 'var(--blue-600)' },
    green: { bg: 'var(--green-50)', text: 'var(--green-700)' },
    orange: { bg: 'var(--orange-50)', text: 'var(--orange-600)' },
    purple: { bg: 'var(--purple-50)', text: 'var(--purple-600)' }
  }
  const c = colors[color]
  const isPositive = change >= 0

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', padding: '16px',
      boxShadow: 'var(--shadow-xs)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        <div style={{ padding: 8, background: c.bg, borderRadius: 'var(--radius-md)', color: c.text }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      {change !== undefined && (
        <span style={{
          fontSize: '0.75rem', fontWeight: 500,
          color: isPositive ? 'var(--green-700)' : 'var(--red-600)',
          background: isPositive ? 'var(--green-50)' : 'var(--red-50)',
          padding: '2px 6px', borderRadius: 'var(--radius-full)'
        }}>
          {isPositive ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      )}
    </div>
  )
}
```

---

## 3. Tabla de datos con acciones

```jsx
const DataTable = ({ columns, rows, onAction }) => (
  <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>Registros</span>
      <input placeholder="Buscar..." style={{
        padding: '6px 10px', fontSize: '0.875rem',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)', outline: 'none',
        width: 180
      }} />
    </div>
    {/* Table */}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-subtle)' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '8px 16px', textAlign: 'left',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                borderBottom: '1px solid var(--border-default)'
              }}>{col.label}</th>
            ))}
            <th style={{ padding: '8px 16px', width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-default)', transition: 'background 150ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '10px 16px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {row[col.key]}
                </td>
              ))}
              <td style={{ padding: '10px 16px' }}>
                <button onClick={() => onAction(row)} style={{
                  fontSize: '0.8125rem', padding: '4px 10px',
                  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                  background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)'
                }}>···</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)
```

---

## 4. Modal compacto

```jsx
const Modal = ({ open, onClose, title, children, actions }) => {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--bg-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: 480,
        animation: 'scaleIn 150ms ease'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 'var(--radius-sm)' }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding: '16px 20px' }}>{children}</div>
        {/* Footer */}
        {actions && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border-default)' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 5. Empty state

```jsx
const EmptyState = ({ icon, title, description, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', textAlign: 'center'
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 'var(--radius-xl)',
      background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-tertiary)', marginBottom: 16, fontSize: 24
    }}>{icon}</div>
    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>{title}</h3>
    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 300, lineHeight: 1.5 }}>{description}</p>
    {action && action}
  </div>
)
```

---

## 6. Toast notification

```jsx
// Posicionar en: position fixed, bottom-right, z-index 60
const Toast = ({ type = 'default', message, onDismiss }) => {
  const types = {
    default: { bg: 'var(--gray-900)', color: '#fff', icon: 'ℹ' },
    success: { bg: 'var(--green-700)', color: '#fff', icon: '✓' },
    error:   { bg: 'var(--red-600)', color: '#fff', icon: '✕' },
    warning: { bg: 'var(--yellow-600)', color: '#fff', icon: '⚠' }
  }
  const t = types[type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: t.bg, color: t.color,
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      fontSize: '0.875rem', fontWeight: 500,
      minWidth: 280, maxWidth: 380,
      animation: 'fadeIn 200ms ease'
    }}>
      <span style={{ opacity: 0.9 }}>{t.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: 2 }}>✕</button>
    </div>
  )
}
```

---

## Responsive — mobile overrides

```css
/* Mobile: colapsar grids a 1 columna */
@media (max-width: 640px) {
  .grid-stats   { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
  .grid-main    { grid-template-columns: 1fr !important; }
  .sidebar      { display: none !important; }  /* usar drawer en mobile */
  .modal-inner  { max-width: 100% !important; border-radius: 16px 16px 0 0 !important; position: fixed !important; bottom: 0 !important; }
  .table-wrap   { font-size: 0.8125rem !important; }
  .card-padding { padding: 12px !important; }
  .hide-mobile  { display: none !important; }
  .btn-md       { min-height: 44px !important; } /* touch target */
}
```