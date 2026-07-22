import { useState, useEffect, useCallback } from 'react';
import { Landmark, Plus, Wallet, AlertTriangle, DollarSign, TrendingDown, CalendarDays, X, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getPrestamos, crearPrestamo, pagarCuota, eliminarPrestamo, getResumenPrestamos, getAlertasPrestamos, generarTablaAmortizacion } from '../../services/prestamosService';

const METODOS = [
  { value: 'frances', label: 'Francés (Cuota Fija)' },
  { value: 'aleman', label: 'Alemán (Capital Fijo)' },
  { value: 'americano', label: 'Americano (Intereses al Final)' },
];

const ESTADO_BADGES = {
  vigente: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  mora: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  cancelado: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
};

const CUOTA_ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  vencido: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
};

export default function PrestamosView({ db, usuario, showToast }) {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('all');

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await getPrestamos(db); setPrestamos(data); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const filtrados = filtroEstado === 'all' ? prestamos : prestamos.filter(p => p.estado === filtroEstado);
  const resumen = getResumenPrestamos(prestamos);
  const alertas = getAlertasPrestamos(prestamos);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}</div>
        {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-sidebar rounded-card" />)}
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
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><DollarSign size={14} className="text-error" />Total Deuda</div>
          <div className="text-lg font-bold text-error">{formatCurrency(resumen.totalDeuda)}</div>
          <div className="text-xs text-text-muted">{resumen.conteo} préstamo(s) activo(s)</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><TrendingDown size={14} className="text-primary" />Capital Pagado</div>
          <div className="text-lg font-bold text-primary">{formatCurrency(resumen.capitalPagado)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><DollarSign size={14} className="text-warning" />Interés Pagado</div>
          <div className="text-lg font-bold text-warning">{formatCurrency(resumen.interesPagado)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><AlertCircle size={14} className="text-error" />Cuotas Vencidas</div>
          <div className="text-lg font-bold text-error">{resumen.cuotasVencidas}</div>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="bg-warning-light border border-warning/20 rounded-card p-4">
          <h3 className="text-sm font-semibold text-warning flex items-center gap-1 mb-2"><AlertTriangle size={14} /> Cuotas Vencidas ({alertas.length})</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {alertas.slice(0, 10).map((a, i) => (
              <div key={i} className="text-xs text-text-primary">
                <span className="font-medium">{a.entidad}</span> — Cuota #{a.cuota} vencida hace {a.dias} día(s)
              </div>
            ))}
            {alertas.length > 10 && <div className="text-xs text-text-muted">+{alertas.length - 10} alerta(s) más</div>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowForm(true)} className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-btn flex items-center gap-1.5">
          <Plus size={14} /> Nuevo Préstamo
        </button>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
          <option value="all">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="mora">En Mora</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtrados.length === 0 ? (
          <div className="bg-surface-card border border-border-default rounded-card py-12 text-center">
            <Landmark size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No hay préstamos registrados</p>
          </div>
        ) : (
          filtrados.map(p => (
            <div key={p.id} className="bg-surface-card border border-border-default rounded-card overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-primary-light/20 transition-colors"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Landmark size={20} className={p.estado === 'mora' ? 'text-error' : p.estado === 'cancelado' ? 'text-text-muted' : 'text-primary'} />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{p.entidad}</div>
                      <div className="text-xs text-text-muted">Contrato: {p.numeroContrato || 'N/A'} | {METODOS.find(m => m.value === p.metodoAmortizacion)?.label || p.metodoAmortizacion}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-error">{formatCurrency(p.saldoPendiente)}</div>
                      <div className="text-xs text-text-muted">de {formatCurrency(p.montoDesembolsado)}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[p.estado] || ESTADO_BADGES.vigente}`}>{p.estado}</span>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-success" />{p.cuotasPagadas || 0}</span>
                      <span className="flex items-center gap-1"><Clock size={12} className="text-info" />{p.cuotasPendientes || 0}</span>
                      {p.cuotasVencidas > 0 && <span className="flex items-center gap-1"><AlertCircle size={12} className="text-error" />{p.cuotasVencidas}</span>}
                    </div>
                    {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                <div className="mt-2 sm:hidden">
                  <div className="text-sm font-bold text-error">{formatCurrency(p.saldoPendiente)} <span className="text-xs text-text-muted font-normal">de {formatCurrency(p.montoDesembolsado)}</span></div>
                </div>
              </div>

              {expandedId === p.id && (
                <div className="border-t border-border-default">
                  <div className="px-4 py-3 bg-surface-sidebar flex flex-wrap gap-3 text-xs">
                    <span><span className="text-text-secondary">Tasa:</span> <span className="font-medium">{p.tasaInteres}% mensual</span></span>
                    <span><span className="text-text-secondary">Plazo:</span> <span className="font-medium">{p.plazoMeses} meses</span></span>
                    <span><span className="text-text-secondary">Desembolso:</span> <span className="font-medium">{formatDate(p.fechaDesembolso)}</span></span>
                    <span><span className="text-text-secondary">Capital pagado:</span> <span className="font-medium text-primary">{formatCurrency(p.capitalPagado)}</span></span>
                    <span><span className="text-text-secondary">Interés pagado:</span> <span className="font-medium text-warning">{formatCurrency(p.interesPagado)}</span></span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-sidebar border-b border-border-default">
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">#</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Vence</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Capital</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Interés</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Cuota</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Saldo</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">Estado</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(p.cuotas || []).map(c => (
                          <tr key={c.numero} className={`border-b border-border-default ${c.estado === 'vencido' ? 'bg-error-light/30' : c.estado === 'pagado' ? 'bg-success/5' : ''}`}>
                            <td className="px-3 py-2 text-text-primary font-medium">{c.numero}</td>
                            <td className="px-3 py-2 text-text-primary whitespace-nowrap">{formatDate(c.fechaVencimiento)}</td>
                            <td className="px-3 py-2 text-right text-text-primary">{formatCurrency(c.capital)}</td>
                            <td className="px-3 py-2 text-right text-text-primary">{formatCurrency(c.interes)}</td>
                            <td className="px-3 py-2 text-right font-medium text-text-primary">{formatCurrency(c.cuotaTotal)}</td>
                            <td className="px-3 py-2 text-right text-text-secondary">{formatCurrency(c.saldoPendiente)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium border rounded-badge ${CUOTA_ESTADO_BADGES[c.estado] || ''}`}>
                                {c.estado === 'pagado' && formatDate(c.fechaPago) !== '-' ? formatDate(c.fechaPago) : c.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {(c.estado === 'pendiente' || c.estado === 'vencido' || c.estado === 'parcial') && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const restante = (Number(c.cuotaTotal) - Number(c.pagadaCapital || 0) - Number(c.pagadaInteres || 0));
                                    const montoStr = prompt(`Monto a pagar (cuota: ${formatCurrency(restante)}):`, String(restante.toFixed(2)));
                                    if (!montoStr || Number(montoStr) <= 0) return;
                                    try {
                                      await pagarCuota(db, p.id, c.numero, Number(montoStr), usuario);
                                      showToast(`Cuota #${c.numero} pagada: ${formatCurrency(Number(montoStr))}`, 'success');
                                      cargar();
                                    } catch (err) { showToast('Error: ' + err.message, 'error'); }
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-success text-white rounded-btn hover:opacity-90"
                                >
                                  <Wallet size={12} className="inline mr-1" />Pagar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {p.estado !== 'cancelado' && (
                    <div className="px-4 py-3 border-t border-border-default flex justify-end">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`¿Eliminar préstamo de ${p.entidad}?`)) return;
                          try {
                            await eliminarPrestamo(db, p.id, usuario);
                            showToast('Préstamo eliminado', 'success');
                            cargar();
                          } catch (err) { showToast('Error: ' + err.message, 'error'); }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-error border border-error/20 rounded-btn hover:bg-error-light"
                      >
                        Eliminar Préstamo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showForm && <FormPrestamo db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowForm(false); cargar(); }} />}
    </div>
  );
}

function FormPrestamo({ db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({
    entidad: '', numeroContrato: '', montoDesembolsado: '', tasaInteres: '', plazoMeses: '',
    metodoAmortizacion: 'frances', fechaDesembolso: '', fechaInicio: '',
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generarPreview = () => {
    const monto = Number(form.montoDesembolsado);
    const tasa = Number(form.tasaInteres);
    const plazo = Number(form.plazoMeses);
    if (!monto || !plazo || !form.fechaInicio) return;
    setPreview(generarTablaAmortizacion(monto, tasa, plazo, form.metodoAmortizacion, form.fechaInicio));
  };

  const totalInteres = preview ? preview.reduce((s, c) => s + c.interes, 0) : 0;
  const totalCuotas = preview ? preview.reduce((s, c) => s + c.cuotaTotal, 0) : 0;

  const handleSubmit = async () => {
    if (!form.entidad || !form.montoDesembolsado || !form.tasaInteres || !form.plazoMeses || !form.fechaInicio) {
      showToast('Complete los campos obligatorios', 'error'); return;
    }
    setSaving(true);
    try {
      await crearPrestamo(db, form, usuario);
      showToast('Préstamo creado con tabla de amortización', 'success');
      onClose();
    } catch (e) { showToast('Error: ' + e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-lg border border-border-default max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default sticky top-0 bg-white z-10">
          <h3 className="text-md font-semibold text-black">Nuevo Préstamo Bancario</h3>
          <button onClick={onClose} className="btn-icon text-gray-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Entidad financiera *" placeholder="Banco Pichincha, Produbanco..." value={form.entidad} onChange={v => update('entidad', v)} />
            <Input label="N° Contrato" placeholder="PREST-001" value={form.numeroContrato} onChange={v => update('numeroContrato', v)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Monto desembolsado *" placeholder="10000" type="number" value={form.montoDesembolsado} onChange={v => { update('montoDesembolsado', v); setPreview(null); }} />
            <Input label="Tasa mensual (%) *" placeholder="1.5" type="number" value={form.tasaInteres} onChange={v => { update('tasaInteres', v); setPreview(null); }} />
            <Input label="Plazo (meses) *" placeholder="12" type="number" value={form.plazoMeses} onChange={v => { update('plazoMeses', v); setPreview(null); }} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Método de amortización *</label>
            <select value={form.metodoAmortizacion} onChange={e => { update('metodoAmortizacion', e.target.value); setPreview(null); }}
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
              {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha desembolso" type="date" value={form.fechaDesembolso} onChange={v => update('fechaDesembolso', v)} />
            <Input label="Fecha inicio pagos *" type="date" value={form.fechaInicio} onChange={v => { update('fechaInicio', v); setPreview(null); }} />
          </div>

          <div className="pt-2 border-t border-border-default">
            <button onClick={generarPreview} className="px-3 py-2 text-sm font-medium bg-info text-white rounded-btn">
              <CalendarDays size={14} className="inline mr-1" /> Generar Tabla de Amortización
            </button>
          </div>

          {preview && (
            <div className="border border-border-default rounded-card overflow-hidden">
              <div className="px-3 py-2 bg-surface-sidebar flex justify-between items-center">
                <span className="text-xs font-semibold text-text-primary">Tabla de Amortización ({METODOS.find(m => m.value === form.metodoAmortizacion)?.label})</span>
                <span className="text-xs text-text-secondary">Total interés: <span className="font-bold text-warning">{`$${totalInteres.toFixed(2)}`}</span> | Total a pagar: <span className="font-bold text-text-primary">{`$${totalCuotas.toFixed(2)}`}</span></span>
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-border-default">
                      <th className="px-2 py-1.5 text-left text-text-secondary">#</th>
                      <th className="px-2 py-1.5 text-right text-text-secondary">Capital</th>
                      <th className="px-2 py-1.5 text-right text-text-secondary">Interés</th>
                      <th className="px-2 py-1.5 text-right text-text-secondary">Cuota</th>
                      <th className="px-2 py-1.5 text-right text-text-secondary">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(c => (
                      <tr key={c.numero} className="border-b border-border-default">
                        <td className="px-2 py-1.5 text-text-primary">{c.numero}</td>
                        <td className="px-2 py-1.5 text-right text-text-primary">${c.capital.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-warning">${c.interes.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right font-medium text-text-primary">${c.cuotaTotal.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-text-secondary">${c.saldoPendiente.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border-default sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-btn text-text-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-btn disabled:opacity-50">{saving ? 'Guardando...' : 'Crear Préstamo'}</button>
        </div>
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
