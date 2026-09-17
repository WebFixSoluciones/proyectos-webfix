import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText } from '../ui/layout';
import { UiButton, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { X, Calendar, User, FileText, CreditCard, Banknote, Clock, History } from 'lucide-react';

const ESTADO_BADGES = {
  pendiente: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  parcial: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  pagado: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  anulado: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
};

const TIPO_BADGES = {
  ingreso: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  egreso: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
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
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[105] flex items-start justify-center pt-10 pb-10 overflow-y-auto"}}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-2xl mx-4"}}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-4"}}>
          <UiBox {...{"className":"flex items-center gap-3"}}>
            <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true}}>Detalle del Movimiento</UiHeading>
            <UiText {...mergeThemeProps({"size":"1","className":"inline-flex px-2 py-0.5"}, {}, resolveThemeProps(TIPO_BADGES[m.tipo]))}>
              {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
            </UiText>
            <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"inline-flex px-2 py-0.5"}, {}, resolveThemeProps(ESTADO_BADGES[m.estado]))}>
              {m.estado}
            </UiText>
          </UiBox>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={18} /></UiButton>
        </UiBox>

        <UiBox {...{"className":"px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar"}}>
          <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
            <UiBox {...{"className":"flex items-center gap-2"}}><Calendar size={14} {...{"style":{"color":"var(--gray-11)"}}} /><UiText {...{"color":"gray"}}>Fecha:</UiText><UiText {...{"color":"gray","highContrast":true,"weight":"medium"}}>{formatDate(m.fecha)}</UiText></UiBox>
            <UiBox {...{"className":"flex items-center gap-2"}}><Calendar size={14} {...{"style":{"color":"var(--gray-11)"}}} /><UiText {...{"color":"gray"}}>Vencimiento:</UiText><UiText {...{"color":"gray","highContrast":true}}>{formatDate(m.fechaVencimiento)}</UiText></UiBox>
            <UiBox {...{"className":"flex items-center gap-2"}}><FileText size={14} {...{"style":{"color":"var(--gray-11)"}}} /><UiText {...{"color":"gray"}}>Documento:</UiText><UiText {...{"color":"gray","highContrast":true,"weight":"medium"}}>{m.documento?.tipo} #{m.documento?.numero}</UiText></UiBox>
            <UiBox {...{"className":"flex items-center gap-2"}}><CreditCard size={14} {...{"style":{"color":"var(--gray-11)"}}} /><UiText {...{"color":"gray"}}>Método:</UiText><UiText {...{"color":"gray","highContrast":true}}>{m.metodoPago?.replace('_', ' ')}</UiText></UiBox>
            <UiBox {...{"className":"flex items-center gap-2"}}><User size={14} {...{"style":{"color":"var(--gray-11)"}}} /><UiText {...{"color":"gray"}}>Tercero:</UiText><UiText {...{"color":"gray","highContrast":true,"weight":"medium"}}>{m.tercero?.nombre}</UiText></UiBox>
            <UiBox {...{"className":"flex items-center gap-2"}}><Banknote size={14} {...{"style":{"color":"var(--gray-11)"}}} /><UiText {...{"color":"gray"}}>RUC:</UiText><UiText {...{"color":"gray","highContrast":true}}>{m.tercero?.ruc}</UiText></UiBox>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
            <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"p-3 text-center"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Monto Total</UiBox>
              <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{formatCurrency(m.monto)}</UiBox>
            </UiBox>
            <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","borderRadius":"var(--radius-3)"},"className":"p-3 text-center"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Abonado</UiBox>
              <UiBox {...{"style":{"color":"var(--green-12)"}}}>{formatCurrency(totalAbonado)}</UiBox>
            </UiBox>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-3 text-center"}, {}, (Number(m.saldoPendiente) > 0 ? {"style":{"backgroundColor":"var(--amber-3)"}} : {"style":{"backgroundColor":"var(--gray-2)"}}))}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Saldo Pendiente</UiBox>
              <UiBox {...mergeThemeProps({}, {}, (Number(m.saldoPendiente) > 0 ? {"style":{"color":"var(--amber-12)"}} : {"style":{"color":"var(--green-12)"}}))}>
                {formatCurrency(m.saldoPendiente)}
              </UiBox>
            </UiBox>
          </UiBox>

          <UiBox>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-2"}}>Partidas</UiHeading>
            <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
              <UiTable {...{"className":"w-full"}}>
                <UiTableHeader>
                  <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Descripción</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Categoría</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Base</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>IVA</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Ret.</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Total</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  {(m.partidas || []).map((p, i) => (
                    <UiTableRow key={i} {...{}}>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2"}}>{p.descripcion}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2"}}>{p.categoria?.replace(/_/g, ' ')}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(p.baseImponible)}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(p.iva)}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--red-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency((p.retencionFuente || 0) + (p.retencionIva || 0))}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(p.total)}</UiTableCell>
                    </UiTableRow>
                  ))}
                </UiTableBody>
              </UiTable>
            </UiBox>
          </UiBox>

          {(m.pagos || []).length > 0 && (
            <UiBox>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-2 flex items-center gap-1"}}><History size={14} /> Historial de Abonos</UiHeading>
              <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
                <UiTable {...{"className":"w-full"}}>
                  <UiTableHeader>
                    <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Fecha</UiTableHead>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Método</UiTableHead>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Referencia</UiTableHead>
                      <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Monto</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody>
                    {(m.pagos || []).map((p, i) => (
                      <UiTableRow key={i} {...{}}>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2"}}>{formatDate(p.fecha)}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2"}}>{p.metodoPago?.replace('_', ' ')}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2"}}>{p.referencia || '-'}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--green-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(p.monto)}</UiTableCell>
                      </UiTableRow>
                    ))}
                  </UiTableBody>
                </UiTable>
              </UiBox>
            </UiBox>
          )}

          {m.notas && (
            <UiBox>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-1"}}>Notas</UiHeading>
              <UiText as="p" {...{"size":"2","color":"gray","className":"p-3"}}>{m.notas}</UiText>
            </UiBox>
          )}

          <UiBox>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-2 flex items-center gap-1"}}><Clock size={14} /> Auditoría</UiHeading>
            <UiBox {...{"className":"space-y-1"}}>
              {(m.auditLog || []).slice(-5).reverse().map((log, i) => (
                <UiBox key={i} {...{"style":{"color":"var(--gray-11)","backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"flex justify-between px-3 py-1.5"}}>
                  <UiText><UiText {...{"weight":"medium","color":"gray","highContrast":true}}>{log.accion}</UiText> por {log.usuario}</UiText>
                  <UiText>{formatDate(log.fecha)}</UiText>
                </UiBox>
              ))}
            </UiBox>
          </UiBox>
        </UiBox>

        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex items-center justify-end px-5 py-4"}}>
          <UiButton onClick={onClose}
            {...{"size":"2","color":"gray","variant":"outline"}}>
            Cerrar
          </UiButton>
        </UiBox>
      </UiCard>
    </UiBox>
  );
}
