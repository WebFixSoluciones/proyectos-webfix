import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiSelect, UiInput, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Download, Plus, Wallet, AlertTriangle, DollarSign, Clock, CalendarDays, Tag, X } from 'lucide-react';
import { getTarjetas, getAllConsumosTarjeta, getResumenTarjetas, getAlertasProximidad, crearTarjeta, registrarConsumo, registrarPagoTarjeta } from '../../services/tarjetasService';
import FinancialPageHeader from './FinancialPageHeader';

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
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>{[1,2,3,4].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}</UiBox>
        {[1,2,3,4,5].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-12"}} />)}
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
        icon={CreditCard}
        title="Tarjetas y Créditos"
        description="Administración de tarjetas corporativas, cupos y consumos diferidos"
        badge={`${tarjetas.length} tarjetas`}
        badgeColor="purple"
        actions={
          <UiBox className="flex items-center gap-2">
            <UiButton onClick={() => setShowFormTarjeta(true)} {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5"}}>
              <Plus size={14} /> Nueva Tarjeta
            </UiButton>
            <UiButton onClick={() => setShowFormConsumo(true)} disabled={tarjetas.length === 0} {...{"size":"2","variant":"surface","color":"blue","className":"flex items-center gap-1.5"}}>
              <Plus size={14} /> Registrar Consumo
            </UiButton>
          </UiBox>
        }
      />
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><DollarSign size={14} {...{"style":{"color":"var(--blue-12)"}}} />Total Cupo</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{formatCurrency(resumen.totalCupo)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><CreditCard size={14} {...{"style":{"color":"var(--amber-12)"}}} />Total Utilizado</UiBox>
          <UiBox {...{"style":{"color":"var(--amber-12)"}}}>{formatCurrency(resumen.totalUtilizado)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Wallet size={14} {...{"style":{"color":"var(--green-12)"}}} />Total Disponible</UiBox>
          <UiBox {...{"style":{"color":"var(--green-12)"}}}>{formatCurrency(resumen.totalDisponible)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><CalendarDays size={14} {...{"style":{"color":"var(--red-12)"}}} />Próximos Pagos</UiBox>
          <UiBox {...{"style":{"color":"var(--red-12)"}}}>{resumen.proximosPagos}</UiBox>
        </UiCard>
      </UiBox>

      {alertas.length > 0 && (
        <UiBox {...{"style":{"backgroundColor":"var(--amber-3)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-4"}}>
          <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"amber","className":"flex items-center gap-1 mb-2"}}><AlertTriangle size={14} /> Alertas</UiHeading>
          <UiBox {...{"className":"space-y-1"}}>
            {alertas.map((a, i) => (
              <UiBox key={i} {...{"style":{"color":"var(--gray-12)"}}}>
                <UiText {...{"weight":"medium"}}>{a.emisor} ****{a.numero}</UiText> — {a.mensaje}
              </UiBox>
            ))}
          </UiBox>
        </UiBox>
      )}

      <UiBox {...{"className":"flex flex-wrap items-center gap-3"}}>
        <UiButton onClick={() => setShowFormTarjeta(true)} {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5"}}>
          <Plus size={14} /> Nueva Tarjeta
        </UiButton>
        <UiButton onClick={() => setShowFormConsumo(true)} disabled={tarjetas.length === 0} {...{"size":"2","variant":"solid","color":"amber","className":"flex items-center gap-1.5 disabled:opacity-50"}}>
          <CreditCard size={14} /> Nuevo Consumo
        </UiButton>
        <UiButton onClick={() => setShowFormPago(true)} disabled={tarjetas.length === 0} {...{"size":"2","variant":"solid","color":"green","className":"flex items-center gap-1.5 disabled:opacity-50"}}>
          <Wallet size={14} /> Registrar Pago
        </UiButton>
      </UiBox>

      {tarjetas.length > 0 && (
        <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}}>
          {tarjetas.map(t => {
            const uso = t.cupoTotal > 0 ? Math.round((t.saldoUtilizado / t.cupoTotal) * 100) : 0;
            return (
              <UiCard key={t.id} {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
                <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                  <UiBox {...{"className":"flex items-center gap-2"}}>
                    <CreditCard size={18} {...(uso > 80 ? {"style":{"color":"var(--red-12)"}} : (uso > 50 ? {"style":{"color":"var(--amber-12)"}} : {"style":{"color":"var(--blue-12)"}}))} />
                    <UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{t.emisor}</UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-11)"}}}>****{t.numero}</UiBox>
                    </UiBox>
                  </UiBox>
                  <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"px-1.5 py-0.5"}, {}, (t.estado === 'activa' ? {"color":"gray"} : {"color":"gray"}))}>{t.estado}</UiText>
                </UiBox>
                <UiBox {...{"className":"space-y-1.5"}}>
                  <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Cupo</UiText><UiText {...{"weight":"medium","color":"gray","highContrast":true}}>{formatCurrency(t.cupoTotal)}</UiText></UiBox>
                  <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Utilizado</UiText><UiText {...{"weight":"medium","color":"amber"}}>{formatCurrency(t.saldoUtilizado)}</UiText></UiBox>
                  <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Disponible</UiText><UiText {...{"weight":"medium","color":"green"}}>{formatCurrency(t.cupoDisponible)}</UiText></UiBox>
                  <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"w-full h-1.5 mt-1"}}><UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"h-1.5"}, {}, (uso > 80 ? {"style":{"backgroundColor":"var(--red-9)"}} : (uso > 50 ? {"style":{"backgroundColor":"var(--amber-9)"}} : {"style":{"backgroundColor":"var(--blue-9)"}})))} style={{ width: `${Math.min(uso, 100)}%` }} /></UiBox>
                  <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
                    <UiText>Corte: {t.fechaCorte}</UiText><UiText>Pago: {t.fechaPago}</UiText>
                  </UiBox>
                  {t.cuotasPendientes?.length > 0 && (
                    <UiBox {...{"style":{"color":"var(--blue-12)"},"className":"flex items-center gap-1 mt-1"}}><Clock size={12} /> {t.cuotasPendientes.length} consumo(s) en cuotas</UiBox>
                  )}
                </UiBox>
              </UiCard>
            );
          })}
        </UiBox>
      )}

      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiBox {...{"className":"flex flex-wrap items-center gap-3"}}>
          <UiSelect value={filtros.tarjetaId} onChange={e => setFiltros(f => ({ ...f, tarjetaId: e.target.value }))}
            {...{"size":"2","color":"gray"}}>
            <option value="all">Todas las tarjetas</option>
            {tarjetas.map(t => <option key={t.id} value={t.id}>{t.emisor} ****{t.numero}</option>)}
          </UiSelect>
          <UiSelect value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
            {...{"size":"2","color":"gray"}}>
            <option value="all">Todos</option><option value="consumo">Consumos</option><option value="pago">Pagos</option>
          </UiSelect>
          <UiInput type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            {...{"size":"2","color":"gray"}} />
          <UiInput type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            {...{"size":"2","color":"gray"}} />
          <UiButton onClick={() => {
            const h = ['Fecha','Tarjeta','Tipo','Monto','Descripción','Categoría','Cuotas','Cuotas Pagadas','Referencia'];
            const tarjetaMap = Object.fromEntries(tarjetas.map(t => [t.id, `${t.emisor} ****${t.numero}`]));
            const r = consumos.map(c => [formatDate(c.fecha), tarjetaMap[c.tarjetaId] || '-', c.tipo, Number(c.monto).toFixed(2), c.descripcion, c.categoria, c.cuotas, c.cuotasPagadas || 0, c.referencia || '']);
            const csv = [h.join(','), ...r.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            const b = new Blob([csv], {type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='tarjetas_consumos.csv'; a.click(); URL.revokeObjectURL(u);
          }} {...{"size":"2","color":"gray","variant":"outline","className":"flex items-center gap-1"}}>
            <Download size={14} /> CSV
          </UiButton>
        </UiBox>
      </UiCard>

      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
        {consumos.length === 0 ? (
          <UiBox {...{"className":"text-center py-12"}}>
            <CreditCard size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
            <UiText as="p" {...{"color":"gray"}}>No hay consumos o pagos registrados</UiText>
          </UiBox>
        ) : (
          <UiBox {...{"className":"overflow-x-auto"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader>
                <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Fecha</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Tarjeta</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center"}}>Tipo</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden sm:table-cell"}}>Descripción</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden md:table-cell"}}>Categoría</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Monto</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center hidden sm:table-cell"}}>Cuotas</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden md:table-cell"}}>Ref.</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                {consumos.map(c => {
                  const tarjeta = tarjetas.find(t => t.id === c.tarjetaId);
                  return (
                    <UiTableRow key={c.id} {...mergeThemeProps({}, {}, (c.cuotas > 1 && (c.cuotasPagadas || 0) < c.cuotas ? {"style":{"backgroundColor":"var(--blue-3)"}} : {}))}>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5 whitespace-nowrap"}}>{formatDate(c.fecha)}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5"}}>{tarjeta ? `${tarjeta.emisor} ****${tarjeta.numero}` : '-'}</UiTableCell>
                      <UiTableCell {...{"className":"px-3 py-2.5 text-center"}}>
                        <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"inline-flex px-1.5 py-0.5"}, {}, (c.tipo === 'consumo' ? {"color":"amber"} : {"color":"gray"}))}>{c.tipo}</UiText>
                      </UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5 hidden sm:table-cell max-w-[200px] truncate"}}>{c.descripcion}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5 hidden md:table-cell"}}>
                        <UiText {...{"className":"inline-flex items-center gap-1"}}><Tag size={10} />{CATEGORIAS.find(cat => cat.value === c.categoria)?.label || c.categoria}</UiText>
                      </UiTableCell>
                      <UiTableCell {...mergeThemeProps({"className":"px-3 py-2.5 text-right"}, {}, (c.tipo === 'pago' ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--amber-12)"}}))}>{c.tipo === 'pago' ? '-' : ''}{formatCurrency(c.monto)}</UiTableCell>
                      <UiTableCell {...{"className":"px-3 py-2.5 text-center hidden sm:table-cell"}}>
                        {c.cuotas > 1 ? (
                          <UiText {...{"color":"blue"}}>{c.cuotasPagadas || 0}/{c.cuotas}</UiText>
                        ) : <UiText {...{"color":"gray"}}>-</UiText>}
                      </UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5 hidden md:table-cell"}}>{c.referencia || '-'}</UiTableCell>
                    </UiTableRow>
                  );
                })}
              </UiTableBody>
            </UiTable>
          </UiBox>
        )}
      </UiBox>

      {showFormTarjeta && <FormTarjeta db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormTarjeta(false); cargar(); }} />}
      {showFormConsumo && <FormConsumo tarjetas={tarjetas} db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormConsumo(false); cargar(); }} />}
      {showFormPago && <FormPago tarjetas={tarjetas} db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormPago(false); cargar(); }} />}
    </UiBox>
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
      <UiBox {...{"className":"space-y-3"}}>
        <Input label="Emisor *" placeholder="Banco Pichincha, Visa..." value={form.emisor} onChange={v => setForm(f => ({ ...f, emisor: v }))} />
        <Input label="Últimos 4 dígitos *" placeholder="1234" value={form.numero} onChange={v => setForm(f => ({ ...f, numero: v }))} maxLength={4} />
        <Input label="Cupo total *" placeholder="5000" type="number" value={form.cupoTotal} onChange={v => setForm(f => ({ ...f, cupoTotal: v }))} />
        <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
          <Input label="Día de corte *" placeholder="15" value={form.fechaCorte} onChange={v => setForm(f => ({ ...f, fechaCorte: v }))} />
          <Input label="Día de pago *" placeholder="25" value={form.fechaPago} onChange={v => setForm(f => ({ ...f, fechaPago: v }))} />
        </UiBox>
        <Input label="Tasa de interés (% mensual)" placeholder="1.5" type="number" value={form.tasaInteres} onChange={v => setForm(f => ({ ...f, tasaInteres: v }))} />
      </UiBox>
      <UiBox {...{"className":"flex justify-end gap-2 pt-3"}}>
        <UiButton onClick={onClose} {...{"size":"2","variant":"outline","color":"gray"}}>Cancelar</UiButton>
        <UiButton onClick={handleSubmit} disabled={saving} {...{"size":"2","variant":"solid","color":"blue","className":"disabled:opacity-50"}}>{saving ? 'Guardando...' : 'Guardar'}</UiButton>
      </UiBox>
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
      <UiBox {...{"className":"space-y-3"}}>
        <UiBox {...{"className":"space-y-1"}}>
          <UiLabel {...{"size":"1","weight":"medium","color":"gray"}}>Tarjeta *</UiLabel>
          <UiSelect value={form.tarjetaId} onChange={e => setForm(f => ({ ...f, tarjetaId: e.target.value }))}
            {...{"size":"2","color":"gray","className":"w-full"}}>
            {tarjetas.map(t => <option key={t.id} value={t.id}>{t.emisor} ****{t.numero} (Dispo: ${(t.cupoDisponible || 0).toFixed(2)})</option>)}
          </UiSelect>
        </UiBox>
        <Input label="Monto *" placeholder="100.00" type="number" value={form.monto} onChange={v => setForm(f => ({ ...f, monto: v }))} />
        <Input label="Descripción *" placeholder="Compra en proveedor X" value={form.descripcion} onChange={v => setForm(f => ({ ...f, descripcion: v }))} />
        <UiBox {...{"className":"space-y-1"}}>
          <UiLabel {...{"size":"1","weight":"medium","color":"gray"}}>Categoría</UiLabel>
          <UiSelect value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            {...{"size":"2","color":"gray","className":"w-full"}}>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </UiSelect>
        </UiBox>
        <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
          <Input label="Fecha" type="date" value={form.fecha} onChange={v => setForm(f => ({ ...f, fecha: v }))} />
          <Input label="N° autorización" placeholder="Ref. 000000" value={form.referencia} onChange={v => setForm(f => ({ ...f, referencia: v }))} />
        </UiBox>
        <Input label="Cuotas (1 = contado)" type="number" placeholder="1" value={form.cuotas} onChange={v => setForm(f => ({ ...f, cuotas: v }))} min={1} />
      </UiBox>
      <UiBox {...{"className":"flex justify-end gap-2 pt-3"}}>
        <UiButton onClick={onClose} {...{"size":"2","variant":"outline","color":"gray"}}>Cancelar</UiButton>
        <UiButton onClick={handleSubmit} disabled={saving} {...{"size":"2","variant":"solid","color":"amber","className":"disabled:opacity-50"}}>{saving ? 'Guardando...' : 'Registrar'}</UiButton>
      </UiBox>
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
      <UiBox {...{"className":"space-y-3"}}>
        <UiBox {...{"className":"space-y-1"}}>
          <UiLabel {...{"size":"1","weight":"medium","color":"gray"}}>Tarjeta *</UiLabel>
          <UiSelect value={form.tarjetaId} onChange={e => setForm(f => ({ ...f, tarjetaId: e.target.value }))}
            {...{"size":"2","color":"gray","className":"w-full"}}>
            {tarjetas.map(t => <option key={t.id} value={t.id}>{t.emisor} ****{t.numero} (Saldo: ${(t.saldoUtilizado || 0).toFixed(2)})</option>)}
          </UiSelect>
        </UiBox>
        <Input label="Monto del pago *" placeholder="500.00" type="number" value={form.monto} onChange={v => setForm(f => ({ ...f, monto: v }))} />
        <Input label="Descripción" placeholder="Pago mínimo, pago total..." value={form.descripcion} onChange={v => setForm(f => ({ ...f, descripcion: v }))} />
        <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
          <Input label="Fecha" type="date" value={form.fecha} onChange={v => setForm(f => ({ ...f, fecha: v }))} />
          <Input label="N° referencia" placeholder="Transferencia #123" value={form.referencia} onChange={v => setForm(f => ({ ...f, referencia: v }))} />
        </UiBox>
      </UiBox>
      <UiBox {...{"className":"flex justify-end gap-2 pt-3"}}>
        <UiButton onClick={onClose} {...{"size":"2","variant":"outline","color":"gray"}}>Cancelar</UiButton>
        <UiButton onClick={handleSubmit} disabled={saving} {...{"size":"2","variant":"solid","color":"green","className":"disabled:opacity-50"}}>{saving ? 'Guardando...' : 'Registrar'}</UiButton>
      </UiBox>
    </Modal>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={onClose}>
      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"w-full max-w-lg max-h-[90vh] overflow-y-auto"}} onClick={e => e.stopPropagation()}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center justify-between px-5 py-3 sticky top-0 z-10"}}>
          <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>{title}</UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
        </UiCard>
        <UiBox {...{"className":"p-5"}}>{children}</UiBox>
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
