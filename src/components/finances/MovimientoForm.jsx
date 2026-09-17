import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiLabel, UiText } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea } from '../ui/controls';
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, Save } from 'lucide-react';
import { crearMovimiento, editarMovimiento } from '../../services/movimientoService';

const TIPOS_DOCUMENTO = [
  { id: 'factura', label: 'Factura' },
  { id: 'nota_venta', label: 'Nota de Venta' },
  { id: 'nota_credito', label: 'Nota de Crédito' },
  { id: 'nota_debito', label: 'Nota de Débito' },
  { id: 'retencion', label: 'Retención' },
  { id: 'liquidacion', label: 'Liquidación de Compra' },
  { id: 'gasto', label: 'Gasto' },
  { id: 'ingreso_vario', label: 'Ingreso Varios' },
  { id: 'gasto_hormiga', label: 'Gasto Hormiga' },
];

const CATEGORIAS = [
  'gastos_administrativos', 'costos', 'marketing', 'activos',
  'impuestos', 'nomina', 'servicios_basicos', 'transporte',
  'alimentacion', 'suministros', 'mantenimiento', 'otro',
];

const METODOS_PAGO = [
  'efectivo', 'transferencia', 'tarjeta_credito',
  'tarjeta_debito', 'cheque', 'cruce_cuentas', 'otro',
];

const PARTIDA_VACIA = {
  cuenta: '',
  centroCosto: '',
  proyecto: '',
  categoria: 'gastos_administrativos',
  descripcion: '',
  baseImponible: 0,
  iva: 0,
  ice: 0,
  irbpnr: 0,
  retencionFuente: 0,
  retencionIva: 0,
  total: 0,
  deducible: true,
};

export default function MovimientoForm({ onClose, onSave, movimiento, db, usuario, showToast }) {
  const stableId = useRef(crypto.randomUUID());
  const esEdicion = !!movimiento?.id;
  
  const [formData, setFormData] = useState({
    tipo: movimiento?.tipo || 'egreso',
    fecha: movimiento?.fecha ? new Date(movimiento.fecha.toDate?.() || movimiento.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    fechaVencimiento: movimiento?.fechaVencimiento?.toDate ? new Date(movimiento.fechaVencimiento.toDate()).toISOString().split('T')[0] : '',
    monto: movimiento?.monto || 0,
    metodoPago: movimiento?.metodoPago || 'efectivo',
    documento: movimiento?.documento || { tipo: 'gasto', numero: '', claveAcceso: '' },
    tercero: movimiento?.tercero || { id: '', nombre: '', ruc: '' },
    partidas: movimiento?.partidas?.length ? movimiento.partidas : [{ ...PARTIDA_VACIA }],
    notas: movimiento?.notas || '',
    archivos: movimiento?.archivos || [],
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleDocumentoChange = (field, value) => {
    setFormData(prev => ({ ...prev, documento: { ...prev.documento, [field]: value } }));
  };

  const handleTerceroChange = (field, value) => {
    setFormData(prev => ({ ...prev, tercero: { ...prev.tercero, [field]: value } }));
  };

  const handlePartidaChange = (index, field, value) => {
    const partidas = [...formData.partidas];
    partidas[index] = { ...partidas[index], [field]: value };
    
    if (['baseImponible', 'iva', 'ice', 'irbpnr', 'retencionFuente', 'retencionIva'].includes(field)) {
      const p = partidas[index];
      p.total = (Number(p.baseImponible) || 0) + (Number(p.iva) || 0) + (Number(p.ice) || 0)
        - (Number(p.retencionFuente) || 0) - (Number(p.retencionIva) || 0) - (Number(p.irbpnr) || 0);
    }
    
    setFormData(prev => ({ ...prev, partidas }));
  };

  const addPartida = () => {
    setFormData(prev => ({ ...prev, partidas: [...prev.partidas, { ...PARTIDA_VACIA }] }));
  };

  const removePartida = (index) => {
    if (formData.partidas.length <= 1) return;
    setFormData(prev => ({ ...prev, partidas: prev.partidas.filter((_, i) => i !== index) }));
  };

  useEffect(() => {
    const total = formData.partidas.reduce((s, p) => s + (Number(p.total) || 0), 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(prev => ({ ...prev, monto: total }));
  }, [formData.partidas]);

  const validate = () => {
    const errs = {};
    if (!formData.tercero.nombre && formData.tipo !== 'ingreso_vario') errs.tercero = 'Requerido';
    if (formData.partidas.some(p => !p.descripcion)) errs.partidas = 'Todas las partidas necesitan descripción';
    if (formData.monto <= 0) errs.monto = 'El total debe ser mayor a 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    
    try {
      if (esEdicion) {
        await editarMovimiento(db, movimiento.id, formData, usuario);
      } else {
        await crearMovimiento(db, { ...formData, id: stableId.current }, usuario);
      }
      showToast(esEdicion ? 'Movimiento actualizado' : 'Movimiento creado', 'success');
      onSave();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-start justify-center pt-10 pb-10 overflow-y-auto"}}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-2xl mx-4"}}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-4"}}>
          <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true}}>
            {esEdicion ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}>
            <X size={18} />
          </UiButton>
        </UiBox>

        <form onSubmit={handleSubmit} {...{"className":"px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar"}}>
          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Tipo</UiLabel>
            <UiBox {...{"className":"flex gap-2"}}>
              {['ingreso', 'egreso'].map(t => (
                <UiButton
                  key={t}
                  type="button"
                  onClick={() => handleChange('tipo', t)}
                  {...mergeThemeProps({"size":"2","variant":"outline","className":"flex-1"}, {}, (formData.tipo === t ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                >
                  {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </UiButton>
              ))}
            </UiBox>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Fecha</UiLabel>
              <UiInput type="date" value={formData.fecha} onChange={e => handleChange('fecha', e.target.value)}
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Vencimiento (opcional)</UiLabel>
              <UiInput type="date" value={formData.fechaVencimiento} onChange={e => handleChange('fechaVencimiento', e.target.value)}
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Tipo de Documento</UiLabel>
              <UiSelect value={formData.documento.tipo} onChange={e => handleDocumentoChange('tipo', e.target.value)}
                {...{"size":"2","color":"gray","className":"w-full"}}>
                {TIPOS_DOCUMENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </UiSelect>
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Número</UiLabel>
              <UiInput type="text" value={formData.documento.numero} onChange={e => handleDocumentoChange('numero', e.target.value)}
                placeholder="001-001-0000001" {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Método de Pago</UiLabel>
              <UiSelect value={formData.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)}
                {...{"size":"2","color":"gray","className":"w-full"}}>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </UiSelect>
            </UiBox>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
            <UiBox {...{"className":"col-span-3 sm:col-span-1"}}>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>RUC/CI</UiLabel>
              <UiInput type="text" value={formData.tercero.ruc} onChange={e => handleTerceroChange('ruc', e.target.value)}
                placeholder="9999999999999" {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
            <UiBox {...{"className":"col-span-3 sm:col-span-2"}}>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Nombre/Razón Social</UiLabel>
              <UiInput type="text" value={formData.tercero.nombre} onChange={e => handleTerceroChange('nombre', e.target.value)}
                placeholder={formData.tipo === 'ingreso' ? 'Nombre del cliente' : 'Nombre del proveedor'} {...{"size":"2","color":"gray","className":"w-full"}} />
              {errors.tercero && <UiText {...{"size":"1","color":"red","className":"mt-0.5"}}>{errors.tercero}</UiText>}
            </UiBox>
          </UiBox>

          <UiBox>
            <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray"}}>Partidas</UiLabel>
              <UiButton type="button" onClick={addPartida}
                {...{"size":"2","color":"blue","className":"flex items-center gap-1"}}>
                <Plus size={14} /> Agregar partida
              </UiButton>
            </UiBox>
            {errors.partidas && <UiText {...{"size":"1","color":"red","className":"block mb-2"}}>{errors.partidas}</UiText>}
            
            <UiBox {...{"className":"space-y-3"}}>
              {formData.partidas.map((partida, idx) => (
                <UiBox key={idx} {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-3"}}>
                  <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                    <UiText {...{"size":"1","weight":"medium","color":"gray"}}>Partida {idx + 1}</UiText>
                    {formData.partidas.length > 1 && (
                      <UiButton iconOnly type="button" onClick={() => removePartida(idx)}
                        {...{"color":"red"}}>
                        <Minus size={14} />
                      </UiButton>
                    )}
                  </UiBox>
                  
                  <UiBox {...{"className":"grid grid-cols-2 gap-2"}}>
                    <UiBox {...{"className":"col-span-2"}}>
                      <UiInput type="text" value={partida.descripcion}
                        onChange={e => handlePartidaChange(idx, 'descripcion', e.target.value)}
                        placeholder="Descripción de la partida"
                        {...{"size":"2","color":"gray","className":"w-full"}} />
                    </UiBox>
                    <UiBox>
                      <UiSelect value={partida.categoria}
                        onChange={e => handlePartidaChange(idx, 'categoria', e.target.value)}
                        {...{"size":"2","color":"gray","className":"w-full"}}>
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                      </UiSelect>
                    </UiBox>
                    <UiBox>
                      <UiInput type="number" step="0.01" value={partida.baseImponible || ''}
                        onChange={e => handlePartidaChange(idx, 'baseImponible', e.target.value)}
                        placeholder="Base imponible"
                        {...{"size":"2","color":"gray","className":"w-full"}} />
                    </UiBox>
                    <UiBox>
                      <UiInput type="number" step="0.01" value={partida.iva || ''}
                        onChange={e => handlePartidaChange(idx, 'iva', e.target.value)}
                        placeholder="IVA"
                        {...{"size":"2","color":"gray","className":"w-full"}} />
                    </UiBox>
                    <UiBox>
                      <UiInput type="number" step="0.01" value={partida.retencionFuente || ''}
                        onChange={e => handlePartidaChange(idx, 'retencionFuente', e.target.value)}
                        placeholder="Ret. Fuente"
                        {...{"size":"2","color":"gray","className":"w-full"}} />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...{"size":"1","color":"gray","className":"flex items-center gap-1"}}>
                        <UiInput type="checkbox" checked={partida.deducible}
                          onChange={e => handlePartidaChange(idx, 'deducible', e.target.checked)} />
                        Deducible
                      </UiLabel>
                    </UiBox>
                    <UiBox>
                      <UiInput type="text" value={partida.centroCosto || ''}
                        onChange={e => handlePartidaChange(idx, 'centroCosto', e.target.value)}
                        placeholder="Centro de costo"
                        {...{"size":"2","color":"gray","className":"w-full"}} />
                    </UiBox>
                  </UiBox>
                  <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"mt-2 text-right"}}>
                    Total partida: ${(Number(partida.total) || 0).toFixed(2)}
                  </UiBox>
                </UiBox>
              ))}
            </UiBox>
          </UiBox>

          <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)"},"className":"p-3 text-center"}}>
            <UiText {...{"size":"1","color":"gray"}}>Total del movimiento</UiText>
            <UiBox {...{"style":{"color":"var(--blue-12)"}}}>
              ${(Number(formData.monto) || 0).toFixed(2)}
            </UiBox>
            {errors.monto && <UiText {...{"size":"1","color":"red"}}>{errors.monto}</UiText>}
          </UiBox>

          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Notas (opcional)</UiLabel>
            <UiTextarea value={formData.notas} onChange={e => handleChange('notas', e.target.value)}
              rows={2} placeholder="Observaciones del movimiento..."
              {...{"size":"2","color":"gray","className":"w-full resize-none"}} />
          </UiBox>
        </form>

        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex items-center justify-end gap-2 px-5 py-4"}}>
          <UiButton onClick={onClose} disabled={saving}
            {...{"size":"2","color":"gray","variant":"outline"}}>
            Cancelar
          </UiButton>
          <UiButton onClick={handleSubmit} disabled={saving}
            {...{"size":"2","variant":"solid","color":"blue","className":"disabled:opacity-50 flex items-center gap-2"}}>
            <Save size={16} /> {saving ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear Movimiento'}
          </UiButton>
        </UiBox>
      </UiCard>
    </UiBox>
  );
}
