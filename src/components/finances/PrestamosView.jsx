import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiInput } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import { Landmark, Plus, Wallet, AlertTriangle, DollarSign, TrendingDown, CalendarDays, X, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getPrestamos, crearPrestamo, pagarCuota, eliminarPrestamo, getResumenPrestamos, getAlertasPrestamos, generarTablaAmortizacion } from '../../services/prestamosService';
import FinancialPageHeader from './FinancialPageHeader';

const METODOS = [
  { value: 'frances', label: 'Francés (Cuota Fija)' },
  { value: 'aleman', label: 'Alemán (Capital Fijo)' },
  { value: 'americano', label: 'Americano (Intereses al Final)' },
];

const ESTADO_BADGES = {
  vigente: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  mora: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
  cancelado: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
};

const CUOTA_ESTADO_BADGES = {
  pendiente: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  parcial: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  pagado: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  vencido: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
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
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>{[1,2,3,4].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}</UiBox>
        {[1,2,3].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-16"}} />)}
      </UiBox>
    );
  }

  if (error) {
    return (
      <UiBox {...{"className":"text-center py-12"}}>
        <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-2"}}>Error al cargar</UiBox>
        <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>{error}</UiText>
        <UiButton onClick={cargar} {...{"variant":"solid","color":"blue","size":"2"}}>Reintentar</UiButton>
      </UiBox>
    );
  }

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <FinancialPageHeader
        icon={Landmark}
        title="Préstamos Bancarios"
        description="Pasivos de financiamiento, tablas de amortización y cuotas"
        badge={`${prestamos.length} préstamos`}
        badgeColor="red"
        actions={
          <UiButton onClick={() => setShowForm(true)} {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5"}}>
            <Plus size={14} /> Nuevo Préstamo
          </UiButton>
        }
      />
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><DollarSign size={14} {...{"style":{"color":"var(--red-12)"}}} />Total Deuda</UiBox>
          <UiBox {...{"style":{"color":"var(--red-12)"}}}>{formatCurrency(resumen.totalDeuda)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"}}}>{resumen.conteo} préstamo(s) activo(s)</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><TrendingDown size={14} {...{"style":{"color":"var(--blue-12)"}}} />Capital Pagado</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{formatCurrency(resumen.capitalPagado)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><DollarSign size={14} {...{"style":{"color":"var(--amber-12)"}}} />Interés Pagado</UiBox>
          <UiBox {...{"style":{"color":"var(--amber-12)"}}}>{formatCurrency(resumen.interesPagado)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><AlertCircle size={14} {...{"style":{"color":"var(--red-12)"}}} />Cuotas Vencidas</UiBox>
          <UiBox {...{"style":{"color":"var(--red-12)"}}}>{resumen.cuotasVencidas}</UiBox>
        </UiCard>
      </UiBox>

      {alertas.length > 0 && (
        <UiBox {...{"style":{"backgroundColor":"var(--amber-3)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-4"}}>
          <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"amber","className":"flex items-center gap-1 mb-2"}}><AlertTriangle size={14} /> Cuotas Vencidas ({alertas.length})</UiHeading>
          <UiBox {...{"className":"space-y-1 max-h-32 overflow-y-auto"}}>
            {alertas.slice(0, 10).map((a, i) => (
              <UiBox key={i} {...{"style":{"color":"var(--gray-12)"}}}>
                <UiText {...{"weight":"medium"}}>{a.entidad}</UiText> — Cuota #{a.cuota} vencida hace {a.dias} día(s)
              </UiBox>
            ))}
            {alertas.length > 10 && <UiBox {...{"style":{"color":"var(--gray-11)"}}}>+{alertas.length - 10} alerta(s) más</UiBox>}
          </UiBox>
        </UiBox>
      )}

      <UiBox {...{"className":"flex flex-wrap items-center gap-3"}}>
        <UiButton onClick={() => setShowForm(true)} {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5"}}>
          <Plus size={14} /> Nuevo Préstamo
        </UiButton>
        <UiSelect value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          {...{"size":"2","color":"gray"}}>
          <option value="all">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="mora">En Mora</option>
          <option value="cancelado">Cancelado</option>
        </UiSelect>
      </UiBox>

      <UiBox {...{"className":"space-y-3"}}>
        {filtrados.length === 0 ? (
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"py-12 text-center"}}>
            <Landmark size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
            <UiText as="p" {...{"color":"gray"}}>No hay préstamos registrados</UiText>
          </UiCard>
        ) : (
          filtrados.map(p => (
            <UiBox key={p.id} {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
              <UiBox
                {...{"className":"p-4 cursor-pointer"}}
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <UiBox {...{"className":"flex items-center justify-between"}}>
                  <UiBox {...{"className":"flex items-center gap-3"}}>
                    <Landmark size={20} {...(p.estado === 'mora' ? {"style":{"color":"var(--red-12)"}} : (p.estado === 'cancelado' ? {"style":{"color":"var(--gray-11)"}} : {"style":{"color":"var(--blue-12)"}}))} />
                    <UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{p.entidad}</UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Contrato: {p.numeroContrato || 'N/A'} | {METODOS.find(m => m.value === p.metodoAmortizacion)?.label || p.metodoAmortizacion}</UiBox>
                    </UiBox>
                  </UiBox>
                  <UiBox {...{"className":"flex items-center gap-4"}}>
                    <UiBox {...{"className":"text-right hidden sm:block"}}>
                      <UiBox {...{"style":{"color":"var(--red-12)"}}}>{formatCurrency(p.saldoPendiente)}</UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-11)"}}}>de {formatCurrency(p.montoDesembolsado)}</UiBox>
                    </UiBox>
                    <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"px-2 py-0.5"}, {}, (ESTADO_BADGES[p.estado] || resolveThemeProps(ESTADO_BADGES.vigente)))}>{p.estado}</UiText>
                    <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2"}}>
                      <UiText {...{"className":"flex items-center gap-1"}}><CheckCircle2 size={12} {...{"style":{"color":"var(--green-12)"}}} />{p.cuotasPagadas || 0}</UiText>
                      <UiText {...{"className":"flex items-center gap-1"}}><Clock size={12} {...{"style":{"color":"var(--blue-12)"}}} />{p.cuotasPendientes || 0}</UiText>
                      {p.cuotasVencidas > 0 && <UiText {...{"className":"flex items-center gap-1"}}><AlertCircle size={12} {...{"style":{"color":"var(--red-12)"}}} />{p.cuotasVencidas}</UiText>}
                    </UiBox>
                    {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </UiBox>
                </UiBox>
                <UiBox {...{"className":"mt-2 sm:hidden"}}>
                  <UiBox {...{"style":{"color":"var(--red-12)"}}}>{formatCurrency(p.saldoPendiente)} <UiText {...{"size":"1","color":"gray","weight":"regular"}}>de {formatCurrency(p.montoDesembolsado)}</UiText></UiBox>
                </UiBox>
              </UiBox>

              {expandedId === p.id && (
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"}}}>
                  <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"px-4 py-3 flex flex-wrap gap-3"}}>
                    <UiText><UiText {...{"color":"gray"}}>Tasa:</UiText> <UiText {...{"weight":"medium"}}>{p.tasaInteres}% mensual</UiText></UiText>
                    <UiText><UiText {...{"color":"gray"}}>Plazo:</UiText> <UiText {...{"weight":"medium"}}>{p.plazoMeses} meses</UiText></UiText>
                    <UiText><UiText {...{"color":"gray"}}>Desembolso:</UiText> <UiText {...{"weight":"medium"}}>{formatDate(p.fechaDesembolso)}</UiText></UiText>
                    <UiText><UiText {...{"color":"gray"}}>Capital pagado:</UiText> <UiText {...{"weight":"medium","color":"blue"}}>{formatCurrency(p.capitalPagado)}</UiText></UiText>
                    <UiText><UiText {...{"color":"gray"}}>Interés pagado:</UiText> <UiText {...{"weight":"medium","color":"amber"}}>{formatCurrency(p.interesPagado)}</UiText></UiText>
                  </UiBox>

                  <UiBox {...{"className":"overflow-x-auto"}}>
                    <UiTable {...{"className":"w-full"}}>
                      <UiTableHeader>
                        <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>#</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Vence</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Capital</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Interés</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Cuota</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Saldo</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-center"}}>Estado</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Acción</UiTableHead>
                        </UiTableRow>
                      </UiTableHeader>
                      <UiTableBody>
                        {(p.cuotas || []).map(c => (
                          <UiTableRow key={c.numero} {...mergeThemeProps({}, {}, (c.estado === 'vencido' ? {"style":{"backgroundColor":"var(--red-3)"}} : (c.estado === 'pagado' ? {"style":{"backgroundColor":"var(--green-3)"}} : {})))}>
                            <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2"}}>{c.numero}</UiTableCell>
                            <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 whitespace-nowrap"}}>{formatDate(c.fechaVencimiento)}</UiTableCell>
                            <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(c.capital)}</UiTableCell>
                            <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(c.interes)}</UiTableCell>
                            <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(c.cuotaTotal)}</UiTableCell>
                            <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(c.saldoPendiente)}</UiTableCell>
                            <UiTableCell {...{"className":"px-3 py-2 text-center"}}>
                              <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"inline-flex px-1.5 py-0.5"}, {}, (CUOTA_ESTADO_BADGES[c.estado] || {}))}>
                                {c.estado === 'pagado' && formatDate(c.fechaPago) !== '-' ? formatDate(c.fechaPago) : c.estado}
                              </UiText>
                            </UiTableCell>
                            <UiTableCell {...{"className":"px-3 py-2 text-right"}}>
                              {(c.estado === 'pendiente' || c.estado === 'vencido' || c.estado === 'parcial') && (
                                <UiButton
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
                                  {...{"size":"2","variant":"solid","color":"green","className":"hover:opacity-90"}}
                                >
                                  <Wallet size={12} {...{"className":"inline mr-1"}} />Pagar
                                </UiButton>
                              )}
                            </UiTableCell>
                          </UiTableRow>
                        ))}
                      </UiTableBody>
                    </UiTable>
                  </UiBox>

                  {p.estado !== 'cancelado' && (
                    <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"px-4 py-3 flex justify-end"}}>
                      <UiButton
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`¿Eliminar préstamo de ${p.entidad}?`)) return;
                          try {
                            await eliminarPrestamo(db, p.id, usuario);
                            showToast('Préstamo eliminado', 'success');
                            cargar();
                          } catch (err) { showToast('Error: ' + err.message, 'error'); }
                        }}
                        {...{"size":"2","color":"red","variant":"outline"}}
                      >
                        Eliminar Préstamo
                      </UiButton>
                    </UiBox>
                  )}
                </UiBox>
              )}
            </UiBox>
          ))
        )}
      </UiBox>

      {showForm && <FormPrestamo db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowForm(false); cargar(); }} />}
    </UiBox>
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
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={onClose}>
      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"w-full max-w-2xl max-h-[90vh] overflow-y-auto"}} onClick={e => e.stopPropagation()}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center justify-between px-5 py-3 sticky top-0 z-10"}}>
          <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Nuevo Préstamo Bancario</UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
        </UiCard>
        <UiBox {...{"className":"p-5 space-y-3"}}>
          <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
            <Input label="Entidad financiera *" placeholder="Banco Pichincha, Produbanco..." value={form.entidad} onChange={v => update('entidad', v)} />
            <Input label="N° Contrato" placeholder="PREST-001" value={form.numeroContrato} onChange={v => update('numeroContrato', v)} />
          </UiBox>
          <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
            <Input label="Monto desembolsado *" placeholder="10000" type="number" value={form.montoDesembolsado} onChange={v => { update('montoDesembolsado', v); setPreview(null); }} />
            <Input label="Tasa mensual (%) *" placeholder="1.5" type="number" value={form.tasaInteres} onChange={v => { update('tasaInteres', v); setPreview(null); }} />
            <Input label="Plazo (meses) *" placeholder="12" type="number" value={form.plazoMeses} onChange={v => { update('plazoMeses', v); setPreview(null); }} />
          </UiBox>
          <UiBox {...{"className":"space-y-1"}}>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray"}}>Método de amortización *</UiLabel>
            <UiSelect value={form.metodoAmortizacion} onChange={e => { update('metodoAmortizacion', e.target.value); setPreview(null); }}
              {...{"size":"2","color":"gray","className":"w-full"}}>
              {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </UiSelect>
          </UiBox>
          <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
            <Input label="Fecha desembolso" type="date" value={form.fechaDesembolso} onChange={v => update('fechaDesembolso', v)} />
            <Input label="Fecha inicio pagos *" type="date" value={form.fechaInicio} onChange={v => { update('fechaInicio', v); setPreview(null); }} />
          </UiBox>

          <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-2"}}>
            <UiButton onClick={generarPreview} {...{"size":"2","variant":"solid","color":"blue"}}>
              <CalendarDays size={14} {...{"className":"inline mr-1"}} /> Generar Tabla de Amortización
            </UiButton>
          </UiBox>

          {preview && (
            <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"px-3 py-2 flex justify-between items-center"}}>
                <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Tabla de Amortización ({METODOS.find(m => m.value === form.metodoAmortizacion)?.label})</UiText>
                <UiText {...{"size":"1","color":"gray"}}>Total interés: <UiText {...{"weight":"bold","color":"amber"}}>{`$${totalInteres.toFixed(2)}`}</UiText> | Total a pagar: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>{`$${totalCuotas.toFixed(2)}`}</UiText></UiText>
              </UiBox>
              <UiBox {...{"className":"overflow-x-auto max-h-48 overflow-y-auto"}}>
                <UiTable {...{"className":"w-full"}}>
                  <UiTableHeader {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"sticky top-0"}}>
                    <UiTableRow {...{}}>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-2 py-1.5 text-left"}}>#</UiTableHead>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-2 py-1.5 text-right"}}>Capital</UiTableHead>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-2 py-1.5 text-right"}}>Interés</UiTableHead>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-2 py-1.5 text-right"}}>Cuota</UiTableHead>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-2 py-1.5 text-right"}}>Saldo</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody>
                    {preview.map(c => (
                      <UiTableRow key={c.numero} {...{}}>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-2 py-1.5"}}>{c.numero}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-2 py-1.5 text-right"}}>${c.capital.toFixed(2)}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--amber-12)"},"className":"px-2 py-1.5 text-right"}}>${c.interes.toFixed(2)}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-2 py-1.5 text-right"}}>${c.cuotaTotal.toFixed(2)}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-2 py-1.5 text-right"}}>${c.saldoPendiente.toFixed(2)}</UiTableCell>
                      </UiTableRow>
                    ))}
                  </UiTableBody>
                </UiTable>
              </UiBox>
            </UiBox>
          )}
        </UiBox>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex justify-end gap-2 px-5 py-3 sticky bottom-0"}}>
          <UiButton onClick={onClose} {...{"size":"2","variant":"outline","color":"gray"}}>Cancelar</UiButton>
          <UiButton onClick={handleSubmit} disabled={saving} {...{"size":"2","variant":"solid","color":"blue","className":"disabled:opacity-50"}}>{saving ? 'Guardando...' : 'Crear Préstamo'}</UiButton>
        </UiCard>
      </UiBox>
    </UiBox>
  );
}

function Input({ label, ...props }) {
  return (
    <UiBox {...{"className":"space-y-1"}}>
      {label && <UiLabel {...{"size":"1","weight":"medium","color":"gray"}}>{label}</UiLabel>}
      <UiInput {...props} {...{"size":"2","color":"gray","className":"w-full"}} />
    </UiBox>
  );
}
