import { useState, useEffect, useCallback, useRef } from 'react';
import { Scan, Upload, FileText, Image, FileCode, CheckCircle2, XCircle, AlertTriangle, Sparkles, Trash2, Eye, Clock, DollarSign, ShieldAlert, TrendingUp, RefreshCw } from 'lucide-react';
import { getCapturas, procesarArchivoCaptura, confirmarCaptura, rechazarCaptura, getResumenCapturas } from '../../services/capturaService';

const TIPO_ICONOS = { pdf: FileText, imagen: Image, xml: FileCode };
const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  confirmado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  rechazado: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
};

export default function CapturaInteligenteView({ db, storage, appId, usuario, showToast }) {
  const [capturas, setCapturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);
  const [datosEdit, setDatosEdit] = useState(null);
  const fileInputRef = useRef(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await getCapturas(db); setCapturas(data); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const resumen = getResumenCapturas(capturas);

  const handleArchivo = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const validos = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xml'];
    if (!validos.includes(ext)) {
      showToast?.('Formato no soportado. Use PDF, imagen o XML.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast?.('El archivo excede 10 MB.', 'error');
      return;
    }
    setProcesando(true);
    try {
      const resultado = await procesarArchivoCaptura(db, file, storage, appId, usuario);
      showToast?.('Documento procesado correctamente', 'success');
      await cargar();
      setSeleccionada(resultado);
      setDatosEdit({ ...resultado.datosExtraidos });
    } catch (e) {
      console.error(e);
      showToast?.(e.message || 'Error al procesar el documento', 'error');
    } finally {
      setProcesando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleArchivo(file);
  };

  const handleConfirmar = async () => {
    if (!seleccionada || !datosEdit) return;
    setProcesando(true);
    try {
      await confirmarCaptura(db, seleccionada.id, datosEdit, usuario);
      showToast?.('Captura confirmada y registrada', 'success');
      await cargar();
      setSeleccionada(null);
      setDatosEdit(null);
    } catch (e) {
      showToast?.(e.message || 'Error al confirmar', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!seleccionada) return;
    try {
      await rechazarCaptura(db, seleccionada.id, usuario);
      showToast?.('Captura rechazada', 'info');
      await cargar();
      setSeleccionada(null);
      setDatosEdit(null);
    } catch (e) {
      showToast?.(e.message || 'Error al rechazar', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}</div>
        <div className="h-48 bg-surface-sidebar rounded-card" />
        {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-sidebar rounded-card" />)}
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
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Scan size={14} className="text-primary" />Capturas del Mes</div>
          <div className="text-lg font-bold text-primary">{resumen.capturasMes}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><ShieldAlert size={14} className="text-warning" />Duplicados</div>
          <div className="text-lg font-bold text-warning">{resumen.duplicadosDetectados}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><TrendingUp size={14} className="text-emerald-500" />Tasa Exito</div>
          <div className="text-lg font-bold text-emerald-500">{resumen.tasaExito}%</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><DollarSign size={14} className="text-primary" />Total Procesado</div>
          <div className="text-lg font-bold text-primary">{formatCurrency(resumen.totalProcesado)}</div>
        </div>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-card p-8 text-center transition-all cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : 'border-border-default hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {procesando ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-text-secondary font-medium">Procesando documento con IA...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Upload size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-black">Arrastra tu documento aqui o haz clic para seleccionar</p>
              <p className="text-xs text-text-secondary mt-1">PDF, Imagen (JPG, PNG, WEBP) o XML - Max 10 MB</p>
            </div>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded">PDF</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded">Imagen</span>
              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs font-bold rounded">XML</span>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArchivo(f); }} />
      </div>

      {seleccionada && datosEdit && (
        <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-sidebar">
            <h3 className="text-sm font-bold text-black flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Datos Extraidos por IA
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-bold rounded border ${ESTADO_BADGES[seleccionada.estado] || ''}`}>{seleccionada.estado}</span>
              <button onClick={() => { setSeleccionada(null); setDatosEdit(null); }} className="btn-icon text-text-secondary"><XCircle size={16} /></button>
            </div>
          </div>

          {seleccionada.duplicado && (
            <div className="mx-4 mt-3 p-3 bg-warning-light border border-warning/20 rounded flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning shrink-0" />
              <div className="text-xs text-warning font-medium">Duplicado detectado - Este documento ya fue registrado anteriormente</div>
            </div>
          )}

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CampoEdit label="RUC" value={datosEdit.ruc} onChange={(v) => setDatosEdit({...datosEdit, ruc: v})} />
            <CampoEdit label="Razon Social" value={datosEdit.razonSocial} onChange={(v) => setDatosEdit({...datosEdit, razonSocial: v})} />
            <CampoEdit label="Fecha" value={datosEdit.fecha} onChange={(v) => setDatosEdit({...datosEdit, fecha: v})} />
            <CampoEdit label="Monto Total" value={datosEdit.montoTotal} onChange={(v) => setDatosEdit({...datosEdit, montoTotal: Number(v)})} type="number" />
            <CampoEdit label="IVA" value={datosEdit.iva} onChange={(v) => setDatosEdit({...datosEdit, iva: Number(v)})} type="number" />
            <CampoEdit label="Ret. Fuente" value={datosEdit.retencionFuente} onChange={(v) => setDatosEdit({...datosEdit, retencionFuente: Number(v)})} type="number" />
            <CampoEdit label="Ret. IVA" value={datosEdit.retencionIva} onChange={(v) => setDatosEdit({...datosEdit, retencionIva: Number(v)})} type="number" />
            <CampoEdit label="Clave Acceso" value={datosEdit.claveAcceso} onChange={(v) => setDatosEdit({...datosEdit, claveAcceso: v})} />
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">Tipo</label>
              <select value={datosEdit.tipo} onChange={(e) => setDatosEdit({...datosEdit, tipo: e.target.value})} className="w-full px-3 py-2 text-sm bg-white border border-border-default rounded-btn text-black">
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">Categoria</label>
              <select value={datosEdit.categoria || 'otros'} onChange={(e) => setDatosEdit({...datosEdit, categoria: e.target.value})} className="w-full px-3 py-2 text-sm bg-white border border-border-default rounded-btn text-black">
                <option value="costos">Costos</option>
                <option value="gastos_administrativos">Gastos Administrativos</option>
                <option value="gastos_marketing">Gastos Marketing</option>
                <option value="activos">Activos</option>
                <option value="otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default bg-surface-sidebar">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${datosEdit.confianza >= 80 ? 'bg-emerald-500' : datosEdit.confianza >= 50 ? 'bg-warning' : 'bg-error'}`}></div>
                <span className="text-xs text-text-secondary font-medium">Confianza: {datosEdit.confianza || seleccionada.datosExtraidos?.confianza || 0}%</span>
              </div>
              <span className="text-xs text-text-muted">|</span>
              <span className="text-xs text-text-muted">{seleccionada.nombreArchivo}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRechazar} className="px-3 py-1.5 text-xs font-bold rounded-btn border border-border-default text-text-secondary hover:bg-error/10 hover:text-error hover:border-error/30 transition-all">Rechazar</button>
              <button onClick={handleConfirmar} disabled={procesando} className="px-4 py-1.5 text-xs font-bold rounded-btn bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1">
                {procesando ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Confirmar y Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
          <Clock size={14} className="text-text-secondary" />
          Capturas Recientes
        </h3>
        {capturas.length === 0 ? (
          <div className="text-center py-10 bg-surface-sidebar rounded-card border border-border-default">
            <Scan size={32} className="text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No hay capturas registradas</p>
            <p className="text-xs text-text-muted mt-1">Sube una factura, imagen o XML para comenzar</p>
          </div>
        ) : (
          <div className="border border-border-default rounded-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-sidebar border-b border-border-default">
                    <th className="text-left px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Archivo</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">RUC</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Razon Social</th>
                    <th className="text-right px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Monto</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Confianza</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Estado</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Duplicado</th>
                    <th className="text-right px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Fecha</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {capturas.slice(0, 20).map(c => {
                    const TipoIcon = TIPO_ICONOS[c.tipoDocumento] || FileText;
                    const d = c.datosExtraidos || {};
                    return (
                      <tr key={c.id} className="border-b border-border-default/50 hover:bg-surface-sidebar/50 transition-colors">
                        <td className="px-3 py-2"><TipoIcon size={14} className="text-text-secondary" /></td>
                        <td className="px-3 py-2 text-xs text-black max-w-[120px] truncate">{c.nombreArchivo}</td>
                        <td className="px-3 py-2 text-xs text-text-primary font-mono">{d.ruc || '-'}</td>
                        <td className="px-3 py-2 text-xs text-black">{d.razonSocial || '-'}</td>
                        <td className="px-3 py-2 text-xs text-black font-semibold text-right">{formatCurrency(d.montoTotal)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${d.confianza >= 80 ? 'bg-emerald-50 text-emerald-600' : d.confianza >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                            {d.confianza || 0}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded border ${ESTADO_BADGES[c.estado] || ''}`}>{c.estado}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {c.duplicado ? <AlertTriangle size={14} className="text-warning mx-auto" /> : <span className="text-text-muted text-xs">-</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-text-secondary text-right">{formatDate(c.createdAt)}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => { setSeleccionada(c); setDatosEdit({...d}); }} className="btn-icon text-text-secondary hover:text-primary" title="Ver detalle">
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CampoEdit({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} step={type === 'number' ? '0.01' : undefined} className="w-full px-3 py-2 text-sm bg-white border border-border-default rounded-btn text-black focus:border-primary focus:outline-none transition-colors" />
    </div>
  );
}
