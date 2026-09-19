import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiHeading, UiCard } from '../ui/layout';
import { UiButton, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiInput } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, Calculator, AlertTriangle, CheckCircle2, XCircle,
  Search, RefreshCw, FileDown, Percent, TrendingUp, TrendingDown,
  Receipt, AlertCircle, Calendar
} from 'lucide-react';
import {
  getResumenImpuestos, generarAtsCompleto, descargarAtsXml, validarRuc
} from '../../services/impuestosService';
import FinancialPageHeader from './FinancialPageHeader';

const TABS = [
  { id: 'iva', label: 'IVA', icon: Percent },
  { id: 'retenciones', label: 'Retenciones', icon: Receipt },
  { id: 'ats', label: 'ATS', icon: FileText },
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const URGENCIA_BADGES = {
  vencido: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
  proximo: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  ok: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
};

export default function ImpuestosSriView({ db, usuario, showToast, transactions = [] }) {
  const now = new Date();
  const [tab, setTab] = useState('iva');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [atsPreview, setAtsPreview] = useState('');
  const [atsGenerating, setAtsGenerating] = useState(false);
  const [atsData, setAtsData] = useState(null);
  const [rucValidate, setRucValidate] = useState('');
  const [rucResult, setRucResult] = useState(null);

  const fmt = (v) => `$${(Number(v) || 0).toFixed(2)}`;

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getResumenImpuestos(db, year, month, transactions);
      setResumen(data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, year, month, transactions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const handleGenerarAts = async () => {
    setAtsGenerating(true);
    try {
      const companyProfile = {
        ruc: usuario?.ruc || usuario?.empresa?.ruc || '1790000000001',
        razonSocial: usuario?.empresa?.razonSocial || usuario?.nombre || 'EMPRESA REGISTRADA',
        establecimiento: usuario?.empresa?.establecimiento || '001',
      };
      const result = await generarAtsCompleto(db, companyProfile, year, month, transactions);
      setAtsPreview(result.xml);
      setAtsData(result);
      if (result.warnings?.length > 0) {
        result.warnings.forEach(w => showToast?.(w, 'warning'));
      }
      showToast?.('ATS generado correctamente', 'success');
    } catch (e) {
      showToast?.('Error al generar ATS: ' + e.message, 'error');
    } finally { setAtsGenerating(false); }
  };

  const handleDescargarAts = () => {
    if (!atsData) return;
    try {
      const companyProfile = {
        ruc: usuario?.ruc || usuario?.empresa?.ruc || '1790000000001',
        razonSocial: usuario?.empresa?.razonSocial || usuario?.nombre || 'EMPRESA REGISTRADA',
        establecimiento: usuario?.empresa?.establecimiento || '001',
      };
      descargarAtsXml({
        companyProfile,
        year: String(year),
        month: String(month),
        transactions: [],
      });
      showToast?.('ATS descargado', 'success');
    } catch (e) {
      showToast?.('Error al descargar: ' + e.message, 'error');
    }
  };

  const handleValidarRuc = () => {
    if (!rucValidate.trim()) { showToast?.('Ingrese un RUC', 'warning'); return; }
    const result = validarRuc(rucValidate.trim());
    setRucResult(result);
  };

  if (loading && !resumen) {
    return (
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
          {[1, 2, 3, 4].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}
        </UiBox>
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-64"}} />
      </UiBox>
    );
  }

  if (error) {
    return (
      <UiBox {...{"className":"text-center py-12"}}>
        <AlertCircle size={40} {...{"style":{"color":"var(--red-12)"},"className":"mx-auto mb-3"}} />
        <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-2"}}>Error al cargar impuestos</UiBox>
        <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>{error}</UiText>
        <UiButton onClick={cargar} {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-2 mx-auto"}}><RefreshCw size={14} />Reintentar</UiButton>
      </UiBox>
    );
  }

  const { iva, retenciones, documentos, vencimientos } = resumen || {};

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <FinancialPageHeader
        icon={Calculator}
        title="Impuestos y SRI"
        description="Declaración mensual de IVA, retenciones en la fuente y generación de ATS"
        badge="Ecuador SRI"
        badgeColor="blue"
        actions={
          <UiBox {...{"className":"flex items-center gap-2"}}>
            <UiSelect value={month} onChange={e => setMonth(Number(e.target.value))}
              {...{"size":"2","color":"gray"}}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </UiSelect>
            <UiSelect value={year} onChange={e => setYear(Number(e.target.value))}
              {...{"size":"2","color":"gray"}}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </UiSelect>
            <UiButton iconOnly onClick={cargar} {...{"variant":"surface","color":"gray","className":"w-8"}} title="Refrescar datos">
              <RefreshCw size={14} />
            </UiButton>
          </UiBox>
        }
      />

      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <Percent size={14} {...{"style":{"color":"var(--blue-12)"}}} />IVA del Mes
          </UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{fmt(iva?.aPagar)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-0.5"}}>
            {iva?.creditoFiscal > 0 ? `Crédito fiscal: ${fmt(iva.creditoFiscal)}` : `Sobre ${fmt(iva?.baseImponibleVentas)} base`}
          </UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <Receipt size={14} {...{"style":{"color":"var(--amber-11)"}}} />Retenciones
          </UiBox>
          <UiBox {...{"style":{"color":"var(--amber-12)"}}}>{fmt(retenciones?.total)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-0.5"}}>Fuente: {fmt(retenciones?.fuente)} | IVA: {fmt(retenciones?.iva)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <FileText size={14} {...{"style":{"color":"var(--blue-11)"}}} />Documentos
          </UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{documentos?.total || 0}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-0.5"}}>{documentos?.autorizados || 0} autorizados | {documentos?.pendientes || 0} pendientes</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <Calendar size={14} {...{"style":{"color":"var(--green-11)"}}} />Vencimientos
          </UiBox>
          <UiBox {...{}}>
            <UiText {...(vencimientos?.some(v => v.vencido) ? {"color":"red"} : {"color":"green"})}>
              {vencimientos?.filter(v => v.vencido).length || 0}
            </UiText>
          </UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-0.5"}}>
            {vencimientos?.filter(v => !v.vencido && v.diasRestantes <= 5).length || 0} próximos a vencer
          </UiBox>
        </UiCard>
      </UiBox>

      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex gap-1 pb-0"}}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <UiButton key={t.id} onClick={() => setTab(t.id)}
              {...mergeThemeProps({"size":"2","className":"-mb-px flex items-center gap-1.5"}, {}, (tab === t.id ? {"color":"blue"} : {"color":"gray"}))}>
              <Icon size={14} />{t.label}
            </UiButton>
          );
        })}
      </UiBox>

      {tab === 'iva' && <IvaTab iva={iva} fmt={fmt} />}
      {tab === 'retenciones' && <RetencionesTab retenciones={retenciones} fmt={fmt} />}
      {tab === 'ats' && (
        <AtsTab
          atsPreview={atsPreview}
          atsGenerating={atsGenerating}
          atsData={atsData}
          rucValidate={rucValidate}
          rucResult={rucResult}
          setRucValidate={setRucValidate}
          setRucResult={setRucResult}
          onGenerar={handleGenerarAts}
          onDescargar={handleDescargarAts}
          onValidarRuc={handleValidarRuc}
          fmt={fmt}
        />
      )}

      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-2 mb-3"}}>
          <Calendar size={14} {...{"style":{"color":"var(--blue-12)"}}} />Vencimientos Tributarios — {MESES[month - 1]} {year}
        </UiHeading>
        {vencimientos?.length === 0 ? (
          <UiText as="p" {...{"color":"gray","size":"2","className":"text-center py-4"}}>Sin vencimientos para este período</UiText>
        ) : (
          <UiBox {...{"className":"space-y-2"}}>
            {vencimientos.map((v, i) => (
              <UiBox key={i} {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between p-3"}}>
                <UiBox {...{"className":"flex items-center gap-3"}}>
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-1.5"}, {}, (v.urgencia === 'vencido' ? {"style":{"backgroundColor":"var(--red-3)"}} : (v.urgencia === 'proximo' ? {"style":{"backgroundColor":"var(--amber-3)"}} : {"style":{"backgroundColor":"var(--green-3)"}})))}>
                    {v.urgencia === 'vencido' ? <XCircle size={16} {...{"style":{"color":"var(--red-12)"}}} /> : v.urgencia === 'proximo' ? <AlertTriangle size={16} {...{"style":{"color":"var(--amber-12)"}}} /> : <CheckCircle2 size={16} {...{"style":{"color":"var(--green-12)"}}} />}
                  </UiBox>
                  <UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{v.descripcion}</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Día {v.dia} — {v.fecha}</UiBox>
                  </UiBox>
                </UiBox>
                <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"px-2 py-0.5"}, {}, resolveThemeProps(URGENCIA_BADGES[v.urgencia]))}>
                  {v.vencido ? 'Vencido' : v.diasRestantes <= 3 ? `${v.diasRestantes}d` : `${v.diasRestantes}d restantes`}
                </UiText>
              </UiBox>
            ))}
          </UiBox>
        )}
      </UiCard>
    </UiBox>
  );
}

function IvaTab({ iva, fmt }) {
  if (!iva) return null;

  const rows = [
    { label: 'Base Imponible Ventas', value: iva.baseImponibleVentas, tipo: 'base' },
    { label: 'IVA Generado por Ventas', value: iva.ventas, tipo: 'debito' },
    { label: 'Base Imponible Compras', value: iva.baseImponibleCompras, tipo: 'base' },
    { label: 'IVA Pagado en Compras', value: iva.compras, tipo: 'credito' },
  ];

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-2 mb-3"}}>
            <TrendingUp size={14} {...{"style":{"color":"var(--green-12)"}}} />IVA Ventas (Débito Fiscal)
          </UiBox>
          <UiBox {...{"style":{"color":"var(--green-12)"}}}>{fmt(iva.ventas)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-1"}}>{iva.numVentas} documentos | Base: {fmt(iva.baseImponibleVentas)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Total facturado: {fmt(iva.totalVentas)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-2 mb-3"}}>
            <TrendingDown size={14} {...{"style":{"color":"var(--blue-11)"}}} />IVA Compras (Crédito Fiscal)
          </UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{fmt(iva.compras)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-1"}}>{iva.numCompras} documentos | Base: {fmt(iva.baseImponibleCompras)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Total comprado: {fmt(iva.totalCompras)}</UiBox>
        </UiCard>
      </UiBox>

      <UiCard {...mergeThemeProps({"className":"p-4"}, {}, (iva.aPagar > 0 ? {"style":{"backgroundColor":"var(--red-3)"}} : (iva.creditoFiscal > 0 ? {"style":{"backgroundColor":"var(--green-3)"}} : {"style":{"backgroundColor":"var(--color-panel-solid)"}})))}>
        <UiBox {...{"className":"flex items-center justify-between"}}>
          <UiBox>
            <UiBox {...{"style":{"color":"var(--gray-12)"}}}>
              {iva.aPagar > 0 ? 'IVA a Pagar al SRI' : iva.creditoFiscal > 0 ? 'Crédito Fiscal (IVA a Favor)' : 'IVA Neutralizado'}
            </UiBox>
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-0.5"}}>Ventas: {fmt(iva.ventas)} − Compras: {fmt(iva.compras)}</UiBox>
          </UiBox>
          <UiBox {...mergeThemeProps({}, {}, (iva.aPagar > 0 ? {"style":{"color":"var(--red-12)"}} : (iva.creditoFiscal > 0 ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--gray-12)"}})))}>
            {fmt(iva.aPagar > 0 ? iva.aPagar : iva.creditoFiscal)}
          </UiBox>
        </UiBox>
      </UiCard>

      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
        <UiTable {...{"className":"w-full"}}>
          <UiTableHeader>
            <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
              <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-4 py-2"}}>Concepto</UiTableHead>
              <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-right px-4 py-2"}}>Valor</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            {rows.map((r, i) => (
              <UiTableRow key={i} {...{}}>
                <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-4 py-2"}}>{r.label}</UiTableCell>
                <UiTableCell {...mergeThemeProps({"className":"px-4 py-2 text-right"}, {}, (r.tipo === 'debito' ? {"style":{"color":"var(--red-12)"}} : (r.tipo === 'credito' ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--gray-12)"}})))}>
                  {fmt(r.value)}
                </UiTableCell>
              </UiTableRow>
            ))}
          </UiTableBody>
        </UiTable>
      </UiBox>
    </UiBox>
  );
}

function RetencionesTab({ retenciones, fmt }) {
  if (!retenciones) return null;

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-3 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <Receipt size={14} {...{"style":{"color":"var(--amber-11)"}}} />Ret. en la Fuente
          </UiBox>
          <UiBox {...{"style":{"color":"var(--amber-12)"}}}>{fmt(retenciones.fuente)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <Percent size={14} {...{"style":{"color":"var(--blue-11)"}}} />Ret. de IVA
          </UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{fmt(retenciones.iva)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
            <FileText size={14} {...{"style":{"color":"var(--blue-12)"}}} />Total Retenido
          </UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{fmt(retenciones.total)}</UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-0.5"}}>{retenciones.documentosRetenidos} documentos</UiBox>
        </UiCard>
      </UiBox>

      {retenciones.detalle?.length === 0 ? (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"text-center py-8"}}>
          <Receipt size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
          <UiText as="p" {...{"color":"gray","size":"2"}}>No hay retenciones registradas en este período</UiText>
        </UiCard>
      ) : (
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"px-4 py-2"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Detalle de Retenciones</UiHeading>
          </UiBox>
          <UiBox {...{"className":"overflow-x-auto"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader>
                <UiTableRow {...{}}>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-3 py-2"}}>Fecha</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-3 py-2"}}>Tercero</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-3 py-2"}}>Documento</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-right px-3 py-2"}}>Base</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-right px-3 py-2"}}>Ret. Fuente</UiTableHead>
                  <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-right px-3 py-2"}}>Ret. IVA</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                {retenciones.detalle?.map((d, i) => (
                  <UiTableRow key={d.id || i} {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2"}}>{d.fecha || '-'}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 truncate max-w-[180px]"}}>{d.tercero}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)","fontFamily":"var(--code-font-family)"},"className":"px-3 py-2"}}>{d.documento}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{fmt(d.baseImponible)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--amber-12)"},"className":"px-3 py-2 text-right"}}>{fmt(d.retencionFuente)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--blue-12)"},"className":"px-3 py-2 text-right"}}>{fmt(d.retencionIva)}</UiTableCell>
                  </UiTableRow>
                ))}
              </UiTableBody>
            </UiTable>
          </UiBox>
        </UiBox>
      )}
    </UiBox>
  );
}

function AtsTab({ atsPreview, atsGenerating, atsData, rucValidate, rucResult, setRucValidate, setRucResult, onGenerar, onDescargar, onValidarRuc, fmt }) {
  return (
    <UiBox {...{"className":"space-y-4"}}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-2 mb-3"}}>
          <Search size={14} />Validar RUC
        </UiHeading>
        <UiBox {...{"className":"flex items-center gap-2"}}>
          <UiInput
            type="text"
            value={rucValidate}
            onChange={e => { setRucValidate(e.target.value); setRucResult(null); }}
            placeholder="Ingrese RUC (13 dígitos)"
            maxLength={13}
            {...{"size":"2","color":"gray","className":"flex-1"}}
          />
          <UiButton onClick={onValidarRuc}
            {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1"}}>
            <CheckCircle2 size={14} />Validar
          </UiButton>
        </UiBox>
        {rucResult && (
          <UiBox {...mergeThemeProps({"className":"mt-2 flex items-center gap-2"}, {}, (rucResult.valido ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--red-12)"}}))}>
            {rucResult.valido ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {rucResult.mensaje}
          </UiBox>
        )}
      </UiCard>

      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiBox {...{"className":"flex flex-wrap items-center justify-between gap-3 mb-3"}}>
          <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-2"}}>
            <FileDown size={14} />Generador de ATS (Anexo Transaccional Simplificado)
          </UiHeading>
          <UiBox {...{"className":"flex items-center gap-2"}}>
            <UiButton onClick={onGenerar} disabled={atsGenerating}
              {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5 disabled:opacity-50"}}>
              {atsGenerating ? <RefreshCw size={14} {...{"className":"animate-spin"}} /> : <FileText size={14} />}
              {atsGenerating ? 'Generando...' : 'Generar ATS'}
            </UiButton>
            {atsPreview && (
              <UiButton onClick={onDescargar}
                {...{"size":"2","variant":"solid","color":"green","className":"flex items-center gap-1.5"}}>
                <Download size={14} />Descargar XML
              </UiButton>
            )}
          </UiBox>
        </UiBox>

        {atsData && (
          <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-2"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Total Docs</UiBox>
              <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{atsData.totalDocumentos}</UiBox>
            </UiBox>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-2"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>IVA Ventas</UiBox>
              <UiBox {...{"style":{"color":"var(--green-12)"}}}>{fmt(atsData.resumen?.iva?.ventas)}</UiBox>
            </UiBox>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-2"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>IVA Compras</UiBox>
              <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{fmt(atsData.resumen?.iva?.compras)}</UiBox>
            </UiBox>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-2"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Retenciones</UiBox>
              <UiBox {...{"style":{"color":"var(--amber-12)"}}}>{fmt(atsData.resumen?.retenciones?.total)}</UiBox>
            </UiBox>
          </UiBox>
        )}

        {atsData?.warnings?.length > 0 && (
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--amber-3)","border":"1px solid var(--gray-a6)"},"className":"mb-3 p-2"}}>
            {atsData.warnings.map((w, i) => (
              <UiBox key={i} {...{"style":{"color":"var(--amber-12)"},"className":"flex items-center gap-2"}}>
                <AlertTriangle size={12} />{w}
              </UiBox>
            ))}
          </UiBox>
        )}

        {atsData?.rucsInvalidos?.length > 0 && (
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","border":"1px solid var(--gray-a6)"},"className":"mb-3 p-2"}}>
            <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-1"}}>RUCs con problemas:</UiBox>
            {atsData.rucsInvalidos.map((r, i) => (
              <UiBox key={i} {...{"style":{"color":"var(--red-12)","fontFamily":"var(--code-font-family)"}}}>{r}</UiBox>
            ))}
          </UiBox>
        )}

        {atsPreview ? (
          <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
            <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)"},"className":"px-3 py-1.5 flex items-center justify-between"}}>
              <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Vista previa XML</UiText>
              <UiText {...{"size":"1","color":"gray"}}>{atsPreview.length} caracteres</UiText>
            </UiBox>
            <pre {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"},"className":"p-3 overflow-auto max-h-72 custom-scrollbar whitespace-pre-wrap"}}>
              {atsPreview}
            </pre>
          </UiBox>
        ) : (
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"text-center py-8"}}>
            <FileText size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
            <UiText as="p" {...{"color":"gray","size":"2"}}>Presione &quot;Generar ATS&quot; para crear el XML del Anexo Transaccional Simplificado</UiText>
          </UiBox>
        )}
      </UiCard>
    </UiBox>
  );
}
