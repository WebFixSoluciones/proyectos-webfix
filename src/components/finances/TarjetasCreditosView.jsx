import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Download, Plus, Wallet, AlertTriangle, DollarSign, Clock, CalendarDays, Tag, X } from 'lucide-react';
import { getTarjetas, getAllConsumosTarjeta, getResumenTarjetas, getAlertasProximidad, crearTarjeta, registrarConsumo, registrarPagoTarjeta } from '../../services/tarjetasService';

const CATEGORIAS = [
  { value: 'gasto_operativo', label: 'Gasto Operativo' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'personal', label: 'Personal' },
  { value: 'no_deducible', label: 'No Deducible' },
  { value: 'anticipo', label: 'Anticipo' },
  { value: 'otro', label: 'Otro' },
];

export default function TarjetasCreditosView({ db, usuario, showToast }) {
  const [tarjetas, setTarjetas] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ tarjetaId: 'all', tipo: 'all', fechaDesde: '', fechaHasta: '' });
  const [showFormTarjeta, setShowFormTarjeta] = useState(false);
  const [showFormConsumo, setShowFormConsumo] = useState(false);
  const [showFormPago, setShowFormPago] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, c] = await Promise.all([getTarjetas(db), getAllConsumosTarjeta(db, filtros)]);
      setTarjetas(t); setConsumos(c);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const resumen = getResumenTarjetas(tarjetas);
  const alertas = getAlertasProximidad(tarjetas);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}</div>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><DollarSign size={14} className="text-primary" />Total Cupo</div>
          <div className="text-lg font-bold text-primary">{formatCurrency(resumen.totalCupo)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><CreditCard size={14} className="text-warning" />Total Utilizado</div>
          <div className="text-lg font-bold text-warning">{formatCurrency(resumen.totalUtilizado)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Wallet size={14} className="text-success" />Total Disponible</div>
          <div className="text-lg font-bold text-success">{formatCurrency(resumen.totalDisponible)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><CalendarDays size={14} className="text-error" />Próximos Pagos</div>
          <div className="text-lg font-bold text-error">{resumen.proximosPagos}</div>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="bg-warning-light border border-warning/20 rounded-card p-4">
          <h3 className="text-sm font-semibold text-warning flex items-center gap-1 mb-2"><AlertTriangle size={14} /> Alertas</h3>
          <div className="space-y-1">
            {alertas.map((a, i) => (
              <div key={i} className="text-xs text-text-primary">
                <span className="font-medium">{a.emisor} ****{a.numero}</span> — {a.mensaje}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowFormTarjeta(true)} className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-btn flex items-center gap-1.5">
          <Plus size={14} /> Nueva Tarjeta
        </button>
        <button onClick={() => setShowFormConsumo(true)} disabled={tarjetas.length === 0} className="px-3 py-2 text-sm font-medium bg-warning text-white rounded-btn flex items-center gap-1.5 disabled:opacity-50">
          <CreditCard size={14} /> Nuevo Consumo
        </button>
        <button onClick={() => setShowFormPago(true)} disabled={tarjetas.length === 0} className="px-3 py-2 text-sm font-medium bg-success text-white rounded-btn flex items-center gap-1.5 disabled:opacity-50">
          <Wallet size={14} /> Registrar Pago
        </button>
      </div>

      {tarjetas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tarjetas.map(t => {
            const uso = t.cupoTotal > 0 ? Math.round((t.saldoUtilizado / t.cupoTotal) * 100) : 0;
            return (
              <div key={t.id} className="bg-surface-card border border-border-default rounded-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className={uso > 80 ? 'text-error' : uso > 50 ? 'text-warning' : 'text-primary'} />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{t.emisor}</div>
                      <div className="text-xs text-text-muted">****{t.numero}</div>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 text-xs font-medium border rounded-badge ${t.estado === 'activa' ? 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border' : 'bg-status-draft-bg text-status-draft-text border-status-draft-border'}`}>{t.estado}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">Cupo</span><span className="font-medium text-text-primary">{formatCurrency(t.cupoTotal)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">Utilizado</span><span className="font-medium text-warning">{formatCurrency(t.saldoUtilizado)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">Disponible</span><span className="font-medium text-success">{formatCurrency(t.cupoDisponible)}</span></div>
                  <div className="w-full bg-surface-sidebar rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full ${uso > 80 ? 'bg-error' : uso > 50 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.min(uso, 100)}%` }} /></div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Corte: {t.fechaCorte}</span><span>Pago: {t.fechaPago}</span>
                  </div>
                  {t.cuotasPendientes?.length > 0 && (
                    <div className="text-xs text-info flex items-center gap-1 mt-1"><Clock size={12} /> {t.cuotasPendientes.length} consumo(s) en cuotas</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={filtros.tarjetaId} onChange={e => setFiltros(f => ({ ...f, tarjetaId: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            <option value="all">Todas las tarjetas</option>
            {tarjetas.map(t => <option key={t.id} value={t.id}>{t.emisor} ****{t.numero}</option>)}
          </select>
          <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            <option value="all">Todos</option><option value="consumo">Consumos</option><option value="pago">Pagos</option>
          </select>
          <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <button onClick={() => {
            const h = ['Fecha','Tarjeta','Tipo','Monto','Descripción','Categoría','Cuotas','Cuotas Pagadas','Referencia'];
            const tarjetaMap = Object.fromEntries(tarjetas.map(t => [t.id, `${t.emisor} ****${t.numero}`]));
            const r = consumos.map(c => [formatDate(c.fecha), tarjetaMap[c.tarjetaId] || '-', c.tipo, Number(c.monto).toFixed(2), c.descripcion, c.categoria, c.cuotas, c.cuotasPagadas || 0, c.referencia || '']);
            const csv = [h.join(','), ...r.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            const b = new Blob([csv], {type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='tarjetas_consumos.csv'; a.click(); URL.revokeObjectURL(u);
          }} className="px-3 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light flex items-center gap-1">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
        {consumos.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No hay consumos o pagos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sidebar border-b border-border-default">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Fecha</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Tarjeta</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Tipo</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden sm:table-cell">Descripción</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden md:table-cell">Categoría</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Monto</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary hidden sm:table-cell">Cuotas</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden md:table-cell">Ref.</th>
                </tr>
              </thead>
              <tbody>
                {consumos.map(c => {
                  const tarjeta = tarjetas.find(t => t.id === c.tarjetaId);
                  return (
                    <tr key={c.id} className={`border-b border-border-default hover:bg-primary-light/30 transition-colors ${c.cuotas > 1 && (c.cuotasPagadas || 0) < c.cuotas ? 'bg-info/5' : ''}`}>
                      <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{formatDate(c.fecha)}</td>
                      <td className="px-3 py-2.5 text-text-primary text-xs">{tarjeta ? `${tarjeta.emisor} ****${tarjeta.numero}` : '-'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium border rounded-badge ${c.tipo === 'consumo' ? 'bg-warning-light text-warning border-warning/20' : 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border'}`}>{c.tipo}</span>
                      </td>
                      <td className="px-3 py-2.5 text-text-primary text-xs hidden sm:table-cell max-w-[200px] truncate">{c.descripcion}</td>
                      <td className="px-3 py-2.5 text-text-primary text-xs hidden md:table-cell">
                        <span className="inline-flex items-center gap-1"><Tag size={10} />{CATEGORIAS.find(cat => cat.value === c.categoria)?.label || c.categoria}</span>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${c.tipo === 'pago' ? 'text-success' : 'text-warning'}`}>{c.tipo === 'pago' ? '-' : ''}{formatCurrency(c.monto)}</td>
                      <td className="px-3 py-2.5 text-center text-xs hidden sm:table-cell">
                        {c.cuotas > 1 ? (
                          <span className="text-info">{c.cuotasPagadas || 0}/{c.cuotas}</span>
                        ) : <span className="text-text-muted">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-text-primary text-xs hidden md:table-cell">{c.referencia || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showFormTarjeta && <FormTarjeta db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormTarjeta(false); cargar(); }} />}
      {showFormConsumo && <FormConsumo tarjetas={tarjetas} db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormConsumo(false); cargar(); }} />}
      {showFormPago && <FormPago tarjetas={tarjetas} db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormPago(false); cargar(); }} />}
    </div>
  );
}

function FormTarjeta({ db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({ emisor: '', numero: '', cupoTotal: '', fechaCorte: '', fechaPago: '', tasaInteres: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.emisor || !form.numero || !form.cupoTotal || !form.fechaCorte || !form.fechaPago) { showToast('Complete los campos obligatorios', 'error'); return; }
    setSaving(true);
    try {
      await crearTarjeta(db, form, usuario);
      showToast('Tarjeta creada', 'success'); onClose();
    } catch (e) { showToast('Error: ' + e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="Nueva Tarjeta">
      <div className="space-y-3">
        <Input label="Emisor *" placeholder="Banco Pichincha, Visa..." value={form.emisor} onChange={v => setForm(f => ({ ...f, emisor: v }))} />
        <Input label="Últimos 4 dígitos *" placeholder="1234" value={form.numero} onChange={v => setForm(f => ({ ...f, numero: v }))} maxLength={4} />
        <Input label="Cupo total *" placeholder="5000" type="number" value={form.cupoTotal} onChange={v => setForm(f => ({ ...f, cupoTotal: v }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Día de corte *" placeholder="15" value={form.fechaCorte} onChange={v => setForm(f => ({ ...f, fechaCorte: v }))} />
          <Input label="Día de pago *" placeholder="25" value={form.fechaPago} onChange={v => setForm(f => ({ ...f, fechaPago: v }))} />
        </div>
        <Input label="Tasa de interés (% mensual)" placeholder="1.5" type="number" value={form.tasaInteres} onChange={v => setForm(f => ({ ...f, tasaInteres: v }))} />
      </div>
      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-btn text-text-secondary">Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-btn disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </Modal>
  );
}

function FormConsumo({ tarjetas, db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({ tarjetaId: tarjetas[0]?.id || '', monto: '', descripcion: '', categoria: 'otro', fecha: '', cuotas: '1', referencia: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.tarjetaId || !form.monto || !form.descripcion) { showToast('Complete los campos obligatorios', 'error'); return; }
    setSaving(true);
    try {
      await registrarConsumo(db, form, usuario);
      showToast('Consumo registrado', 'success'); onClose();
    } catch (e) { showToast('Error: ' + e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="Nuevo Consumo">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Tarjeta *</label>
          <select value={form.tarjetaId} onChange={e => setForm(f => ({ ...f, tarjetaId: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            {tarjetas.map(t => <option key={t.id} value={t.id}>{t.emisor} ****{t.numero} (Dispo: ${(t.cupoDisponible || 0).toFixed(2)})</option>)}
          </select>
        </div>
        <Input label="Monto *" placeholder="100.00" type="number" value={form.monto} onChange={v => setForm(f => ({ ...f, monto: v }))} />
        <Input label="Descripción *" placeholder="Compra en proveedor X" value={form.descripcion} onChange={v => setForm(f => ({ ...f, descripcion: v }))} />
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Categoría</label>
          <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={form.fecha} onChange={v => setForm(f => ({ ...f, fecha: v }))} />
          <Input label="N° autorización" placeholder="Ref. 000000" value={form.referencia} onChange={v => setForm(f => ({ ...f, referencia: v }))} />
        </div>
        <Input label="Cuotas (1 = contado)" type="number" placeholder="1" value={form.cuotas} onChange={v => setForm(f => ({ ...f, cuotas: v }))} min={1} />
      </div>
      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-btn text-text-secondary">Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-warning text-white rounded-btn disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button>
      </div>
    </Modal>
  );
}

function FormPago({ tarjetas, db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({ tarjetaId: tarjetas[0]?.id || '', monto: '', descripcion: '', fecha: '', referencia: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.tarjetaId || !form.monto) { showToast('Complete los campos obligatorios', 'error'); return; }
    setSaving(true);
    try {
      await registrarPagoTarjeta(db, form, usuario);
      showToast('Pago registrado', 'success'); onClose();
    } catch (e) { showToast('Error: ' + e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="Registrar Pago a Tarjeta">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Tarjeta *</label>
          <select value={form.tarjetaId} onChange={e => setForm(f => ({ ...f, tarjetaId: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            {tarjetas.map(t => <option key={t.id} value={t.id}>{t.emisor} ****{t.numero} (Saldo: ${(t.saldoUtilizado || 0).toFixed(2)})</option>)}
          </select>
        </div>
        <Input label="Monto del pago *" placeholder="500.00" type="number" value={form.monto} onChange={v => setForm(f => ({ ...f, monto: v }))} />
        <Input label="Descripción" placeholder="Pago mínimo, pago total..." value={form.descripcion} onChange={v => setForm(f => ({ ...f, descripcion: v }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={form.fecha} onChange={v => setForm(f => ({ ...f, fecha: v }))} />
          <Input label="N° referencia" placeholder="Transferencia #123" value={form.referencia} onChange={v => setForm(f => ({ ...f, referencia: v }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-btn text-text-secondary">Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-success text-white rounded-btn disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-lg border border-border-default max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default sticky top-0 bg-white z-10">
          <h3 className="text-md font-semibold text-black">{title}</h3>
          <button onClick={onClose} className="btn-icon text-gray-500"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <input {...props} className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
    </div>
  );
}
