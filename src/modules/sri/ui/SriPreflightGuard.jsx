import { ShieldCheck, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { validateSriPreFlight } from '../domain/fiscalMath.js';

/**
 * Panel Pre-Emisión SRI — Muestra al usuario en tiempo real el punto de emisión asegurado,
 * ambiente, cuadre exacto al centavo y bloquea errores comunes antes de firmar o quemar un secuencial.
 */
export default function SriPreflightGuard({
  documentType = 'factura',
  emisorConfig = {},
  buyer = {},
  items = [],
  payments = [],
  retenciones = [],
  establecimiento,
  puntoEmision,
  secuencial,
  assignedEmissionPoint = null,
  compact = false
}) {
  if (documentType === 'nota_venta' || documentType === 'cotizacion') {
    return null;
  }

  const check = validateSriPreFlight({
    documentType,
    emisorConfig,
    buyer,
    items,
    payments,
    retenciones,
    establecimiento,
    puntoEmision,
    secuencial,
    assignedEmissionPoint
  });

  const { valid, blockers, warnings, summary } = check;
  const isProd = summary.ambiente === '2';
  const seriesLabel = `${summary.estab}-${summary.ptoEmi}${secuencial ? `-${String(secuencial).padStart(9, '0')}` : ''}`;

  return (
    <div
      className={`rounded-xl border text-xs transition-colors ${
        !valid
          ? 'bg-rose-50/90 border-rose-200 text-rose-900'
          : warnings.length > 0
          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
      } ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          {!valid ? (
            <XCircle size={15} className="text-rose-600 shrink-0" />
          ) : warnings.length > 0 ? (
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          ) : (
            <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
          )}
          <span>
            {!valid
              ? `Validación SRI: ${blockers.length} error(es) antes de emitir`
              : 'Validación SRI lista: cuadre exacto y datos fiscales verificados'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
            isProd ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
          }`}>
            {isProd ? 'SRI Producción' : 'SRI Pruebas'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[11px] font-mono font-semibold text-slate-800">
            {assignedEmissionPoint?.locked && <Lock size={11} className="text-slate-600" />}
            Pto. {seriesLabel}
          </span>
          {!compact && summary.totals && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[11px] font-mono font-semibold text-slate-800">
              Total SRI: ${summary.totals.importeTotal.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {blockers.length > 0 && (
        <ul className="mt-2 space-y-1 pl-5 list-disc text-[11px] font-medium text-rose-800">
          {blockers.slice(0, compact ? 2 : 6).map((b, i) => (
            <li key={`${b.code}-${i}`}>{b.message}</li>
          ))}
          {compact && blockers.length > 2 && (
            <li>... y {blockers.length - 2} validación(es) más.</li>
          )}
        </ul>
      )}

      {valid && warnings.length > 0 && !compact && (
        <ul className="mt-1.5 space-y-0.5 pl-5 list-disc text-[11px] text-amber-800">
          {warnings.map((w, i) => (
            <li key={`${w.code}-${i}`}>{w.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
