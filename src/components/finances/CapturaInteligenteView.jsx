import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Scan, Upload, FileText, Image, FileCode, CheckCircle2, XCircle, AlertTriangle, Sparkles, Eye, Clock, DollarSign, ShieldAlert, TrendingUp, RefreshCw } from 'lucide-react';
import { getCapturas, procesarArchivoCaptura, confirmarCaptura, rechazarCaptura, getResumenCapturas } from '../../services/capturaService';
import FinancialPageHeader from './FinancialPageHeader';

const TIPO_ICONOS = { pdf: FileText, imagen: Image, xml: FileCode };
const ESTADO_BADGES = {
  pendiente: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  confirmado: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  rechazado: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>{[1,2,3,4].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}</UiBox>
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-48"}} />
        {[1,2,3].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-14"}} />)}
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
        icon={Scan}
        title="Captura Inteligente OCR"
        description="Digitalización y lectura automatizada con IA de facturas físicas y comprobantes"
        badge={`${capturas.length} documentos`}
        badgeColor="blue"
        actions={
          <UiBox className="flex items-center gap-2">
            <UiButton onClick={() => fileInputRef.current?.click()} disabled={procesando} {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5"}}>
              <Upload size={14} /> Subir Documento
            </UiButton>
            <UiButton iconOnly onClick={cargar} {...{"variant":"outline","color":"gray","size":"2"}} title="Actualizar">
              <RefreshCw size={14} />
            </UiButton>
          </UiBox>
        }
      />
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Scan size={14} {...{"style":{"color":"var(--blue-12)"}}} />Capturas del Mes</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{resumen.capturasMes}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><ShieldAlert size={14} {...{"style":{"color":"var(--amber-12)"}}} />Duplicados</UiBox>
          <UiBox {...{"style":{"color":"var(--amber-12)"}}}>{resumen.duplicadosDetectados}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><TrendingUp size={14} {...{"style":{"color":"var(--green-11)"}}} />Tasa Exito</UiBox>
          <UiBox {...{"style":{"color":"var(--green-11)"}}}>{resumen.tasaExito}%</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><DollarSign size={14} {...{"style":{"color":"var(--blue-12)"}}} />Total Procesado</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{formatCurrency(resumen.totalProcesado)}</UiBox>
        </UiCard>
      </UiBox>

      <UiBox
        {...mergeThemeProps({"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"relative p-8 text-center cursor-pointer"}, {}, (dragOver ? {"style":{"backgroundColor":"var(--blue-3)"}} : {}))}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {procesando ? (
          <UiBox {...{"className":"flex flex-col items-center gap-3"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-10 w-10"}}></UiBox>
            <UiText as="p" {...{"size":"2","color":"gray","weight":"medium"}}>Procesando documento con IA...</UiText>
          </UiBox>
        ) : (
          <UiBox {...{"className":"flex flex-col items-center gap-3"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-3"}}>
              <Upload size={28} />
            </UiBox>
            <UiBox>
              <UiText as="p" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Arrastra tu documento aqui o haz clic para seleccionar</UiText>
              <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>PDF, Imagen (JPG, PNG, WEBP) o XML - Max 10 MB</UiText>
            </UiBox>
            <UiBox {...{"className":"flex gap-2 mt-1"}}>
              <UiText {...{"color":"red","size":"1","weight":"bold","className":"px-2 py-0.5"}}>PDF</UiText>
              <UiText {...{"color":"blue","size":"1","weight":"bold","className":"px-2 py-0.5"}}>Imagen</UiText>
              <UiText {...{"color":"green","size":"1","weight":"bold","className":"px-2 py-0.5"}}>XML</UiText>
            </UiBox>
          </UiBox>
        )}
        <UiInput ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xml" {...{"className":"hidden"}} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArchivo(f); }} />
      </UiBox>

      {seleccionada && datosEdit && (
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center justify-between px-4 py-3"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-2"}}>
              <Sparkles size={16} {...{"style":{"color":"var(--blue-12)"}}} />
              Datos Extraidos por IA
            </UiHeading>
            <UiBox {...{"className":"flex items-center gap-2"}}>
              <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5"}, {}, (ESTADO_BADGES[seleccionada.estado] || {}))}>{seleccionada.estado}</UiText>
              <UiButton iconOnly onClick={() => { setSeleccionada(null); setDatosEdit(null); }} {...{"variant":"surface","color":"gray"}}><XCircle size={16} /></UiButton>
            </UiBox>
          </UiBox>

          {seleccionada.duplicado && (
            <UiBox {...{"style":{"backgroundColor":"var(--amber-3)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"mx-4 mt-3 p-3 flex items-center gap-2"}}>
              <AlertTriangle size={16} {...{"style":{"color":"var(--amber-12)"},"className":"shrink-0"}} />
              <UiBox {...{"style":{"color":"var(--amber-12)"}}}>Duplicado detectado - Este documento ya fue registrado anteriormente</UiBox>
            </UiBox>
          )}

          <UiBox {...{"className":"p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"}}>
            <CampoEdit label="RUC" value={datosEdit.ruc} onChange={(v) => setDatosEdit({...datosEdit, ruc: v})} />
            <CampoEdit label="Razon Social" value={datosEdit.razonSocial} onChange={(v) => setDatosEdit({...datosEdit, razonSocial: v})} />
            <CampoEdit label="Fecha" value={datosEdit.fecha} onChange={(v) => setDatosEdit({...datosEdit, fecha: v})} />
            <CampoEdit label="Monto Total" value={datosEdit.montoTotal} onChange={(v) => setDatosEdit({...datosEdit, montoTotal: Number(v)})} type="number" />
            <CampoEdit label="IVA" value={datosEdit.iva} onChange={(v) => setDatosEdit({...datosEdit, iva: Number(v)})} type="number" />
            <CampoEdit label="Ret. Fuente" value={datosEdit.retencionFuente} onChange={(v) => setDatosEdit({...datosEdit, retencionFuente: Number(v)})} type="number" />
            <CampoEdit label="Ret. IVA" value={datosEdit.retencionIva} onChange={(v) => setDatosEdit({...datosEdit, retencionIva: Number(v)})} type="number" />
            <CampoEdit label="Clave Acceso" value={datosEdit.claveAcceso} onChange={(v) => setDatosEdit({...datosEdit, claveAcceso: v})} />
            <UiBox>
              <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"mb-1 block"}}>Tipo</UiLabel>
              <UiSelect value={datosEdit.tipo} onChange={(e) => setDatosEdit({...datosEdit, tipo: e.target.value})} {...{"size":"2","color":"gray","className":"w-full"}}>
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
              </UiSelect>
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"mb-1 block"}}>Categoria</UiLabel>
              <UiSelect value={datosEdit.categoria || 'otros'} onChange={(e) => setDatosEdit({...datosEdit, categoria: e.target.value})} {...{"size":"2","color":"gray","className":"w-full"}}>
                <option value="costos">Costos</option>
                <option value="gastos_administrativos">Gastos Administrativos</option>
                <option value="gastos_marketing">Gastos Marketing</option>
                <option value="activos">Activos</option>
                <option value="otros">Otros</option>
              </UiSelect>
            </UiBox>
          </UiBox>

          <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center justify-between px-4 py-3"}}>
            <UiBox {...{"className":"flex items-center gap-2"}}>
              <UiBox {...{"className":"flex items-center gap-1"}}>
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"w-2 h-2"}, {}, (datosEdit.confianza >= 80 ? {"style":{"backgroundColor":"var(--green-9)"}} : (datosEdit.confianza >= 50 ? {"style":{"backgroundColor":"var(--amber-9)"}} : {"style":{"backgroundColor":"var(--red-9)"}})))}></UiBox>
                <UiText {...{"size":"1","color":"gray","weight":"medium"}}>Confianza: {datosEdit.confianza || seleccionada.datosExtraidos?.confianza || 0}%</UiText>
              </UiBox>
              <UiText {...{"size":"1","color":"gray"}}>|</UiText>
              <UiText {...{"size":"1","color":"gray"}}>{seleccionada.nombreArchivo}</UiText>
            </UiBox>
            <UiBox {...{"className":"flex gap-2"}}>
              <UiButton onClick={handleRechazar} {...{"size":"2","variant":"outline","color":"gray"}}>Rechazar</UiButton>
              <UiButton onClick={handleConfirmar} disabled={procesando} {...{"size":"2","variant":"solid","color":"blue","className":"disabled:opacity-50 flex items-center gap-1"}}>
                {procesando ? <RefreshCw size={12} {...{"className":"animate-spin"}} /> : <CheckCircle2 size={12} />}
                Confirmar y Registrar
              </UiButton>
            </UiBox>
          </UiBox>
        </UiBox>
      )}

      <UiBox>
        <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-2"}}>
          <Clock size={14} {...{"style":{"color":"var(--gray-11)"}}} />
          Capturas Recientes
        </UiHeading>
        {capturas.length === 0 ? (
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"text-center py-10"}}>
            <Scan size={32} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-2"}} />
            <UiText as="p" {...{"size":"2","color":"gray"}}>No hay capturas registradas</UiText>
            <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Sube una factura, imagen o XML para comenzar</UiText>
          </UiBox>
        ) : (
          <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
            <UiBox {...{"className":"overflow-x-auto"}}>
              <UiTable {...{"className":"w-full"}}>
                <UiTableHeader>
                  <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-3 py-2"}}>Tipo</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-3 py-2"}}>Archivo</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-3 py-2"}}>RUC</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-left px-3 py-2"}}>Razon Social</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-right px-3 py-2"}}>Monto</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-center px-3 py-2"}}>Confianza</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-center px-3 py-2"}}>Estado</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-center px-3 py-2"}}>Duplicado</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-right px-3 py-2"}}>Fecha</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"text-center px-3 py-2"}}>Accion</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  {capturas.slice(0, 20).map(c => {
                    const TipoIcon = TIPO_ICONOS[c.tipoDocumento] || FileText;
                    const d = c.datosExtraidos || {};
                    return (
                      <UiTableRow key={c.id} {...{}}>
                        <UiTableCell {...{"className":"px-3 py-2"}}><TipoIcon size={14} {...{"style":{"color":"var(--gray-11)"}}} /></UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 max-w-[120px] truncate"}}>{c.nombreArchivo}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)","fontFamily":"var(--code-font-family)"},"className":"px-3 py-2"}}>{d.ruc || '-'}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2"}}>{d.razonSocial || '-'}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2 text-right"}}>{formatCurrency(d.montoTotal)}</UiTableCell>
                        <UiTableCell {...{"className":"px-3 py-2 text-center"}}>
                          <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"inline-flex items-center gap-1 px-2 py-0.5"}, {}, (d.confianza >= 80 ? {"color":"green"} : (d.confianza >= 50 ? {"color":"amber"} : {"color":"red"})))}>
                            {d.confianza || 0}%
                          </UiText>
                        </UiTableCell>
                        <UiTableCell {...{"className":"px-3 py-2 text-center"}}>
                          <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5"}, {}, (ESTADO_BADGES[c.estado] || {}))}>{c.estado}</UiText>
                        </UiTableCell>
                        <UiTableCell {...{"className":"px-3 py-2 text-center"}}>
                          {c.duplicado ? <AlertTriangle size={14} {...{"style":{"color":"var(--amber-12)"},"className":"mx-auto"}} /> : <UiText {...{"color":"gray","size":"1"}}>-</UiText>}
                        </UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>{formatDate(c.createdAt)}</UiTableCell>
                        <UiTableCell {...{"className":"px-3 py-2 text-center"}}>
                          <UiButton iconOnly onClick={() => { setSeleccionada(c); setDatosEdit({...d}); }} {...{"variant":"surface","color":"gray"}} title="Ver detalle">
                            <Eye size={14} />
                          </UiButton>
                        </UiTableCell>
                      </UiTableRow>
                    );
                  })}
                </UiTableBody>
              </UiTable>
            </UiBox>
          </UiBox>
        )}
      </UiBox>
    </UiBox>
  );
}

function CampoEdit({ label, value, onChange, type = 'text' }) {
  return (
    <UiBox>
      <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"mb-1 block"}}>{label}</UiLabel>
      <UiInput type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} step={type === 'number' ? '0.01' : undefined} {...{"size":"2","color":"gray","className":"w-full"}} />
    </UiBox>
  );
}
