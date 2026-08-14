import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, Calculator, AlertTriangle, CheckCircle2, XCircle,
  Search, RefreshCw, FileDown, Percent, TrendingUp, TrendingDown,
  Receipt, AlertCircle, Calendar
} from 'lucide-react';
import {
  getResumenImpuestos, generarAtsCompleto, descargarAtsXml, validarRuc
} from '../../services/impuestosService';

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
  vencido: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  proximo: 'bg-warning-light text-warning border-warning/20',
  ok: 'bg-success-light text-success border-success/20',
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
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}
        </div>
        <div className="h-64 bg-surface-sidebar rounded-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={40} className="mx-auto text-error mb-3" />
        <div className="text-error text-lg mb-2">Error al cargar impuestos</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargar} className="px-4 py-2 bg-primary text-white rounded-btn text-sm flex items-center gap-2 mx-auto"><RefreshCw size={14} />Reintentar</button>
      </div>
    );
  }

  const { iva, retenciones, documentos, vencimientos } = resumen || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
          <Calculator size={18} className="text-primary" />
          Impuestos y SRI
        </h2>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={cargar} className="btn-icon w-8 h-8 text-text-secondary hover:text-primary border border-border-default rounded-btn">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <Percent size={14} className="text-primary" />IVA del Mes
          </div>
          <div className="text-lg font-bold text-primary">{fmt(iva?.aPagar)}</div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {iva?.creditoFiscal > 0 ? `Crédito fiscal: ${fmt(iva.creditoFiscal)}` : `Sobre ${fmt(iva?.baseImponibleVentas)} base`}
          </div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <Receipt size={14} className="text-amber-600" />Retenciones
          </div>
          <div className="text-lg font-bold text-amber-700">{fmt(retenciones?.total)}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Fuente: {fmt(retenciones?.fuente)} | IVA: {fmt(retenciones?.iva)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <FileText size={14} className="text-blue-600" />Documentos
          </div>
          <div className="text-lg font-bold text-blue-700">{documentos?.total || 0}</div>
          <div className="text-[10px] text-text-muted mt-0.5">{documentos?.autorizados || 0} autorizados | {documentos?.pendientes || 0} pendientes</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <Calendar size={14} className="text-emerald-600" />Vencimientos
          </div>
          <div className="text-lg font-bold">
            <span className={vencimientos?.some(v => v.vencido) ? 'text-error' : 'text-success'}>
              {vencimientos?.filter(v => v.vencido).length || 0}
            </span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {vencimientos?.filter(v => !v.vencido && v.diasRestantes <= 5).length || 0} próximos a vencer
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border-default pb-0">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

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

      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-primary" />Vencimientos Tributarios — {MESES[month - 1]} {year}
        </h3>
        {vencimientos?.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-4">Sin vencimientos para este período</p>
        ) : (
          <div className="space-y-2">
            {vencimientos.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-card border border-border-default">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md ${v.urgencia === 'vencido' ? 'bg-red-100' : v.urgencia === 'proximo' ? 'bg-amber-100' : 'bg-green-100'}`}>
                    {v.urgencia === 'vencido' ? <XCircle size={16} className="text-error" /> : v.urgencia === 'proximo' ? <AlertTriangle size={16} className="text-warning" /> : <CheckCircle2 size={16} className="text-success" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{v.descripcion}</div>
                    <div className="text-[10px] text-text-muted">Día {v.dia} — {v.fecha}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium border rounded-badge ${URGENCIA_BADGES[v.urgencia]}`}>
                  {v.vencido ? 'Vencido' : v.diasRestantes <= 3 ? `${v.diasRestantes}d` : `${v.diasRestantes}d restantes`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
            <TrendingUp size={14} className="text-success" />IVA Ventas (Débito Fiscal)
          </div>
          <div className="text-2xl font-bold text-success">{fmt(iva.ventas)}</div>
          <div className="text-xs text-text-muted mt-1">{iva.numVentas} documentos | Base: {fmt(iva.baseImponibleVentas)}</div>
          <div className="text-xs text-text-muted">Total facturado: {fmt(iva.totalVentas)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
            <TrendingDown size={14} className="text-blue-600" />IVA Compras (Crédito Fiscal)
          </div>
          <div className="text-2xl font-bold text-blue-700">{fmt(iva.compras)}</div>
          <div className="text-xs text-text-muted mt-1">{iva.numCompras} documentos | Base: {fmt(iva.baseImponibleCompras)}</div>
          <div className="text-xs text-text-muted">Total comprado: {fmt(iva.totalCompras)}</div>
        </div>
      </div>

      <div className={`border rounded-card p-4 ${iva.aPagar > 0 ? 'border-error/30 bg-red-50' : iva.creditoFiscal > 0 ? 'border-success/30 bg-green-50' : 'border-border-default bg-surface-card'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {iva.aPagar > 0 ? 'IVA a Pagar al SRI' : iva.creditoFiscal > 0 ? 'Crédito Fiscal (IVA a Favor)' : 'IVA Neutralizado'}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Ventas: {fmt(iva.ventas)} − Compras: {fmt(iva.compras)}</div>
          </div>
          <div className={`text-2xl font-bold ${iva.aPagar > 0 ? 'text-error' : iva.creditoFiscal > 0 ? 'text-success' : 'text-text-primary'}`}>
            {fmt(iva.aPagar > 0 ? iva.aPagar : iva.creditoFiscal)}
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-sidebar">
              <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary">Concepto</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-text-secondary">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border-default last:border-0">
                <td className="px-4 py-2 text-text-primary">{r.label}</td>
                <td className={`px-4 py-2 text-right font-medium ${r.tipo === 'debito' ? 'text-error' : r.tipo === 'credito' ? 'text-success' : 'text-text-primary'}`}>
                  {fmt(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RetencionesTab({ retenciones, fmt }) {
  if (!retenciones) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <Receipt size={14} className="text-amber-600" />Ret. en la Fuente
          </div>
          <div className="text-lg font-bold text-amber-700">{fmt(retenciones.fuente)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <Percent size={14} className="text-blue-600" />Ret. de IVA
          </div>
          <div className="text-lg font-bold text-blue-700">{fmt(retenciones.iva)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <FileText size={14} className="text-primary" />Total Retenido
          </div>
          <div className="text-lg font-bold text-primary">{fmt(retenciones.total)}</div>
          <div className="text-[10px] text-text-muted mt-0.5">{retenciones.documentosRetenidos} documentos</div>
        </div>
      </div>

      {retenciones.detalle?.length === 0 ? (
        <div className="text-center py-8 bg-surface-card border border-border-default rounded-card">
          <Receipt size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary text-sm">No hay retenciones registradas en este período</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border-default bg-surface-sidebar">
            <h3 className="text-sm font-semibold text-text-primary">Detalle de Retenciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-secondary">Fecha</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-secondary">Tercero</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-secondary">Documento</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-text-secondary">Base</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-text-secondary">Ret. Fuente</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-text-secondary">Ret. IVA</th>
                </tr>
              </thead>
              <tbody>
                {retenciones.detalle?.map((d, i) => (
                  <tr key={d.id || i} className="border-b border-border-default last:border-0 hover:bg-surface-sidebar">
                    <td className="px-3 py-2 text-text-primary">{d.fecha || '-'}</td>
                    <td className="px-3 py-2 text-text-primary truncate max-w-[180px]">{d.tercero}</td>
                    <td className="px-3 py-2 text-text-muted font-mono text-xs">{d.documento}</td>
                    <td className="px-3 py-2 text-right text-text-primary">{fmt(d.baseImponible)}</td>
                    <td className="px-3 py-2 text-right text-amber-700 font-medium">{fmt(d.retencionFuente)}</td>
                    <td className="px-3 py-2 text-right text-blue-700 font-medium">{fmt(d.retencionIva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AtsTab({ atsPreview, atsGenerating, atsData, rucValidate, rucResult, setRucValidate, setRucResult, onGenerar, onDescargar, onValidarRuc, fmt }) {
  return (
    <div className="space-y-4">
      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
          <Search size={14} />Validar RUC
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={rucValidate}
            onChange={e => { setRucValidate(e.target.value); setRucResult(null); }}
            placeholder="Ingrese RUC (13 dígitos)"
            maxLength={13}
            className="flex-1 px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary"
          />
          <button onClick={onValidarRuc}
            className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-btn flex items-center gap-1">
            <CheckCircle2 size={14} />Validar
          </button>
        </div>
        {rucResult && (
          <div className={`mt-2 flex items-center gap-2 text-sm ${rucResult.valido ? 'text-success' : 'text-error'}`}>
            {rucResult.valido ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {rucResult.mensaje}
          </div>
        )}
      </div>

      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <FileDown size={14} />Generador de ATS (Anexo Transaccional Simplificado)
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={onGenerar} disabled={atsGenerating}
              className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-btn flex items-center gap-1.5 disabled:opacity-50">
              {atsGenerating ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
              {atsGenerating ? 'Generando...' : 'Generar ATS'}
            </button>
            {atsPreview && (
              <button onClick={onDescargar}
                className="px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-btn flex items-center gap-1.5">
                <Download size={14} />Descargar XML
              </button>
            )}
          </div>
        </div>

        {atsData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="p-2 rounded-md border border-border-default">
              <div className="text-[10px] text-text-muted">Total Docs</div>
              <div className="text-sm font-bold text-text-primary">{atsData.totalDocumentos}</div>
            </div>
            <div className="p-2 rounded-md border border-border-default">
              <div className="text-[10px] text-text-muted">IVA Ventas</div>
              <div className="text-sm font-bold text-success">{fmt(atsData.resumen?.iva?.ventas)}</div>
            </div>
            <div className="p-2 rounded-md border border-border-default">
              <div className="text-[10px] text-text-muted">IVA Compras</div>
              <div className="text-sm font-bold text-blue-700">{fmt(atsData.resumen?.iva?.compras)}</div>
            </div>
            <div className="p-2 rounded-md border border-border-default">
              <div className="text-[10px] text-text-muted">Retenciones</div>
              <div className="text-sm font-bold text-amber-700">{fmt(atsData.resumen?.retenciones?.total)}</div>
            </div>
          </div>
        )}

        {atsData?.warnings?.length > 0 && (
          <div className="mb-3 p-2 rounded-md bg-warning-light border border-warning/20">
            {atsData.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-warning">
                <AlertTriangle size={12} />{w}
              </div>
            ))}
          </div>
        )}

        {atsData?.rucsInvalidos?.length > 0 && (
          <div className="mb-3 p-2 rounded-md bg-red-50 border border-error/20">
            <div className="text-xs font-semibold text-error mb-1">RUCs con problemas:</div>
            {atsData.rucsInvalidos.map((r, i) => (
              <div key={i} className="text-xs text-error font-mono">{r}</div>
            ))}
          </div>
        )}

        {atsPreview ? (
          <div className="border border-border-default rounded-md overflow-hidden">
            <div className="px-3 py-1.5 bg-surface-sidebar border-b border-border-default flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">Vista previa XML</span>
              <span className="text-[10px] text-text-muted">{atsPreview.length} caracteres</span>
            </div>
            <pre className="p-3 text-xs font-mono text-text-primary bg-white overflow-auto max-h-72 custom-scrollbar whitespace-pre-wrap">
              {atsPreview}
            </pre>
          </div>
        ) : (
          <div className="text-center py-8 bg-surface-sidebar rounded-card">
            <FileText size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary text-sm">Presione &quot;Generar ATS&quot; para crear el XML del Anexo Transaccional Simplificado</p>
          </div>
        )}
      </div>
    </div>
  );
}
