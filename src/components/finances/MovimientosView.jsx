import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, FileText, Eye, Edit2, Trash2, Wallet, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { getMovimientos, getResumen, anularMovimiento } from '../../services/movimientoService';
import MovimientoForm from './MovimientoForm';
import MovimientoAbono from './MovimientoAbono';
import MovimientoDetalle from './MovimientoDetalle';
import { Badge } from '../ui/badge';

const ESTADO_BADGES = {
  pendiente: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  parcial: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  pagado: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  anulado: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
};

const FILTROS_DEFAULT = {
  search: '',
  tipo: 'all',
  estado: 'all',
  metodoPago: 'all',
  categoria: 'all',
  fechaDesde: '',
  fechaHasta: '',
};

export default function MovimientosView({ db, usuario, showToast }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_DEFAULT);
  const [showForm, setShowForm] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [showAbono, setShowAbono] = useState(null);
  const [showDetalle, setShowDetalle] = useState(null);

  const cargarMovimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovimientos(db, filtros);
      setMovimientos(data);
    } catch (err) {
      setError('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarMovimientos();
  }, [cargarMovimientos]);

  const handleSave = () => {
    setShowForm(false);
    setEditingMov(null);
    cargarMovimientos();
  };

  const handleAbonoSave = () => {
    setShowAbono(null);
    cargarMovimientos();
  };

  const handleAnular = async (id) => {
    if (!window.confirm('¿Anular este movimiento? Esta acción no se puede deshacer.')) return;
    try {
      await anularMovimiento(db, id, usuario);
      showToast('Movimiento anulado', 'success');
      cargarMovimientos();
    } catch (err) {
      showToast('Error al anular: ' + err.message, 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Fecha','Tipo','Documento','Número','Tercero','RUC','Monto','Abonado','Saldo','Estado','Método','Categoría'];
    const rows = movimientos.map(m => [
      new Date(m.fecha?.toDate?.() || m.fecha).toLocaleDateString('es-EC'),
      m.tipo,
      m.documento?.tipo,
      m.documento?.numero,
      m.tercero?.nombre,
      m.tercero?.ruc,
      Number(m.monto).toFixed(2),
      (m.pagos || []).reduce((s, p) => s + Number(p.monto), 0).toFixed(2),
      Number(m.saldoPendiente).toFixed(2),
      m.estado,
      m.metodoPago,
      m.partidas?.[0]?.categoria || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const resumen = getResumen(movimientos);
  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : new Date(d).toLocaleDateString('es-EC');

  if (loading) {
    return (
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-3 gap-4"}}>
          {[1,2,3].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}
        </UiBox>
        {[1,2,3,4,5].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-12"}} />)}
      </UiBox>
    );
  }

  if (error) {
    return (
      <UiBox {...{"className":"text-center py-12"}}>
        <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-2"}}>Error al cargar los movimientos</UiBox>
        <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>{error}</UiText>
        <UiButton onClick={cargarMovimientos} {...{"variant":"solid","color":"blue","size":"2"}}>
          Reintentar
        </UiButton>
      </UiBox>
    );
  }

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-3 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <TrendingUp size={14} {...{"style":{"color":"var(--green-12)"}}} /> Ingresos del período
          </UiBox>
          <UiBox {...{"style":{"color":"var(--green-12)"}}}>{formatCurrency(resumen.totalIngresos)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <TrendingDown size={14} {...{"style":{"color":"var(--red-12)"}}} /> Egresos del período
          </UiBox>
          <UiBox {...{"style":{"color":"var(--red-12)"}}}>{formatCurrency(resumen.totalEgresos)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <DollarSign size={14} {...{"style":{"color":"var(--blue-12)"}}} /> Saldo neto
          </UiBox>
          <UiBox {...mergeThemeProps({}, {}, (resumen.saldoNeto >= 0 ? {"style":{"color":"var(--blue-12)"}} : {"style":{"color":"var(--red-12)"}}))}>
            {formatCurrency(resumen.saldoNeto)}
          </UiBox>
        </UiCard>
      </UiBox>

      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiBox {...{"className":"flex flex-wrap items-center gap-3"}}>
          <UiBox {...{"className":"relative flex-1 min-w-[200px]"}}>
            <Search size={14} {...{"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"}} />
            <UiInput type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar por documento, tercero, RUC..."
              {...{"size":"2","color":"gray","className":"w-full"}} />
          </UiBox>

          <UiSelect value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
            {...{"size":"2","color":"gray"}}>
            <option value="all">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </UiSelect>

          <UiSelect value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            {...{"size":"2","color":"gray"}}>
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
            <option value="anulado">Anulado</option>
          </UiSelect>

          <UiInput type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            {...{"size":"2","color":"gray"}} />
          <UiInput type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            {...{"size":"2","color":"gray"}} />

          <UiButton onClick={handleExportCsv}
            {...{"size":"2","color":"gray","variant":"outline","className":"flex items-center gap-1"}}>
            <Download size={14} /> CSV
          </UiButton>
          <UiButton onClick={() => { setEditingMov(null); setShowForm(true); }}
            {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1"}}>
            <Plus size={14} /> Nuevo
          </UiButton>
        </UiBox>
      </UiCard>

      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
        {movimientos.length === 0 ? (
          <UiBox {...{"className":"text-center py-12"}}>
            <FileText size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
            <UiText as="p" {...{"color":"gray","className":"mb-1"}}>No hay movimientos registrados</UiText>
            <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>Crea el primer ingreso o gasto para empezar</UiText>
            <UiButton onClick={() => { setEditingMov(null); setShowForm(true); }}
              {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1 mx-auto"}}>
              <Plus size={14} /> Nuevo Movimiento
            </UiButton>
          </UiBox>
        ) : (
          <UiBox {...{"className":"overflow-x-auto"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader>
                <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Fecha</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Tipo</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Documento</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Tercero</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden sm:table-cell"}}>Categoría</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Monto</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right hidden md:table-cell"}}>Saldo</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center"}}>Estado</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Acciones</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                {movimientos.map(mov => (
                  <UiTableRow key={mov.id}>
                    <UiTableCell style={{ color: "var(--gray-12)" }} className="px-3 py-2.5 whitespace-nowrap">{formatDate(mov.fecha)}</UiTableCell>
                    <UiTableCell className="px-3 py-2.5">
                      <Badge variant="soft" color={mov.tipo === 'ingreso' ? 'green' : 'red'} size="1">
                        {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                    </UiTableCell>
                    <UiTableCell style={{ color: "var(--gray-12)" }} className="px-3 py-2.5 text-xs">
                      <span className="font-medium">{mov.documento?.tipo}</span><br />
                      <span style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-11)" }}>{mov.documento?.numero}</span>
                    </UiTableCell>
                    <UiTableCell style={{ color: "var(--gray-12)" }} className="px-3 py-2.5 text-xs">
                      <span className="font-medium">{mov.tercero?.nombre}</span><br />
                      <span style={{ color: "var(--gray-11)" }}>{mov.tercero?.ruc}</span>
                    </UiTableCell>
                    <UiTableCell className="px-3 py-2.5 hidden sm:table-cell text-xs" style={{ color: "var(--gray-11)" }}>
                      {mov.partidas?.[0]?.categoria?.replace(/_/g, ' ') || '-'}
                    </UiTableCell>
                    <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }} className="px-3 py-2.5 text-right font-medium">{formatCurrency(mov.monto)}</UiTableCell>
                    <UiTableCell className="px-3 py-2.5 text-right hidden md:table-cell">
                      <span style={{ fontFamily: "var(--code-font-family)", color: Number(mov.saldoPendiente) > 0 ? "var(--amber-11)" : "var(--gray-11)" }} className="font-medium">
                        {formatCurrency(mov.saldoPendiente)}
                      </span>
                    </UiTableCell>
                    <UiTableCell className="px-3 py-2.5 text-center">
                      <Badge variant="soft" color={mov.estado === 'pagado' ? 'green' : mov.estado === 'pendiente' ? 'amber' : mov.estado === 'parcial' ? 'blue' : 'red'} size="1">
                        {mov.estado}
                      </Badge>
                    </UiTableCell>
                    <UiTableCell className="px-3 py-2.5">
                      <UiBox className="flex items-center justify-end gap-1">
                        <UiButton iconOnly variant="soft" color="amber" size="1" onClick={() => setShowDetalle(mov)} title="Ver detalle"><Eye size={13} /></UiButton>
                        {mov.origen === 'finanzas' && mov.estado !== 'anulado' && (
                          <UiButton iconOnly variant="soft" color="gray" size="1" onClick={() => { setEditingMov(mov); setShowForm(true); }} title="Editar"><Edit2 size={13} /></UiButton>
                        )}
                        {(mov.estado === 'pendiente' || mov.estado === 'parcial') && (
                          <UiButton iconOnly variant="soft" color="blue" size="1" onClick={() => setShowAbono(mov)} title="Abonar"><Wallet size={13} /></UiButton>
                        )}
                        {mov.estado !== 'anulado' && (
                          <UiButton iconOnly variant="soft" color="red" size="1" onClick={() => handleAnular(mov.id)} title="Anular"><Trash2 size={13} /></UiButton>
                        )}
                      </UiBox>
                    </UiTableCell>
                  </UiTableRow>
                ))}
              </UiTableBody>
            </UiTable>
          </UiBox>
        )}
      </UiBox>

      {showForm && (
        <MovimientoForm
          movimiento={editingMov}
          onClose={() => { setShowForm(false); setEditingMov(null); }}
          onSave={handleSave}
          db={db}
          usuario={usuario}
          showToast={showToast}
        />
      )}

      {showAbono && (
        <MovimientoAbono
          movimiento={showAbono}
          onClose={() => setShowAbono(null)}
          onSave={handleAbonoSave}
          db={db}
          usuario={usuario}
          showToast={showToast}
        />
      )}

      {showDetalle && (
        <MovimientoDetalle
          movimiento={showDetalle}
          onClose={() => setShowDetalle(null)}
        />
      )}
    </UiBox>
  );
}
