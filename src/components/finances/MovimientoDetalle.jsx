import { X, Calendar, User, FileText, CreditCard, Banknote, Clock, History } from 'lucide-react';

const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  anulado: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
};

const TIPO_BADGES = {
  ingreso: 'bg-status-authorized-bg text-status-authorized-text',
  egreso: 'bg-status-rejected-bg text-status-rejected-text',
};

export default function MovimientoDetalle({ movimiento, onClose }) {
  const m = movimiento;
  const totalAbonado = (m.pagos || []).reduce((s, p) => s + Number(p.monto), 0);

  const formatDate = (d) => {
    if (!d) return '-';
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-[105] bg-black/50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      <div className="bg-surface-card border border-border-default rounded-card w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Detalle del Movimiento</h2>
            <span className={`inline-flex px-2 py-0.5 text-xs rounded-badge ${TIPO_BADGES[m.tipo]}`}>
              {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
            </span>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[m.estado]}`}>
              {m.estado}
            </span>
          </div>
          <button onClick={onClose} className="btn-icon text-text-secondary"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2"><Calendar size={14} className="text-text-muted" /><span className="text-text-secondary">Fecha:</span><span className="text-text-primary font-medium">{formatDate(m.fecha)}</span></div>
            <div className="flex items-center gap-2"><Calendar size={14} className="text-text-muted" /><span className="text-text-secondary">Vencimiento:</span><span className="text-text-primary">{formatDate(m.fechaVencimiento)}</span></div>
            <div className="flex items-center gap-2"><FileText size={14} className="text-text-muted" /><span className="text-text-secondary">Documento:</span><span className="text-text-primary font-medium">{m.documento?.tipo} #{m.documento?.numero}</span></div>
            <div className="flex items-center gap-2"><CreditCard size={14} className="text-text-muted" /><span className="text-text-secondary">Método:</span><span className="text-text-primary capitalize">{m.metodoPago?.replace('_', ' ')}</span></div>
            <div className="flex items-center gap-2"><User size={14} className="text-text-muted" /><span className="text-text-secondary">Tercero:</span><span className="text-text-primary font-medium">{m.tercero?.nombre}</span></div>
            <div className="flex items-center gap-2"><Banknote size={14} className="text-text-muted" /><span className="text-text-secondary">RUC:</span><span className="text-text-primary">{m.tercero?.ruc}</span></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-sidebar rounded-card p-3 text-center">
              <div className="text-xs text-text-secondary">Monto Total</div>
              <div className="text-lg font-bold text-text-primary">{formatCurrency(m.monto)}</div>
            </div>
            <div className="bg-status-authorized-bg rounded-card p-3 text-center">
              <div className="text-xs text-text-secondary">Abonado</div>
              <div className="text-lg font-bold text-success">{formatCurrency(totalAbonado)}</div>
            </div>
            <div className={`rounded-card p-3 text-center ${Number(m.saldoPendiente) > 0 ? 'bg-warning-light' : 'bg-status-authorized-bg'}`}>
              <div className="text-xs text-text-secondary">Saldo Pendiente</div>
              <div className={`text-lg font-bold ${Number(m.saldoPendiente) > 0 ? 'text-warning' : 'text-success'}`}>
                {formatCurrency(m.saldoPendiente)}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Partidas</h3>
            <div className="border border-border-default rounded-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-sidebar border-b border-border-default">
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Categoría</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Base</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">IVA</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Ret.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(m.partidas || []).map((p, i) => (
                    <tr key={i} className="border-b border-border-default last:border-0">
                      <td className="px-3 py-2 text-text-primary">{p.descripcion}</td>
                      <td className="px-3 py-2 text-text-secondary text-xs">{p.categoria?.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-right text-text-primary">{formatCurrency(p.baseImponible)}</td>
                      <td className="px-3 py-2 text-right text-text-primary">{formatCurrency(p.iva)}</td>
                      <td className="px-3 py-2 text-right text-error">{formatCurrency((p.retencionFuente || 0) + (p.retencionIva || 0))}</td>
                      <td className="px-3 py-2 text-right font-medium text-text-primary">{formatCurrency(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(m.pagos || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1"><History size={14} /> Historial de Abonos</h3>
              <div className="border border-border-default rounded-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-sidebar border-b border-border-default">
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Método</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Referencia</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(m.pagos || []).map((p, i) => (
                      <tr key={i} className="border-b border-border-default last:border-0">
                        <td className="px-3 py-2 text-text-primary">{formatDate(p.fecha)}</td>
                        <td className="px-3 py-2 text-text-secondary text-xs capitalize">{p.metodoPago?.replace('_', ' ')}</td>
                        <td className="px-3 py-2 text-text-primary">{p.referencia || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium text-success">{formatCurrency(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {m.notas && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Notas</h3>
              <p className="text-sm text-text-secondary bg-surface-sidebar rounded-card p-3">{m.notas}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1"><Clock size={14} /> Auditoría</h3>
            <div className="space-y-1">
              {(m.auditLog || []).slice(-5).reverse().map((log, i) => (
                <div key={i} className="text-xs text-text-secondary flex justify-between bg-surface-sidebar rounded-card px-3 py-1.5">
                  <span><span className="font-medium text-text-primary">{log.accion}</span> por {log.usuario}</span>
                  <span>{formatDate(log.fecha)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-5 py-4 border-t border-border-default">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
