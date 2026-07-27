# Fase 3: Cuentas por Pagar (CxP) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir el módulo de Cuentas por Pagar: seguimiento de facturas de compra a crédito, abonos parciales, retenciones (fuente + IVA), aging de saldos, y conexión automática con Compras.

**Architecture:** Firebase `fin_cxp` vinculada a `fin_movimientos` por `movimientoId`. Cada abono genera un movimiento de tipo egreso en `fin_movimientos`. Similar a CxC pero con campos de retención (fuente + IVA) y base imponible.

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

### Task 1: Crear `cxpService.js` (servicio CxP)

**Files:** Create: `src/services/cxpService.js`

**Interfaces:**
- Consumes: `registrarAuditoria` de `auditService.js`, `crearMovimiento` y `registrarAbono` de `movimientoService.js`
- Produces: `getCxP()`, `registrarPago()`, `getAging()`, `getResumenCxP()`

- [ ] **Step 1: Crear el servicio**

```js
import { collection, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';
import { crearMovimiento } from './movimientoService';

const COLLECTION = 'fin_cxp';

export async function getCxP(db, filtros = {}) {
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

export async function registrarPago(db, cxpId, abono, usuario) {
  const docRef = doc(db, COLLECTION, cxpId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Registro CxP no encontrado');
  const cxp = snap.data();

  const nuevoAbono = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), fecha: abono.fecha || new Date().toISOString(), monto: Number(abono.monto), metodoPago: abono.metodoPago || 'efectivo', referencia: abono.referencia || '' };
  const abonos = [...(cxp.abonos || []), nuevoAbono];
  const totalAbonado = abonos.reduce((s, p) => s + Number(p.monto), 0);
  const nuevoSaldo = Math.max(0, Number(cxp.factura?.montoTotal || cxp.saldoPendiente) - totalAbonado);
  const nuevoEstado = nuevoSaldo <= 0.01 ? 'pagado' : 'parcial';

  await updateDoc(docRef, { abonos, saldoPendiente: nuevoSaldo, estado: nuevoEstado, actualizadoEn: serverTimestamp() });
  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: cxpId, accion: 'abonar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { abono: nuevoAbono }, modulo: 'finanzas' });
  return { ...cxp, abonos, saldoPendiente: nuevoSaldo, estado: nuevoEstado };
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

export function getResumenCxP(items) {
  const activos = items.filter(i => i.estado !== 'anulado');
  return {
    totalObligaciones: activos.reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalVencido: activos.filter(i => i.diasVencido > 0).reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalPagado: activos.reduce((s, i) => s + ((i.abonos || []).reduce((a, b) => a + Number(b.monto), 0)), 0),
    totalFacturado: activos.reduce((s, i) => s + (Number(i.factura?.montoTotal) || 0), 0),
    totalRetFuente: activos.reduce((s, i) => s + (Number(i.factura?.retencionFuente) || 0), 0),
    totalRetIva: activos.reduce((s, i) => s + (Number(i.factura?.retencionIva) || 0), 0),
    conteo: activos.length,
  };
}
```

- [ ] **Step 2: Verificar build** `npm run build` → sin errores
- [ ] **Step 3: Commit** `feat: crear servicio CRUD de cuentas por pagar con aging, retenciones y resumen`

---

### Task 2: Crear `CuentasPorPagarView.jsx`

**Files:** Create: `src/components/finances/CuentasPorPagarView.jsx`

**Interfaces:** Consumes: `getCxP`, `registrarPago`, `getAging`, `getResumenCxP` de `cxpService.js`.

- [ ] **Step 1: Crear la vista principal**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, Wallet, TrendingUp, AlertTriangle, DollarSign, Clock, BookOpen } from 'lucide-react';
import { getCxP, getAging, registrarPago, getResumenCxP } from '../../services/cxpService';

const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  vencido: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  anulado: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
};

export default function CuentasPorPagarView({ db, usuario, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ search: '', estado: 'all', fechaDesde: '', fechaHasta: '' });

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await getCxP(db, filtros); setItems(data); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const resumen = getResumenCxP(items);
  const aging = getAging(items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado'));

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}
        </div>
        {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-sidebar rounded-card" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-error text-lg mb-2">Error al cargar</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargar} className="px-4 py-2 bg-primary text-white rounded-btn text-sm">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><BookOpen size={14} className="text-primary" />Obligaciones</div>
          <div className="text-lg font-bold text-primary">{formatCurrency(resumen.totalObligaciones)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><AlertTriangle size={14} className="text-error" />Vencidas</div>
          <div className="text-lg font-bold text-error">{formatCurrency(resumen.totalVencido)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><TrendingUp size={14} className="text-success" />Pagado</div>
          <div className="text-lg font-bold text-success">{formatCurrency(resumen.totalPagado)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Wallet size={14} className="text-warning" />Ret. Fuente</div>
          <div className="text-lg font-bold text-warning">{formatCurrency(resumen.totalRetFuente)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Wallet size={14} className="text-info" />Ret. IVA</div>
          <div className="text-lg font-bold text-info">{formatCurrency(resumen.totalRetIva)}</div>
        </div>
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
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar proveedor, RUC, documento..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          </div>
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            <option value="all">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
            <option value="vencido">Vencido</option>
            <option value="anulado">Anulado</option>
          </select>
          <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <button onClick={() => {
            const h = ['Fecha','Proveedor','RUC','Doc','Vence','Monto','Ret. Fuente','Ret. IVA','Abonado','Saldo','Días Venc.','Estado'];
            const r = items.map(i => [formatDate(i.factura?.fecha), i.tercero?.nombre, i.tercero?.ruc, `${i.factura?.tipo} ${i.factura?.numero}`, formatDate(i.factura?.fechaVencimiento), Number(i.factura?.montoTotal).toFixed(2), Number(i.factura?.retencionFuente).toFixed(2), Number(i.factura?.retencionIva).toFixed(2), (i.abonos||[]).reduce((s,p)=>s+Number(p.monto),0).toFixed(2), Number(i.saldoPendiente).toFixed(2), i.diasVencido, i.estado]);
            const csv = [h.join(','), ...r.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            const b = new Blob([csv], {type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='cxp.csv'; a.click(); URL.revokeObjectURL(u);
          }} className="px-3 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light flex items-center gap-1">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No hay cuentas por pagar registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sidebar border-b border-border-default">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Fecha</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Proveedor</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Documento</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden sm:table-cell">Vence</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Monto</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary hidden md:table-cell">Ret. Fuente</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary hidden md:table-cell">Ret. IVA</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Abonado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Saldo</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary hidden sm:table-cell">Días</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Estado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={`border-b border-border-default hover:bg-primary-light/30 transition-colors ${item.diasVencido > 90 ? 'bg-error-light/30' : ''}`}>
                    <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{formatDate(item.factura?.fecha)}</td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{item.tercero?.nombre}<br /><span className="text-text-muted">{item.tercero?.ruc}</span></td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{item.factura?.tipo}<br /><span className="text-text-muted">{item.factura?.numero}</span></td>
                    <td className="px-3 py-2.5 text-text-primary text-xs hidden sm:table-cell">{formatDate(item.factura?.fechaVencimiento)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-text-primary">{formatCurrency(item.factura?.montoTotal)}</td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell text-warning">{formatCurrency(item.factura?.retencionFuente)}</td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell text-info">{formatCurrency(item.factura?.retencionIva)}</td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell text-success">{formatCurrency((item.abonos || []).reduce((s, p) => s + Number(p.monto), 0))}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-warning">{formatCurrency(item.saldoPendiente)}</td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                      <span className={`text-xs font-medium ${item.diasVencido > 90 ? 'text-error' : item.diasVencido > 30 ? 'text-warning' : 'text-text-primary'}`}>
                        {item.diasVencido > 0 ? item.diasVencido : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[item.estado] || ESTADO_BADGES.pendiente}`}>{item.estado}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end">
                        {(item.estado === 'pendiente' || item.estado === 'parcial' || item.estado === 'vencido') && (
                          <button onClick={async () => {
                            if (!window.confirm(`¿Registrar pago a ${item.tercero?.nombre}?`)) return;
                            const monto = prompt('Monto del pago:', String(item.saldoPendiente));
                            if (!monto || Number(monto) <= 0) return;
                            try {
                              await registrarPago(db, item.id, { monto: Number(monto), metodoPago: 'efectivo' }, usuario);
                              showToast('Pago registrado', 'success');
                              cargar();
                            } catch (e) { showToast('Error: ' + e.message, 'error'); }
                          }} title="Registrar pago" className="btn-icon w-7 h-7">
                            <Wallet size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build** `npm run build` → sin errores
- [ ] **Step 3: Commit** `feat: crear vista de cuentas por pagar con aging, retenciones y pagos`

---

### Task 3: Conectar CxP en `FinanceModule.jsx`

**Files:** Modify: `src/components/finances/FinanceModule.jsx`

- [ ] **Step 1: Agregar import y tab**

Leer el archivo. Agregar:
```jsx
import CuentasPorPagarView from './CuentasPorPagarView';
```

En el array de tabs (modo contabilidad), agregar después de `cxc`:
```jsx
{ id: 'cxp', label: 'Cuentas por Pagar', icon: BookOpen },
```

En la sección de renderizado, agregar después del bloque `cxc`:
```jsx
{activeTab === 'cxp' && (
  <CuentasPorPagarView db={db} usuario={usuario} showToast={showToast} />
)}
```

- [ ] **Step 2: Build + lint** → sin errores
- [ ] **Step 3: Commit** `feat: conectar cuentas por pagar como pestaña en FinanceModule`

---

### Task 4: Build final y verificación

- [ ] **Step 1:** `npm run build` → exit 0
- [ ] **Step 2:** Lint de nuevos archivos → 0 errores
- [ ] **Step 3:** Commit final `feat: completar Fase 3 - modulo de cuentas por pagar con aging, retenciones y pagos`