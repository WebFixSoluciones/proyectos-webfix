import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, Wallet, TrendingUp, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { getCxC, getAging, registrarCobro, getResumenCxC } from '../../services/cxcService';
import FinancialPageHeader from './FinancialPageHeader';
import FinancialPaymentModal from './FinancialPaymentModal';
import { Badge } from '../ui/badge';
const ESTADO_BADGES = {
  pendiente: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  parcial: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  pagado: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  vencido: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
  anulado: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
};

export default function CuentasPorCobrarView({ db, usuario, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ search: '', estado: 'all', fechaDesde: '', fechaHasta: '' });
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await getCxC(db, filtros); setItems(data); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const resumen = getResumenCxC(items);
  const aging = getAging(items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado'));

  if (loading) {
    return (
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
          {[1,2,3,4].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}
        </UiBox>
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
        icon={TrendingUp}
        title="Cuentas por Cobrar (CxC)"
        description="Cartera de clientes, antigüedad de saldos y cobranzas"
        badge={`${items.length} facturas`}
        badgeColor="blue"
        actions={
          <UiButton onClick={() => {
            const h = ['Fecha','Cliente','RUC','Doc','Vence','Monto','Abonado','Saldo','Días Venc.','Estado'];
            const r = items.map(i => [formatDate(i.factura?.fecha), i.tercero?.nombre, i.tercero?.ruc, `${i.factura?.tipo} ${i.factura?.numero}`, formatDate(i.factura?.fechaVencimiento), Number(i.factura?.montoTotal).toFixed(2), (i.abonos||[]).reduce((s,p)=>s+Number(p.monto),0).toFixed(2), Number(i.saldoPendiente).toFixed(2), i.diasVencido, i.estado]);
            const csv = [h.join(','), ...r.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            const b = new Blob([csv], {type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='cxc.csv'; a.click(); URL.revokeObjectURL(u);
          }} {...{"size":"2","color":"gray","variant":"outline","className":"flex items-center gap-1"}}>
            <Download size={14} /> Exportar CSV
          </UiButton>
        }
      />
      {/* KPIs */}
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><DollarSign size={14} {...{"style":{"color":"var(--blue-12)"}}} />Cartera Total</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{formatCurrency(resumen.totalCartera)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><AlertTriangle size={14} {...{"style":{"color":"var(--red-12)"}}} />Cartera Vencida</UiBox>
          <UiBox {...{"style":{"color":"var(--red-12)"}}}>{formatCurrency(resumen.totalVencido)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><TrendingUp size={14} {...{"style":{"color":"var(--green-12)"}}} />Cobros del Período</UiBox>
          <UiBox {...{"style":{"color":"var(--green-12)"}}}>{formatCurrency(resumen.totalCobrado)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><FileText size={14} {...{"style":{"color":"var(--gray-12)"}}} />Documentos</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{resumen.conteo}</UiBox>
        </UiCard>
      </UiBox>

      {/* Aging */}
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1"}}><Clock size={14} /> Antigüedad de Saldos</UiHeading>
        <UiBox {...{"className":"grid grid-cols-4 gap-3 text-center"}}>
          {Object.entries(aging).map(([k, v]) => (
            <UiBox key={k} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-2"}, {}, (k === '+90' ? {"style":{"backgroundColor":"var(--gray-2)"}} : (k === '61-90' ? {"style":{"backgroundColor":"var(--amber-3)"}} : {"style":{"backgroundColor":"var(--color-panel-solid)"}})))}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>{k} días</UiBox>
              <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{v.count}</UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>{formatCurrency(v.total)}</UiBox>
            </UiBox>
          ))}
        </UiBox>
      </UiCard>

      {/* Filtros */}
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiBox {...{"className":"flex flex-wrap items-center gap-3"}}>
          <UiBox className="flex-1 min-w-[200px]">
            <UiInput
              type="text"
              value={filtros.search}
              onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar cliente, RUC, documento..."
              iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
              size="2"
              color="gray"
              className="w-full"
            />
          </UiBox>
          <UiSelect value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            {...{"size":"2","color":"gray"}}>
            <option value="all">Todos</option><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option>
          </UiSelect>
          <UiInput type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            {...{"size":"2","color":"gray"}} />
          <UiInput type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            {...{"size":"2","color":"gray"}} />
          <UiButton onClick={() => {
            const h = ['Fecha','Cliente','RUC','Doc','Vence','Monto','Abonado','Saldo','Días Venc.','Estado'];
            const r = items.map(i => [formatDate(i.factura?.fecha), i.tercero?.nombre, i.tercero?.ruc, `${i.factura?.tipo} ${i.factura?.numero}`, formatDate(i.factura?.fechaVencimiento), Number(i.factura?.montoTotal).toFixed(2), (i.abonos||[]).reduce((s,p)=>s+Number(p.monto),0).toFixed(2), Number(i.saldoPendiente).toFixed(2), i.diasVencido, i.estado]);
            const csv = [h.join(','), ...r.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            const b = new Blob([csv], {type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='cxc.csv'; a.click(); URL.revokeObjectURL(u);
          }} {...{"size":"2","color":"gray","variant":"outline","className":"flex items-center gap-1"}}>
            <Download size={14} /> CSV
          </UiButton>
        </UiBox>
      </UiCard>

      {/* Tabla */}
      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
        {items.length === 0 ? (
          <UiBox {...{"className":"text-center py-12"}}>
            <FileText size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
            <UiText as="p" {...{"color":"gray"}}>No hay cuentas por cobrar registradas</UiText>
          </UiBox>
        ) : (
          <UiBox {...{"className":"overflow-x-auto"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader>
                <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Fecha</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Cliente</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Documento</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden sm:table-cell"}}>Vence</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Monto</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right hidden md:table-cell"}}>Abonado</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Saldo</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center hidden sm:table-cell"}}>Días</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center"}}>Estado</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Acción</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                {items.map(item => (
                  <UiTableRow key={item.id} {...mergeThemeProps({}, {}, (item.diasVencido > 90 ? {"style":{"backgroundColor":"var(--red-3)"}} : {}))}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5 whitespace-nowrap"}}>{formatDate(item.factura?.fecha)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5"}}>{item.tercero?.nombre}<br /><UiText {...{"color":"gray"}}>{item.tercero?.ruc}</UiText></UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5"}}>{item.factura?.tipo}<br /><UiText {...{"color":"gray"}}>{item.factura?.numero}</UiText></UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5 hidden sm:table-cell"}}>{formatDate(item.factura?.fechaVencimiento)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2.5 text-right"}}>{formatCurrency(item.factura?.montoTotal)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--green-12)"},"className":"px-3 py-2.5 text-right hidden md:table-cell"}}>{formatCurrency((item.abonos || []).reduce((s, p) => s + Number(p.monto), 0))}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--amber-12)"},"className":"px-3 py-2.5 text-right"}}>{formatCurrency(item.saldoPendiente)}</UiTableCell>
                    <UiTableCell {...{"className":"px-3 py-2.5 text-center hidden sm:table-cell"}}>
                      <UiText {...mergeThemeProps({"size":"1","weight":"medium"}, {}, (item.diasVencido > 90 ? {"color":"red"} : (item.diasVencido > 30 ? {"color":"amber"} : {"color":"gray","highContrast":true})))}>
                        {item.diasVencido > 0 ? item.diasVencido : '-'}
                      </UiText>
                    </UiTableCell>
                    <UiTableCell className="px-3 py-2.5 text-center">
                      <Badge variant="soft" color={item.estado === 'pagado' ? 'green' : item.estado === 'pendiente' ? 'amber' : item.estado === 'vencido' ? 'red' : 'blue'} size="1">
                        {item.estado}
                      </Badge>
                    </UiTableCell>
                    <UiTableCell className="px-3 py-2.5">
                      <UiBox className="flex justify-end">
                        {(item.estado === 'pendiente' || item.estado === 'parcial' || item.estado === 'vencido') && (
                          <UiButton
                            iconOnly
                            variant="soft"
                            color="green"
                            size="1"
                            onClick={() => setSelectedItemForPayment(item)}
                            title="Registrar cobro"
                          >
                            <Wallet size={13} />
                          </UiButton>
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

      {/* MODAL COBRO FORMAL */}
      {selectedItemForPayment && (
        <FinancialPaymentModal
          isOpen={!!selectedItemForPayment}
          onClose={() => setSelectedItemForPayment(null)}
          item={selectedItemForPayment}
          type="cobro"
          db={db}
          showToast={showToast}
          onConfirm={async (paymentData) => {
            await registrarCobro(db, selectedItemForPayment.id, paymentData, usuario);
            cargar();
          }}
        />
      )}
    </UiBox>
  );
}
