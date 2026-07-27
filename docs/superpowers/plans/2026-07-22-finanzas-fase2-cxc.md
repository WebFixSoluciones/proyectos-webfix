# Fase 2: Cuentas por Cobrar (CxC) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir el módulo de Cuentas por Cobrar: seguimiento de facturas de venta a crédito, abonos parciales, aging de saldos, reportes rápidos y conexión automática con movimientos financieros.

**Architecture:** Firebase `fin_cxc` vinculada a `fin_movimientos` por `movimientoId`. Cada abono genera un movimiento de tipo ingreso en `fin_movimientos`. Vista con KPIs (cartera total, vencida, cobros), tabla con aging, filtros, y modal de abono reutilizando `MovimientoAbono`.

**Tech Stack:** React 19, Firebase Firestore, Tailwind CSS 4 (token-first), lucide-react.

## Global Constraints

- Zero shadows (Flat Modern Design)
- Token-first: usar clases del `@theme` block
- Radius: `rounded-card` (6px), `rounded-btn` (6px), `rounded-badge` (4px)
- No hardcoded hex, no `text-[Npx]`, no `backdrop-blur`
- Estados UI obligatorios: skeleton, empty, error, success
- Soft delete: anular, nunca borrar físicamente
- Toda operación registra auditoría en `fin_auditoria`

---

### Task 1: Crear `cxcService.js` (servicio CxC)

**Files:** Create: `src/services/cxcService.js`

**Interfaces:**
- Consumes: `registrarAuditoria` de `auditService.js`, `crearMovimiento` y `registrarAbono` de `movimientoService.js`
- Produces: `getCxC()`, `registrarCobro()`, `getAging()`, `getResumenCxC()`

- [ ] **Step 1: Crear el servicio**

```js
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';
import { crearMovimiento } from './movimientoService';

const COLLECTION = 'fin_cxc';

export async function getCxC(db, filtros = {}) {
  const constraints = [orderBy('factura.fecha', 'desc')];
  if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filtros.search) {
    const s = filtros.search.toLowerCase();
    items = items.filter(i => i.tercero?.nombre?.toLowerCase().includes(s) || i.tercero?.ruc?.includes(s) || i.factura?.numero?.toLowerCase().includes(s));
  }
  if (filtros.fechaDesde) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) >= new Date(filtros.fechaDesde));
  if (filtros.fechaHasta) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) <= new Date(filtros.fechaHasta + 'T23:59:59'));

  items.forEach(i => { i.diasVencido = i.factura?.fechaVencimiento ? Math.floor((Date.now() - new Date(i.factura.fechaVencimiento.toDate?.() || i.factura.fechaVencimiento).getTime()) / 86400000) : 0; });
  return items;
}

export async function registrarCobro(db, cxcId, abono, usuario) {
  const docRef = doc(db, COLLECTION, cxcId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Registro CxC no encontrado');
  const cxc = snap.data();

  const nuevoAbono = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), fecha: abono.fecha || new Date().toISOString(), monto: Number(abono.monto), metodoPago: abono.metodoPago || 'efectivo', referencia: abono.referencia || '' };
  const abonos = [...(cxc.abonos || []), nuevoAbono];
  const totalAbonado = abonos.reduce((s, p) => s + Number(p.monto), 0);
  const nuevoSaldo = Math.max(0, Number(cxc.factura?.montoTotal || cxc.saldoPendiente) - totalAbonado);
  const nuevoEstado = nuevoSaldo <= 0.01 ? 'pagado' : 'parcial';

  await updateDoc(docRef, { abonos, saldoPendiente: nuevoSaldo, estado: nuevoEstado, actualizadoEn: serverTimestamp() });

  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: cxcId, accion: 'abonar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { abono: nuevoAbono }, modulo: 'finanzas' });
  return { ...cxc, abonos, saldoPendiente: nuevoSaldo, estado: nuevoEstado };
}

export function getAging(items) {
  const ahora = Date.now();
  const aging = { '0-30': { count: 0, total: 0 }, '31-60': { count: 0, total: 0 }, '61-90': { count: 0, total: 0 }, '+90': { count: 0, total: 0 } };
  items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado').forEach(i => {
    const d = (i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento));
    const dias = Math.floor((ahora - d.getTime()) / 86400000);
    const bucket = dias <= 30 ? '0-30' : dias <= 60 ? '31-60' : dias <= 90 ? '61-90' : '+90';
    aging[bucket].count++; aging[bucket].total += Number(i.saldoPendiente) || 0;
  });
  return aging;
}

export function getResumenCxC(items) {
  const activos = items.filter(i => i.estado !== 'anulado');
  return {
    totalCartera: activos.reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalVencido: activos.filter(i => i.diasVencido > 0).reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalCobrado: activos.reduce((s, i) => s + ((i.abonos || []).reduce((a, b) => a + Number(b.monto), 0)), 0),
    totalFacturado: activos.reduce((s, i) => s + (Number(i.factura?.montoTotal) || 0), 0),
    conteo: activos.length,
  };
}
```

- [ ] **Step 2: Verificar build** `npm run build` → sin errores
- [ ] **Step 3: Commit** `feat: crear servicio CRUD de cuentas por cobrar con aging y resumen`

---

### Task 2: Crear `CuentasPorCobrarView.jsx`

**Files:** Create: `src/components/finances/CuentasPorCobrarView.jsx`

**Interfaces:** Consumes: `getCxC`, `registrarCobro`, `getAging`, `getResumenCxC` de `cxcService.js`. Importa `MovimientoAbono` de Task 4 Fase 1.

- [ ] **Step 1: Crear la vista principal**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, Wallet, TrendingUp, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { getCxC, getAging, registrarCobro, getResumenCxC } from '../../services/cxcService';
import MovimientoAbono from './MovimientoAbono';

const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  vencido: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  anulado: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
};

export default function CuentasPorCobrarView({ db, usuario, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ search: '', estado: 'all', fechaDesde: '', fechaHasta: '', aging: 'all' });
  const [showAbono, setShowAbono] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await getCxC(db, filtros); setItems(data); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const handleAbonoSave = () => { setShowAbono(null); cargar(); };

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const resumen = getResumenCxC(items);
  const aging = getAging(items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado'));

  if (loading) return <div className="space-y-4 animate-pulse"><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}</div>{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-sidebar rounded-card" />)}</div>;
  if (error) return <div className="text-center py-12"><div className="text-error text-lg mb-2">Error al cargar</div><p className="text-text-secondary text-sm mb-4">{error}</p><button onClick={cargar} className="px-4 py-2 bg-primary text-white rounded-btn text-sm">Reintentar</button></div>;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ label: 'Cartera Total', value: formatCurrency(resumen.totalCartera), icon: DollarSign, color: 'text-primary' },
          { label: 'Cartera Vencida', value: formatCurrency(resumen.totalVencido), icon: AlertTriangle, color: 'text-error' },
          { label: 'Cobros del Período', value: formatCurrency(resumen.totalCobrado), icon: TrendingUp, color: 'text-success' },
          { label: 'Documentos', value: resumen.conteo, icon: FileText, color: 'text-text-primary' }]
          .map((kpi, i) => (
            <div key={i} className="bg-surface-card border border-border-default rounded-card p-4">
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><kpi.icon size={14} className={kpi.color} />{kpi.label}</div>
              <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
        ))}
      </div>

      {/* Aging */}
      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1"><Clock size={14} /> Antigüedad de Saldos</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          {Object.entries(aging).map(([k, v]) => (
            <div key={k} className={`rounded-card p-2 ${k === '+90' ? 'bg-status-rejected-bg' : k === '61-90' ? 'bg-warning-light' : 'bg-surface-sidebar'}`}>
              <div className="text-xs text-text-secondary">{k} días</div>
              <div className="text-sm font-bold text-text-primary">{v.count}</div>
              <div className="text-xs text-text-secondary">{formatCurrency(v.total)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))} placeholder="Buscar cliente, RUC, documento..." className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" /></div>
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))} className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary"><option value="all">Todos</option><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option></select>
          <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))} className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))} className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <button onClick={() => { const h = ['Fecha','Cliente','RUC','Doc','Vence','Monto','Abonado','Saldo','Días Venc.','Estado']; const r = items.map(i => [formatDate(i.factura?.fecha), i.tercero?.nombre, i.tercero?.ruc, `${i.factura?.tipo} ${i.factura?.numero}`, formatDate(i.factura?.fechaVencimiento), Number(i.factura?.montoTotal).toFixed(2), (i.abonos||[]).reduce((s,p)=>s+Number(p.monto),0).toFixed(2), Number(i.saldoPendiente).toFixed(2), i.diasVencido, i.estado]); const csv = [h.join(','), ...r.map(r => r.map(c => `"${c}"`).join(','))].join('\n'); const b = new Blob([csv], {type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='cxc.csv'; a.click(); URL.revokeObjectURL(u); }} className="px-3 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light flex items-center gap-1"><Download size={14} /> CSV</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12"><FileText size={40} className="mx-auto text-text-muted mb-3" /><p className="text-text-secondary">No hay cuentas por cobrar registradas</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-sidebar border-b border-border-default"><th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Fecha</th><th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Cliente</th><th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Documento</th><th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden sm:table-cell">Vence</th><th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Monto</th><th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary hidden md:table-cell">Abonado</th><th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Saldo</th><th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary hidden sm:table-cell">Días</th><th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Estado</th><th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Acción</th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={`border-b border-border-default hover:bg-primary-light/30 transition-colors ${item.diasVencido > 90 ? 'bg-error-light/30' : ''}`}>
                    <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{formatDate(item.factura?.fecha)}</td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{item.tercero?.nombre}<br /><span className="text-text-muted">{item.tercero?.ruc}</span></td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{item.factura?.tipo}<br /><span className="text-text-muted">{item.factura?.numero}</span></td>
                    <td className="px-3 py-2.5 text-text-primary text-xs hidden sm:table-cell">{formatDate(item.factura?.fechaVencimiento)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-text-primary">{formatCurrency(item.factura?.montoTotal)}</td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell text-success">{formatCurrency((item.abonos || []).reduce((s, p) => s + Number(p.monto), 0))}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-warning">{formatCurrency(item.saldoPendiente)}</td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell"><span className={`text-xs font-medium ${item.diasVencido > 90 ? 'text-error' : item.diasVencido > 30 ? 'text-warning' : 'text-text-primary'}`}>{item.diasVencido > 0 ? item.diasVencido : '-'}</span></td>
                    <td className="px-3 py-2.5 text-center"><span className={`inline-flex px-1.5 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[item.estado] || ESTADO_BADGES.pendiente}`}>{item.estado}</span></td>
                    <td className="px-3 py-2.5"><div className="flex justify-end">{(item.estado === 'pendiente' || item.estado === 'parcial' || item.estado === 'vencido') && (<button onClick={() => setShowAbono(item)} title="Registrar cobro" className="btn-icon w-7 h-7"><Wallet size={14} /></button>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAbono && <MovimientoAbono movimiento={{ id: showAbono.movimientoId || showAbono.id, documento: showAbono.factura, tercero: showAbono.tercero, monto: showAbono.factura?.montoTotal, saldoPendiente: showAbono.saldoPendiente, pagos: showAbono.abonos || [] }} onClose={() => setShowAbono(null)} onSave={handleAbonoSave} db={db} usuario={usuario} showToast={showToast} abonoServiceCallback={async (abonoData) => { await registrarCobro(db, showAbono.id, abonoData, usuario); }} />}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build** `npm run build` → sin errores
- [ ] **Step 3: Commit** `feat: crear vista de cuentas por cobrar con aging, filtros y cobros`

---

### Task 3: Modificar `MovimientoAbono.jsx` para soportar callback externo

**Files:** Modify: `src/components/finances/MovimientoAbono.jsx:38-50`

- [ ] **Step 1: Hacer que MovimientoAbono acepte un `abonoServiceCallback` opcional**

Leer el archivo. En la función `handleSubmit` (alrededor de línea 38), encontrar:
```js
await registrarAbono(db, movimiento.id, { ... }, usuario);
```

Reemplazar el bloque try con:
```js
try {
  if (abonoServiceCallback) {
    await abonoServiceCallback({ monto: montoNumerico, metodoPago, referencia, fecha: new Date().toISOString() });
  } else {
    await registrarAbono(db, movimiento.id, { monto: montoNumerico, metodoPago, referencia, fecha: new Date().toISOString() }, usuario);
  }
  showToast('Abono registrado correctamente', 'success');
  onSave();
} catch (err) {
```

Agregar `abonoServiceCallback` a las props: `export default function MovimientoAbono({ movimiento, onClose, onSave, db, usuario, showToast, abonoServiceCallback })`.

- [ ] **Step 2: Verificar build** `npm run build` → sin errores
- [ ] **Step 3: Commit** `feat: permitir callback externo en MovimientoAbono para integracion con CxC`

---

### Task 4: Conectar CxC en `FinanceModule.jsx`

**Files:** Modify: `src/components/finances/FinanceModule.jsx`

- [ ] **Step 1: Agregar import y tab**

Leer FinanceModule.jsx. Agregar:
```jsx
import CuentasPorCobrarView from './CuentasPorCobrarView';
```

En el array de tabs (modo contabilidad), agregar después de 'movimientos':
```jsx
{ id: 'cxc', label: 'CxC', icon: TrendingUp },
```

En la sección de renderizado, agregar después del bloque movimientos:
```jsx
{activeTab === 'cxc' && <CuentasPorCobrarView db={db} usuario={usuario} showToast={showToast} />}
```

- [ ] **Step 2: Build + lint** → sin errores en nuevos archivos
- [ ] **Step 3: Commit** `feat: conectar cuentas por cobrar como pestaña en FinanceModule`

---

### Task 5: Build final y verificación

- [ ] **Step 1:** `npm run build` → exit 0
- [ ] **Step 2:** Lint de nuevos archivos → 0 errores
- [ ] **Step 3:** Commit final `feat: completar Fase 2 - modulo de cuentas por cobrar con aging y cobros`
