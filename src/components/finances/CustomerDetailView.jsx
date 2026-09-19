import { useState, useEffect } from 'react';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea } from '../ui/controls';
import { mergeThemeProps } from '../ui/themeProps';
import { 
  ArrowLeft, Save, Sparkles, User, ShieldCheck, CreditCard, 
  MapPin, Mail, Phone, Building, CheckCircle2, AlertCircle, FileText,
  Calendar, Check, X
} from 'lucide-react';
import { consultarRucSri } from '../../services/sriService';
import { doc, setDoc, getDocs, collection, query, where } from '../../services/financeStore.js';

export default function CustomerDetailView({ 
  client, 
  onBack, 
  onSaved, 
  showToast, 
  db, 
  appId, 
  forcedType = 'cliente' 
}) {
  const isEditing = !!client?.id;

  // Identification & Fiscal Data
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    ruc: '',
    tipoIdentificacion: 'ruc',
    tipoContribuyente: 'general',
    type: forcedType || 'cliente',
    email: '',
    secondaryEmail: '',
    telefono: '',
    celular: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    referencia: '',
    // Credit fields
    hasCredit: false,
    creditLimit: 500,
    paymentDays: 30,
    creditStatus: 'activo',
    guarantorName: '',
    guarantorPhone: '',
    creditObservations: '',
    notas: ''
  });

  const [isQueryingSri, setIsQueryingSri] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'contacto' | 'credito' | 'balance'
  const [clientFinancialSummary, setClientFinancialSummary] = useState({
    totalDeuda: 0,
    facturasPendientes: 0,
    cupoDisponible: 0
  });

  useEffect(() => {
    if (client) {
      const limit = Number(client.creditLimit || client.cupoCredito || client.limiteCredito) || 0;
      const hasCred = !!(client.hasCredit || limit > 0);
      setFormData({
        name: client.name || client.razonSocial || '',
        tradeName: client.tradeName || client.nombreComercial || '',
        ruc: client.ruc || client.identificacion || '',
        tipoIdentificacion: client.tipoIdentificacion || 'ruc',
        tipoContribuyente: client.tipoContribuyente || 'general',
        type: client.type || forcedType || 'cliente',
        email: client.email || '',
        secondaryEmail: client.secondaryEmail || '',
        telefono: client.telefono || '',
        celular: client.celular || '',
        direccion: client.direccion || '',
        ciudad: client.ciudad || '',
        provincia: client.provincia || '',
        referencia: client.referencia || '',
        hasCredit: hasCred,
        creditLimit: limit || 500,
        paymentDays: Number(client.paymentDays || client.diasCredito) || 30,
        creditStatus: client.creditStatus || 'activo',
        guarantorName: client.guarantorName || client.garanteNombre || '',
        guarantorPhone: client.guarantorPhone || client.garanteTelefono || '',
        creditObservations: client.creditObservations || client.observacionesCredito || '',
        notas: client.notas || ''
      });

      // Load client CxC debt if editing
      if (db && client.id) {
        (async () => {
          try {
            const q = query(
              collection(db, 'fin_cxc'),
              where('tercero.id', '==', client.id),
              where('estado', 'in', ['pendiente', 'parcial'])
            );
            const snap = await getDocs(q);
            let deuda = 0;
            let count = 0;
            snap.forEach(d => {
              const item = d.data();
              deuda += Number(item.saldoPendiente || 0);
              count++;
            });
            setClientFinancialSummary({
              totalDeuda: deuda,
              facturasPendientes: count,
              cupoDisponible: Math.max(0, (limit || 500) - deuda)
            });
          } catch (err) {
            console.error('Error cargando balance de cliente:', err);
          }
        })();
      }
    }
  }, [client, db, forcedType]);

  const querySRI = async () => {
    if (!formData.ruc) {
      showToast?.('Por favor, ingresa un número de RUC o Cédula', 'error');
      return;
    }
    setIsQueryingSri(true);
    try {
      const result = await consultarRucSri(formData.ruc);
      const guessCity = (address) => {
        if (!address) return '';
        const cleanAddr = address.toLowerCase();
        if (cleanAddr.includes('quito')) return 'Quito';
        if (cleanAddr.includes('guayaquil')) return 'Guayaquil';
        if (cleanAddr.includes('cuenca')) return 'Cuenca';
        if (cleanAddr.includes('ambato')) return 'Ambato';
        if (cleanAddr.includes('manta')) return 'Manta';
        if (cleanAddr.includes('loja')) return 'Loja';
        if (cleanAddr.includes('ibarra')) return 'Ibarra';
        if (cleanAddr.includes('santo domingo')) return 'Santo Domingo';
        return '';
      };
      setFormData(prev => ({
        ...prev,
        name: result.name,
        tipoIdentificacion: result.tipoIdentificacion,
        direccion: result.direccion,
        telefono: result.telefono,
        email: result.email || prev.email,
        tipoContribuyente: result.tipoContribuyente || 'general',
        ciudad: guessCity(result.direccion) || prev.ciudad || ''
      }));
      showToast?.('Datos fiscales validados desde el SRI', 'success');
    } catch (e) {
      console.error('Error al consultar RUC en SRI:', e);
      showToast?.(e.message || 'Error al consultar datos en el SRI', 'error');
    } finally {
      setIsQueryingSri(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.ruc.trim()) {
      showToast?.('Nombre y RUC/Identificación son obligatorios.', 'error');
      return;
    }

    setSaving(true);
    try {
      const docId = client?.id || `tp_${Date.now()}`;
      const payload = {
        id: docId,
        name: formData.name.trim(),
        tradeName: formData.tradeName.trim(),
        ruc: formData.ruc.trim(),
        tipoIdentificacion: formData.tipoIdentificacion,
        tipoContribuyente: formData.tipoContribuyente,
        type: formData.type || forcedType || 'cliente',
        email: formData.email.trim(),
        secondaryEmail: formData.secondaryEmail.trim(),
        telefono: formData.telefono.trim(),
        celular: formData.celular.trim(),
        direccion: formData.direccion.trim(),
        ciudad: formData.ciudad.trim(),
        provincia: formData.provincia.trim(),
        referencia: formData.referencia.trim(),
        // Credit configuration
        hasCredit: !!formData.hasCredit,
        creditLimit: formData.hasCredit ? Number(formData.creditLimit) || 0 : 0,
        limiteCredito: formData.hasCredit ? Number(formData.creditLimit) || 0 : 0,
        cupoCredito: formData.hasCredit ? Number(formData.creditLimit) || 0 : 0,
        paymentDays: formData.hasCredit ? Number(formData.paymentDays) || 30 : 0,
        diasCredito: formData.hasCredit ? Number(formData.paymentDays) || 30 : 0,
        creditStatus: formData.hasCredit ? formData.creditStatus : 'inactivo',
        guarantorName: formData.hasCredit ? formData.guarantorName.trim() : '',
        guarantorPhone: formData.hasCredit ? formData.guarantorPhone.trim() : '',
        creditObservations: formData.creditObservations.trim(),
        notas: formData.notas.trim(),
        isValidated: true,
        validado: true,
        updatedAt: new Date().toISOString()
      };

      if (!isEditing) {
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), payload, { merge: true });
      showToast?.('Ficha del cliente guardada exitosamente.', 'success');
      onSaved?.(payload);
    } catch (err) {
      console.error('Error guardando cliente:', err);
      showToast?.('Error al guardar la información del cliente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <UiBox className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header / Breadcrumb Bar */}
      <UiBox className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--gray-a6)]">
        <UiBox className="flex items-center gap-3">
          <UiButton
            type="button"
            onClick={onBack}
            {...mergeThemeProps({ "variant": "surface", "color": "gray", "size": "2" })}
          >
            <ArrowLeft size={16} /> Volver al Listado
          </UiButton>
          <UiBox className="h-6 w-px bg-[var(--gray-a6)]" />
          <UiBox>
            <UiHeading as="h2" {...mergeThemeProps({ "size": "4", "weight": "bold", "color": "gray", "highContrast": true })}>
              {isEditing ? `Ficha: ${formData.name || 'Cliente'}` : 'Nuevo Registro de Tercero'}
            </UiHeading>
            <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
              {isEditing ? `RUC/Cédula: ${formData.ruc} • Configuración de perfil y crédito` : 'Registra un nuevo cliente con políticas fiscales y cupo de crédito'}
            </UiText>
          </UiBox>
        </UiBox>

        <UiBox className="flex items-center gap-2.5 w-full sm:w-auto">
          <UiButton
            type="button"
            onClick={onBack}
            {...mergeThemeProps({ "variant": "outline", "color": "gray", "size": "2" })}
          >
            Cancelar
          </UiButton>
          <UiButton
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            {...mergeThemeProps({ "variant": "solid", "color": "blue", "size": "2", "className": "shadow-sm" })}
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar Información'}
          </UiButton>
        </UiBox>
      </UiBox>

      {/* Profile Overview Card (when editing) */}
      {isEditing && (
        <UiCard
          {...mergeThemeProps({
            "style": { "backgroundColor": "var(--color-panel-solid)", "borderRadius": "var(--radius-4)", "border": "1px solid var(--gray-a6)" },
            "className": "p-5"
          })}
        >
          <UiBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <UiBox className="flex items-center gap-3">
              <UiBox
                {...mergeThemeProps({
                  "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--blue-9)", "color": "white" },
                  "className": "w-12 h-12 flex items-center justify-center font-bold text-lg shadow-sm shrink-0"
                })}
              >
                {(formData.name || 'C').charAt(0).toUpperCase()}
              </UiBox>
              <UiBox className="min-w-0">
                <UiText {...mergeThemeProps({ "size": "2", "weight": "bold", "color": "gray", "highContrast": true, "className": "truncate block" })}>
                  {formData.name || 'Sin Razón Social'}
                </UiText>
                <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "className": "block" })}>
                  {formData.ruc}
                </UiText>
                <UiText {...mergeThemeProps({ "size": "1", "color": "blue", "weight": "medium" })}>
                  {formData.tipoContribuyente.toUpperCase()}
                </UiText>
              </UiBox>
            </UiBox>

            <UiBox className="p-3 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-a5)]">
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "weight": "bold" })}>LÍNEA DE CRÉDITO</UiText>
              <UiBox className="flex items-center gap-2 mt-1">
                <ShieldCheck size={18} className={formData.hasCredit ? "text-green-600" : "text-gray-400"} />
                <UiText {...mergeThemeProps({ "size": "2", "weight": "bold", "color": formData.hasCredit ? "green" : "gray" })}>
                  {formData.hasCredit ? `Activa ($${Number(formData.creditLimit).toFixed(2)})` : 'Deshabilitada'}
                </UiText>
              </UiBox>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                Plazo: {formData.hasCredit ? `${formData.paymentDays} días` : 'Contado'}
              </UiText>
            </UiBox>

            <UiBox className="p-3 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-a5)]">
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "weight": "bold" })}>DEUDA CARTERA (CXC)</UiText>
              <UiText {...mergeThemeProps({ "size": "3", "weight": "bold", "color": clientFinancialSummary.totalDeuda > 0 ? "red" : "gray", "highContrast": true, "className": "mt-1" })}>
                ${clientFinancialSummary.totalDeuda.toFixed(2)}
              </UiText>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                {clientFinancialSummary.facturasPendientes} {clientFinancialSummary.facturasPendientes === 1 ? 'factura pendiente' : 'facturas pendientes'}
              </UiText>
            </UiBox>

            <UiBox className="p-3 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-a5)]">
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "weight": "bold" })}>CUPO DISPONIBLE</UiText>
              <UiText {...mergeThemeProps({ "size": "3", "weight": "bold", "color": "blue", "className": "mt-1" })}>
                ${clientFinancialSummary.cupoDisponible.toFixed(2)}
              </UiText>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                De un total de ${Number(formData.creditLimit).toFixed(2)}
              </UiText>
            </UiBox>
          </UiBox>
        </UiCard>
      )}

      {/* Tabs Navigation */}
      <UiBox className="flex items-center gap-2 border-b border-[var(--gray-a6)] pb-2 overflow-x-auto">
        <UiButton
          type="button"
          onClick={() => setActiveTab('general')}
          {...mergeThemeProps(
            { "variant": activeTab === 'general' ? 'solid' : 'ghost', "color": activeTab === 'general' ? 'blue' : 'gray', "size": "2" }
          )}
        >
          <Building size={15} /> 1. Datos Fiscales y Generales
        </UiButton>
        <UiButton
          type="button"
          onClick={() => setActiveTab('contacto')}
          {...mergeThemeProps(
            { "variant": activeTab === 'contacto' ? 'solid' : 'ghost', "color": activeTab === 'contacto' ? 'blue' : 'gray', "size": "2" }
          )}
        >
          <MapPin size={15} /> 2. Contacto y Dirección
        </UiButton>
        <UiButton
          type="button"
          onClick={() => setActiveTab('credito')}
          {...mergeThemeProps(
            { "variant": activeTab === 'credito' ? 'solid' : 'ghost', "color": activeTab === 'credito' ? 'blue' : 'gray', "size": "2" }
          )}
        >
          <CreditCard size={15} /> 3. Línea de Crédito y Cobranza {formData.hasCredit && '★'}
        </UiButton>
      </UiBox>

      {/* Tab 1: General & Fiscal */}
      {activeTab === 'general' && (
        <UiCard
          {...mergeThemeProps({
            "style": { "backgroundColor": "var(--color-panel-solid)", "borderRadius": "var(--radius-4)", "border": "1px solid var(--gray-a6)" },
            "className": "p-6 space-y-5"
          })}
        >
          <UiBox className="flex items-center justify-between">
            <UiBox>
              <UiHeading as="h3" {...mergeThemeProps({ "size": "3", "weight": "bold", "color": "gray", "highContrast": true })}>
                Identificación Tributaria
              </UiHeading>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                Datos requeridos por el SRI para la emisión de facturas y retenciones
              </UiText>
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Tipo de Identificación *
              </UiLabel>
              <UiSelect
                value={formData.tipoIdentificacion}
                onChange={e => setFormData(p => ({ ...p, tipoIdentificacion: e.target.value }))}
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              >
                <option value="ruc">RUC (Registro Único de Contribuyentes)</option>
                <option value="cedula">Cédula de Identidad</option>
                <option value="pasaporte">Pasaporte / Identificación Extranjera</option>
                <option value="consumidor_final">Consumidor Final</option>
              </UiSelect>
            </UiBox>

            <UiBox className="space-y-1.5 sm:col-span-2">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Número de RUC / Cédula *
              </UiLabel>
              <UiBox className="flex gap-2">
                <UiInput
                  type="text"
                  required
                  value={formData.ruc}
                  onChange={e => setFormData(p => ({ ...p, ruc: e.target.value }))}
                  placeholder="Ej: 1790011234001 o 1712345678"
                  {...mergeThemeProps({ "size": "2", "className": "w-full font-mono" })}
                />
                <UiButton
                  type="button"
                  disabled={isQueryingSri}
                  onClick={querySRI}
                  {...mergeThemeProps({ "variant": "solid", "color": "blue", "size": "2", "className": "shrink-0" })}
                >
                  <Sparkles size={15} />
                  {isQueryingSri ? 'Consultando...' : 'Autocompletar SRI'}
                </UiButton>
              </UiBox>
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Razón Social / Nombre Completo *
              </UiLabel>
              <UiInput
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: CORPORACIÓN COMERCIAL S.A. o JUAN PÉREZ"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Nombre Comercial / Fantasía
              </UiLabel>
              <UiInput
                type="text"
                value={formData.tradeName}
                onChange={e => setFormData(p => ({ ...p, tradeName: e.target.value }))}
                placeholder="Ej: Tienda El Ahorro"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Régimen Fiscal / Tipo de Contribuyente
              </UiLabel>
              <UiSelect
                value={formData.tipoContribuyente}
                onChange={e => setFormData(p => ({ ...p, tipoContribuyente: e.target.value }))}
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              >
                <option value="general">Régimen General</option>
                <option value="rimpe_emprendedor">RIMPE - Emprendedor</option>
                <option value="rimpe_popular">RIMPE - Negocio Popular</option>
                <option value="especial">Contribuyente Especial</option>
                <option value="exportador">Exportador Habitual</option>
              </UiSelect>
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Tipo de Rol en ERP
              </UiLabel>
              <UiSelect
                value={formData.type}
                onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              >
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
                <option value="ambos">Cliente y Proveedor (Ambos)</option>
              </UiSelect>
            </UiBox>
          </UiBox>
        </UiCard>
      )}

      {/* Tab 2: Contact & Location */}
      {activeTab === 'contacto' && (
        <UiCard
          {...mergeThemeProps({
            "style": { "backgroundColor": "var(--color-panel-solid)", "borderRadius": "var(--radius-4)", "border": "1px solid var(--gray-a6)" },
            "className": "p-6 space-y-5"
          })}
        >
          <UiBox>
            <UiHeading as="h3" {...mergeThemeProps({ "size": "3", "weight": "bold", "color": "gray", "highContrast": true })}>
              Canales de Comunicación y Entrega
            </UiHeading>
            <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
              Correos para envío de facturas electrónicas (RIDE/XML) y teléfonos de contacto
            </UiText>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Correo Electrónico de Facturación
              </UiLabel>
              <UiInput
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="facturacion@empresa.com"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                Correo Secundario / Cobranzas
              </UiLabel>
              <UiInput
                type="email"
                value={formData.secondaryEmail}
                onChange={e => setFormData(p => ({ ...p, secondaryEmail: e.target.value }))}
                placeholder="cobranzas@empresa.com"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Teléfono Celular (WhatsApp)
              </UiLabel>
              <UiInput
                type="tel"
                value={formData.celular}
                onChange={e => setFormData(p => ({ ...p, celular: e.target.value }))}
                placeholder="0991234567"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                Teléfono Fijo / Convencional
              </UiLabel>
              <UiInput
                type="tel"
                value={formData.telefono}
                onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                placeholder="022123456"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>
          </UiBox>

          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
              Dirección Principal / Domicilio Fiscal *
            </UiLabel>
            <UiInput
              type="text"
              value={formData.direccion}
              onChange={e => setFormData(p => ({ ...p, direccion: e.target.value }))}
              placeholder="Av. Principal N12-34 y Calle Secundaria"
              {...mergeThemeProps({ "size": "2", "className": "w-full" })}
            />
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Ciudad / Cantón</UiLabel>
              <UiInput
                type="text"
                value={formData.ciudad}
                onChange={e => setFormData(p => ({ ...p, ciudad: e.target.value }))}
                placeholder="Ej: Quito"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Provincia</UiLabel>
              <UiInput
                type="text"
                value={formData.provincia}
                onChange={e => setFormData(p => ({ ...p, provincia: e.target.value }))}
                placeholder="Ej: Pichincha"
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Referencia de Entrega</UiLabel>
              <UiInput
                type="text"
                value={formData.referencia}
                onChange={e => setFormData(p => ({ ...p, referencia: e.target.value }))}
                placeholder="Frente al parque..."
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>
          </UiBox>
        </UiCard>
      )}

      {/* Tab 3: Credit Line & Collection Management */}
      {activeTab === 'credito' && (
        <UiCard
          {...mergeThemeProps({
            "style": { "backgroundColor": "var(--color-panel-solid)", "borderRadius": "var(--radius-4)", "border": "1px solid var(--gray-a6)" },
            "className": "p-6 space-y-6"
          })}
        >
          {/* Credit Activation Switch Banner */}
          <UiBox
            {...mergeThemeProps({
              "style": {
                "borderRadius": "var(--radius-3)",
                "backgroundColor": formData.hasCredit ? "var(--green-2)" : "var(--gray-2)",
                "border": formData.hasCredit ? "1px solid var(--green-6)" : "1px solid var(--gray-a6)"
              },
              "className": "p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            })}
          >
            <UiBox className="flex items-center gap-3">
              <UiBox
                {...mergeThemeProps({
                  "style": {
                    "borderRadius": "var(--radius-3)",
                    "backgroundColor": formData.hasCredit ? "var(--green-9)" : "var(--gray-8)",
                    "color": "white"
                  },
                  "className": "w-10 h-10 flex items-center justify-center shrink-0 shadow-sm"
                })}
              >
                <ShieldCheck size={22} />
              </UiBox>
              <UiBox>
                <UiHeading as="h4" {...mergeThemeProps({ "size": "3", "weight": "bold", "color": "gray", "highContrast": true })}>
                  Línea de Crédito para este Cliente
                </UiHeading>
                <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                  {formData.hasCredit 
                    ? 'Línea de crédito HABILITADA. El cliente puede realizar compras a crédito en Ventas y POS con cupo controlado.'
                    : 'Línea de crédito DESHABILITADA. El cliente solo podrá operar bajo pagos de contado (efectivo, transferencia o tarjeta).'}
                </UiText>
              </UiBox>
            </UiBox>

            {/* Switch Toggle Button */}
            <UiButton
              type="button"
              onClick={() => setFormData(p => ({ ...p, hasCredit: !p.hasCredit }))}
              {...mergeThemeProps({
                "variant": formData.hasCredit ? "solid" : "outline",
                "color": formData.hasCredit ? "green" : "gray",
                "size": "3",
                "className": "cursor-pointer font-bold shrink-0"
              })}
            >
              {formData.hasCredit ? (
                <>
                  <Check size={16} /> Crédito Habilitado
                </>
              ) : (
                <>
                  <X size={16} /> Activar Crédito
                </>
              )}
            </UiButton>
          </UiBox>

          {formData.hasCredit ? (
            <UiBox className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Cupo */}
                <UiBox className="space-y-1.5">
                  <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                    Cupo Máximo Autorizado ($) *
                  </UiLabel>
                  <UiBox className="relative">
                    <UiText {...mergeThemeProps({ "size": "2", "weight": "bold", "color": "gray", "highContrast": true, "className": "absolute left-3 top-1/2 -translate-y-1/2 opacity-60" })}>
                      $
                    </UiText>
                    <UiInput
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={formData.creditLimit}
                      onChange={e => setFormData(p => ({ ...p, creditLimit: e.target.value }))}
                      style={{ paddingLeft: '28px' }}
                      {...mergeThemeProps({ "size": "2", "className": "w-full font-bold" })}
                    />
                  </UiBox>
                </UiBox>

                {/* Plazo */}
                <UiBox className="space-y-1.5">
                  <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                    Plazo de Pago *
                  </UiLabel>
                  <UiSelect
                    value={formData.paymentDays}
                    onChange={e => setFormData(p => ({ ...p, paymentDays: Number(e.target.value) }))}
                    {...mergeThemeProps({ "size": "2", "className": "w-full" })}
                  >
                    <option value={7}>7 días (Semanal)</option>
                    <option value={15}>15 días (Quincenal)</option>
                    <option value={30}>30 días (Mensual estándar)</option>
                    <option value={45}>45 días</option>
                    <option value={60}>60 días (Bimestral)</option>
                    <option value={90}>90 días (Trimestral)</option>
                  </UiSelect>
                </UiBox>

                {/* Estado */}
                <UiBox className="space-y-1.5">
                  <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                    Estado Crediticio
                  </UiLabel>
                  <UiSelect
                    value={formData.creditStatus}
                    onChange={e => setFormData(p => ({ ...p, creditStatus: e.target.value }))}
                    {...mergeThemeProps({ "size": "2", "className": "w-full" })}
                  >
                    <option value="activo">Activo (Aprobado)</option>
                    <option value="bloqueado">Bloqueado (Suspendido por Mora)</option>
                    <option value="en_revision">En Revisión de Riesgo</option>
                  </UiSelect>
                </UiBox>
              </UiBox>

              {/* Garante */}
              <UiBox
                {...mergeThemeProps({
                  "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--gray-2)", "border": "1px solid var(--gray-a5)" },
                  "className": "p-4 space-y-3"
                })}
              >
                <UiText {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                  Datos del Garante / Fiador Solidario (Opcional)
                </UiText>
                <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UiBox className="space-y-1">
                    <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Nombres Completos</UiLabel>
                    <UiInput
                      type="text"
                      value={formData.guarantorName}
                      onChange={e => setFormData(p => ({ ...p, guarantorName: e.target.value }))}
                      placeholder="Ej: Marcelo Morales"
                      {...mergeThemeProps({ "size": "2", "className": "w-full" })}
                    />
                  </UiBox>
                  <UiBox className="space-y-1">
                    <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Teléfono de Contacto</UiLabel>
                    <UiInput
                      type="text"
                      value={formData.guarantorPhone}
                      onChange={e => setFormData(p => ({ ...p, guarantorPhone: e.target.value }))}
                      placeholder="Ej: 0987654321"
                      {...mergeThemeProps({ "size": "2", "className": "w-full" })}
                    />
                  </UiBox>
                </UiBox>
              </UiBox>

              {/* Observaciones */}
              <UiBox className="space-y-1.5">
                <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                  Políticas y Observaciones de Crédito
                </UiLabel>
                <UiTextarea
                  rows={3}
                  value={formData.creditObservations}
                  onChange={e => setFormData(p => ({ ...p, creditObservations: e.target.value }))}
                  placeholder="Ej: Aprobado con pagaré a la orden #104. Descuento comercial máximo 5%..."
                  {...mergeThemeProps({ "size": "2", "className": "w-full" })}
                />
              </UiBox>
            </UiBox>
          ) : (
            <UiBox
              {...mergeThemeProps({
                "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--gray-2)", "border": "1px dashed var(--gray-a6)" },
                "className": "p-8 text-center space-y-2"
              })}
            >
              <CreditCard size={32} className="mx-auto text-gray-400 opacity-60" />
              <UiHeading as="h4" {...mergeThemeProps({ "size": "2", "weight": "bold", "color": "gray", "highContrast": true })}>
                Este cliente no cuenta con crédito comercial
              </UiHeading>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "className": "max-w-md mx-auto block" })}>
                Para habilitar ventas con pago a plazo o abonos parciales diferidos, activa el botón de crédito arriba y asigna un cupo en dólares.
              </UiText>
            </UiBox>
          )}
        </UiCard>
      )}

      {/* Action Footer */}
      <UiBox className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--gray-a6)]">
        <UiButton
          type="button"
          onClick={onBack}
          {...mergeThemeProps({ "variant": "outline", "color": "gray", "size": "2" })}
        >
          Volver
        </UiButton>
        <UiButton
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          {...mergeThemeProps({ "variant": "solid", "color": "blue", "size": "2", "className": "shadow-sm" })}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar Información'}
        </UiButton>
      </UiBox>
    </UiBox>
  );
}
