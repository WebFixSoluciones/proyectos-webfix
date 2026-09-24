import { useState, useEffect, useMemo } from 'react';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { Badge } from '../ui/badge';
import { 
  ArrowLeft, Save, Sparkles, ShieldCheck, CreditCard, 
  MapPin, Mail, Phone, Building, CheckCircle2, Clock,
  FileText, Calendar, Check, X, User, ExternalLink, HelpCircle
} from 'lucide-react';
import { consultarRucSri, validarIdentificacion, getEcuadorDateString } from '../../services/sriService';
import { doc, setDoc, getDocs, collection, query, where } from '../../services/financeStore.js';

export default function CustomerDetailView({ 
  client, 
  transactions = [],
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
    obligadoContabilidad: false,
    agenteRetencion: false,
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
    commercialContactName: '',
    commercialContactPhone: '',
    creditObservations: '',
    notas: ''
  });

  const isSupplier = (formData.type || forcedType) === 'proveedor';

  const [isQueryingSri, setIsQueryingSri] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'contacto' | 'credito' | 'historial'
  const [clientFinancialSummary, setClientFinancialSummary] = useState({
    totalDeuda: 0,
    facturasPendientes: 0,
    cupoDisponible: 0
  });

  useEffect(() => {
    if (client) {
      const limit = Number(client.creditLimit || client.cupoCredito || client.limiteCredito) || 0;
      const days = Number(client.paymentDays || client.diasCredito) || 30;
      const isSup = (client.type || forcedType) === 'proveedor';
      const hasCred = !!(client.hasCredit || limit > 0 || (isSup && days > 0));

      setFormData({
        name: client.name || client.razonSocial || '',
        tradeName: client.tradeName || client.nombreComercial || '',
        ruc: client.ruc || client.identificacion || '',
        tipoIdentificacion: client.tipoIdentificacion || 'ruc',
        tipoContribuyente: client.tipoContribuyente || 'general',
        type: client.type || forcedType || 'cliente',
        obligadoContabilidad: !!(client.obligadoContabilidad || client.obligadoLlevarContabilidad),
        agenteRetencion: !!(client.agenteRetencion),
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
        paymentDays: days,
        creditStatus: client.creditStatus || 'activo',
        guarantorName: client.guarantorName || client.garanteNombre || '',
        guarantorPhone: client.guarantorPhone || client.garanteTelefono || '',
        commercialContactName: client.commercialContactName || client.asesorNombre || '',
        commercialContactPhone: client.commercialContactPhone || client.asesorTelefono || '',
        creditObservations: client.creditObservations || client.observacionesCredito || '',
        notas: client.notas || ''
      });

      // Load client CxC debt or supplier CxP debt
      if (db && (client.id || client.ruc)) {
        (async () => {
          try {
            const targetCol = isSup ? 'fin_cxp' : 'fin_cxc';
            const colRef = collection(db, targetCol);

            let q = query(
              colRef,
              where('tercero.id', '==', client.id),
              where('estado', 'in', ['pendiente', 'parcial'])
            );
            let snap = await getDocs(q);

            if (snap.empty && client.ruc) {
              q = query(
                colRef,
                where('tercero.ruc', '==', client.ruc),
                where('estado', 'in', ['pendiente', 'parcial'])
              );
              snap = await getDocs(q);
            }

            let deuda = 0;
            let count = 0;
            snap.forEach(d => {
              const item = d.data();
              deuda += Number(item.saldoPendiente || item.saldo || item.monto || 0);
              count++;
            });

            setClientFinancialSummary({
              totalDeuda: deuda,
              facturasPendientes: count,
              cupoDisponible: Math.max(0, (limit || 500) - deuda)
            });
          } catch (err) {
            console.warn('Error cargando balance del tercero:', err);
          }
        })();
      }
    }
  }, [client, db, forcedType]);

  // Related transactions list for this third party
  const relatedTransactions = useMemo(() => {
    if (!client && !formData.ruc) return [];
    const cid = client?.id;
    const cruc = client?.ruc || formData.ruc;
    return (transactions || []).filter(t => {
      if (!t) return false;
      const matchId = cid && (
        t.thirdPartyId === cid || 
        t.terceroId === cid || 
        t.clienteId === cid || 
        t.proveedorId === cid ||
        t.tercero?.id === cid
      );
      const matchRuc = cruc && (
        t.thirdPartyRuc === cruc || 
        t.clientRuc === cruc || 
        t.proveedorRuc === cruc || 
        t.ruc === cruc ||
        t.tercero?.ruc === cruc
      );
      return matchId || matchRuc;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [client, formData.ruc, transactions]);

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
        name: result.name || result.razonSocial || prev.name,
        tradeName: result.nombreComercial || prev.tradeName,
        tipoIdentificacion: result.tipoIdentificacion || (formData.ruc.length === 10 ? 'cedula' : 'ruc'),
        direccion: result.direccion || prev.direccion,
        telefono: result.telefono || prev.telefono,
        email: result.email || prev.email,
        tipoContribuyente: result.tipoContribuyente || prev.tipoContribuyente || 'general',
        obligadoContabilidad: result.obligadoContabilidad ?? prev.obligadoContabilidad,
        agenteRetencion: result.agenteRetencion ?? prev.agenteRetencion,
        ciudad: guessCity(result.direccion) || prev.ciudad || ''
      }));
      showToast?.('Datos fiscales autocompletados desde el SRI', 'success');
    } catch (e) {
      console.error('Error al consultar RUC en SRI:', e);
      showToast?.(e.message || 'Error al consultar datos en el SRI', 'error');
    } finally {
      setIsQueryingSri(false);
    }
  };

  const handleTipoIdentificacionChange = (val) => {
    if (val === 'consumidor_final') {
      setFormData(p => ({
        ...p,
        tipoIdentificacion: 'consumidor_final',
        ruc: '9999999999999',
        name: p.name || 'CONSUMIDOR FINAL',
        direccion: p.direccion || 'Ecuador',
        hasCredit: false
      }));
    } else {
      setFormData(p => ({
        ...p,
        tipoIdentificacion: val,
        ruc: p.ruc === '9999999999999' ? '' : p.ruc,
        name: p.name === 'CONSUMIDOR FINAL' ? '' : p.name
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.ruc.trim()) {
      showToast?.('Nombre y RUC/Identificación son obligatorios.', 'error');
      return;
    }

    // Validation check for ID
    if (formData.tipoIdentificacion !== 'consumidor_final' && formData.tipoIdentificacion !== 'pasaporte') {
      const isValid = validarIdentificacion(formData.ruc, formData.tipoIdentificacion);
      if (!isValid && formData.ruc.length >= 10) {
        const proceed = window.confirm(`El número de identificación "${formData.ruc}" no parece cumplir con el formato estándar del SRI. ¿Deseas guardarlo de todas formas?`);
        if (!proceed) return;
      }
    }

    setSaving(true);
    try {
      const docId = client?.id || `tp_${Date.now()}`;
      const payload = {
        id: docId,
        name: formData.name.trim(),
        tradeName: formData.tradeName.trim(),
        razonSocial: formData.name.trim(),
        nombreComercial: formData.tradeName.trim(),
        ruc: formData.ruc.trim(),
        tipoIdentificacion: formData.tipoIdentificacion,
        tipoContribuyente: formData.tipoContribuyente,
        type: formData.type || forcedType || 'cliente',
        obligadoContabilidad: !!formData.obligadoContabilidad,
        agenteRetencion: !!formData.agenteRetencion,
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
        paymentDays: formData.hasCredit || isSupplier ? Number(formData.paymentDays) || 30 : 0,
        diasCredito: formData.hasCredit || isSupplier ? Number(formData.paymentDays) || 30 : 0,
        creditStatus: formData.hasCredit ? formData.creditStatus : 'inactivo',
        guarantorName: formData.hasCredit ? formData.guarantorName.trim() : '',
        guarantorPhone: formData.hasCredit ? formData.guarantorPhone.trim() : '',
        commercialContactName: formData.commercialContactName.trim(),
        commercialContactPhone: formData.commercialContactPhone.trim(),
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
      showToast?.(`Ficha de ${isSupplier ? 'proveedor' : 'cliente'} guardada exitosamente.`, 'success');
      onSaved?.(payload);
    } catch (err) {
      console.error('Error guardando tercero:', err);
      showToast?.(`Error al guardar la información del ${isSupplier ? 'proveedor' : 'cliente'}.`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <UiBox className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header / Breadcrumb Bar */}
      <UiBox className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--gray-a6)]">
        <UiBox className="flex items-center gap-3">
          <UiButton
            type="button"
            onClick={onBack}
            variant="surface"
            color="gray"
            size="2"
            className="cursor-pointer"
          >
            <ArrowLeft size={16} /> Volver a {isSupplier ? 'Proveedores' : 'Clientes'}
          </UiButton>
          <UiBox className="h-6 w-px bg-[var(--gray-a6)]" />
          <UiBox>
            <UiHeading as="h2" size="4" weight="bold" color="gray" highContrast>
              {isEditing 
                ? (isSupplier ? `Ficha: ${formData.name || 'Proveedor'}` : `Ficha: ${formData.name || 'Cliente'}`)
                : (isSupplier ? 'Nuevo Registro de Proveedor' : 'Nuevo Registro de Cliente')
              }
            </UiHeading>
            <UiText size="1" color="gray">
              {isEditing 
                ? `RUC/Identificación: ${formData.ruc} • ${isSupplier ? 'Condiciones comerciales y compras' : 'Configuración de perfil y crédito'}`
                : isSupplier
                  ? 'Registra un proveedor comercial con datos fiscales y plazos de pago'
                  : 'Registra un cliente con políticas fiscales y cupo de crédito'
              }
            </UiText>
          </UiBox>
        </UiBox>

        <UiBox className="flex items-center gap-2.5 w-full sm:w-auto">
          <UiButton
            type="button"
            onClick={onBack}
            variant="outline"
            color="gray"
            size="2"
            className="cursor-pointer"
          >
            Cancelar
          </UiButton>
          <UiButton
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            variant="solid"
            color="blue"
            size="2"
            className="font-medium cursor-pointer"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar Información'}
          </UiButton>
        </UiBox>
      </UiBox>

      {/* Profile Overview Card (when editing) */}
      {isEditing && (
        <UiCard 
          style={{ 
            backgroundColor: "var(--color-panel-solid)", 
            borderRadius: "var(--radius-4)", 
            border: "1px solid var(--gray-a6)" 
          }} 
          className="p-5"
        >
          <UiBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overview Col 1: Basic Info */}
            <UiBox className="flex items-center gap-3">
              <UiBox
                style={{ 
                  borderRadius: "var(--radius-3)", 
                  backgroundColor: isSupplier ? "var(--purple-3)" : "var(--blue-3)", 
                  color: isSupplier ? "var(--purple-11)" : "var(--blue-11)",
                  border: isSupplier ? "1px solid var(--purple-6)" : "1px solid var(--blue-6)"
                }}
                className="w-12 h-12 flex items-center justify-center font-bold text-lg shrink-0"
              >
                {(formData.name || (isSupplier ? 'P' : 'C')).charAt(0).toUpperCase()}
              </UiBox>
              <UiBox className="min-w-0">
                <UiText size="2" weight="bold" color="gray" highContrast className="truncate block">
                  {formData.name || 'Sin Razón Social'}
                </UiText>
                <UiText size="1" color="gray" className="block font-mono">
                  {formData.ruc}
                </UiText>
                <UiBox className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="soft" color="blue" size="1">
                    {formData.tipoContribuyente.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {formData.obligadoContabilidad && (
                    <Badge variant="soft" color="green" size="1">
                      Contabilidad
                    </Badge>
                  )}
                </UiBox>
              </UiBox>
            </UiBox>

            {/* Overview Col 2: Credit Terms */}
            <UiBox className="p-3 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-a5)]">
              <UiText size="1" color="gray" weight="bold">
                {isSupplier ? 'CONDICIÓN DE PAGO' : 'LÍNEA DE CRÉDITO'}
              </UiText>
              <UiBox className="flex items-center gap-2 mt-1">
                {isSupplier ? (
                  <>
                    <Clock size={18} className={formData.hasCredit || formData.paymentDays > 0 ? "text-blue-600" : "text-gray-400"} />
                    <UiText size="2" weight="bold" color={formData.hasCredit || formData.paymentDays > 0 ? "blue" : "gray"}>
                      {formData.hasCredit || formData.paymentDays > 0 
                        ? `Crédito (${formData.paymentDays || 30}d)` 
                        : 'Pago Contado'
                      }
                    </UiText>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} className={formData.hasCredit ? "text-green-600" : "text-gray-400"} />
                    <UiText size="2" weight="bold" color={formData.hasCredit ? "green" : "gray"}>
                      {formData.hasCredit ? `Activa ($${Number(formData.creditLimit).toFixed(2)})` : 'Deshabilitada'}
                    </UiText>
                  </>
                )}
              </UiBox>
              <UiText size="1" color="gray">
                {isSupplier
                  ? (formData.hasCredit ? `Cupo: $${Number(formData.creditLimit || 0).toFixed(2)}` : 'Contra entrega')
                  : `Plazo: ${formData.hasCredit ? `${formData.paymentDays} días` : 'Contado'}`
                }
              </UiText>
            </UiBox>

            {/* Overview Col 3: Debt / Balance */}
            <UiBox className="p-3 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-a5)]">
              <UiText size="1" color="gray" weight="bold">
                {isSupplier ? 'SALDO PENDIENTE (CXP)' : 'DEUDA CARTERA (CXC)'}
              </UiText>
              <UiText size="3" weight="bold" color={clientFinancialSummary.totalDeuda > 0 ? "red" : "gray"} highContrast className="mt-1">
                ${clientFinancialSummary.totalDeuda.toFixed(2)}
              </UiText>
              <UiText size="1" color="gray">
                {clientFinancialSummary.facturasPendientes}{' '}
                {clientFinancialSummary.facturasPendientes === 1 
                  ? (isSupplier ? 'factura por pagar' : 'factura pendiente') 
                  : (isSupplier ? 'facturas por pagar' : 'facturas pendientes')
                }
              </UiText>
            </UiBox>

            {/* Overview Col 4: Cupo Disponible or Terms */}
            <UiBox className="p-3 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-a5)]">
              <UiText size="1" color="gray" weight="bold">
                {isSupplier ? 'PLAZO CONCEDIDO' : 'CUPO DISPONIBLE'}
              </UiText>
              {isSupplier ? (
                <>
                  <UiText size="3" weight="bold" color="purple" className="mt-1">
                    {formData.paymentDays || 30} días
                  </UiText>
                  <UiText size="1" color="gray">
                    {formData.hasCredit ? 'Crédito comercial autorizado' : 'Modalidad contado'}
                  </UiText>
                </>
              ) : (
                <>
                  <UiText size="3" weight="bold" color="blue" className="mt-1">
                    ${clientFinancialSummary.cupoDisponible.toFixed(2)}
                  </UiText>
                  <UiText size="1" color="gray">
                    De un total de ${Number(formData.creditLimit).toFixed(2)}
                  </UiText>
                </>
              )}
            </UiBox>
          </UiBox>
        </UiCard>
      )}

      {/* Tabs Navigation */}
      <UiBox className="flex items-center gap-2 border-b border-[var(--gray-a6)] pb-2 overflow-x-auto">
        <UiButton
          type="button"
          onClick={() => setActiveTab('general')}
          variant={activeTab === 'general' ? 'solid' : 'ghost'}
          color={activeTab === 'general' ? 'blue' : 'gray'}
          size="2"
          className="cursor-pointer"
        >
          <Building size={15} /> 1. Datos Fiscales y Generales
        </UiButton>
        <UiButton
          type="button"
          onClick={() => setActiveTab('contacto')}
          variant={activeTab === 'contacto' ? 'solid' : 'ghost'}
          color={activeTab === 'contacto' ? 'blue' : 'gray'}
          size="2"
          className="cursor-pointer"
        >
          <MapPin size={15} /> 2. Contacto y Ubicación
        </UiButton>
        <UiButton
          type="button"
          onClick={() => setActiveTab('credito')}
          variant={activeTab === 'credito' ? 'solid' : 'ghost'}
          color={activeTab === 'credito' ? 'blue' : 'gray'}
          size="2"
          className="cursor-pointer"
        >
          {isSupplier ? <Clock size={15} /> : <CreditCard size={15} />}
          {isSupplier ? '3. Condiciones Comerciales y Plazos' : '3. Línea de Crédito y Cobranza'}
          {formData.hasCredit && ' ★'}
        </UiButton>
        {isEditing && (
          <UiButton
            type="button"
            onClick={() => setActiveTab('historial')}
            variant={activeTab === 'historial' ? 'solid' : 'ghost'}
            color={activeTab === 'historial' ? 'blue' : 'gray'}
            size="2"
            className="cursor-pointer"
          >
            <FileText size={15} /> 4. Historial de Comprobantes ({relatedTransactions.length})
          </UiButton>
        )}
      </UiBox>

      {/* Tab 1: General & Fiscal */}
      {activeTab === 'general' && (
        <UiCard 
          style={{ 
            backgroundColor: "var(--color-panel-solid)", 
            borderRadius: "var(--radius-4)", 
            border: "1px solid var(--gray-a6)" 
          }} 
          className="p-6 space-y-5"
        >
          <UiBox className="flex items-center justify-between">
            <UiBox>
              <UiHeading as="h3" size="3" weight="bold" color="gray" highContrast>
                Identificación Tributaria
              </UiHeading>
              <UiText size="1" color="gray">
                Datos oficiales para la emisión y recepción de comprobantes electrónicos válidos ante el SRI
              </UiText>
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Tipo de Identificación *
              </UiLabel>
              <UiSelect
                value={formData.tipoIdentificacion}
                onChange={e => handleTipoIdentificacionChange(e.target.value)}
                size="2"
                className="w-full cursor-pointer"
              >
                <option value="ruc">RUC (Registro Único de Contribuyentes)</option>
                <option value="cedula">Cédula de Identidad</option>
                <option value="pasaporte">Pasaporte / Identificación Exterior</option>
                {!isSupplier && <option value="consumidor_final">Consumidor Final</option>}
              </UiSelect>
            </UiBox>

            <UiBox className="space-y-1.5 sm:col-span-2">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Número de RUC / Cédula *
              </UiLabel>
              <UiBox className="flex gap-2">
                <UiInput
                  type="text"
                  required
                  value={formData.ruc}
                  onChange={e => setFormData(p => ({ ...p, ruc: e.target.value }))}
                  placeholder={isSupplier ? "Ej: 1790011234001" : "Ej: 1790011234001 o 1712345678"}
                  size="2"
                  className="w-full font-mono"
                  disabled={formData.tipoIdentificacion === 'consumidor_final'}
                />
                <UiButton
                  type="button"
                  disabled={isQueryingSri || formData.tipoIdentificacion === 'consumidor_final'}
                  onClick={querySRI}
                  variant="solid"
                  color="blue"
                  size="2"
                  className="shrink-0 cursor-pointer font-medium"
                >
                  <Sparkles size={15} />
                  {isQueryingSri ? 'Consultando...' : 'Autocompletar SRI'}
                </UiButton>
              </UiBox>
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Razón Social / Nombre Completo *
              </UiLabel>
              <UiInput
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: DISTRIBUIDORA INDUSTRIAL S.A. o CARLOS MENDOZA"
                size="2"
                className="w-full"
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Nombre Comercial / Fantasía
              </UiLabel>
              <UiInput
                type="text"
                value={formData.tradeName}
                onChange={e => setFormData(p => ({ ...p, tradeName: e.target.value }))}
                placeholder="Ej: Superbodega o Distribuidora El Centro"
                size="2"
                className="w-full"
              />
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Régimen Fiscal / Tipo de Contribuyente
              </UiLabel>
              <UiSelect
                value={formData.tipoContribuyente}
                onChange={e => setFormData(p => ({ ...p, tipoContribuyente: e.target.value }))}
                size="2"
                className="w-full cursor-pointer"
              >
                <option value="general">Régimen General</option>
                <option value="rimpe_emprendedor">RIMPE - Emprendedor</option>
                <option value="rimpe_popular">RIMPE - Negocio Popular</option>
                <option value="especial">Contribuyente Especial</option>
                <option value="exportador">Exportador Habitual</option>
              </UiSelect>
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Rol en el ERP
              </UiLabel>
              <UiSelect
                value={formData.type}
                onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                size="2"
                className="w-full cursor-pointer"
              >
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
                <option value="ambos">Cliente y Proveedor (Ambos)</option>
              </UiSelect>
            </UiBox>
          </UiBox>

          {/* Fiscal Checkboxes */}
          <UiBox className="p-3.5 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-a5)] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.obligadoContabilidad}
                onChange={e => setFormData(p => ({ ...p, obligadoContabilidad: e.target.checked }))}
                className="rounded border-[var(--gray-a6)] text-[var(--blue-9)] focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <UiBox>
                <UiText size="1" weight="bold" color="gray" highContrast>
                  Obligado a Llevar Contabilidad
                </UiText>
                <UiText size="1" color="gray" className="block text-xs">
                  Requerido para determinar porcentajes de retención en comprobantes
                </UiText>
              </UiBox>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agenteRetencion}
                onChange={e => setFormData(p => ({ ...p, agenteRetencion: e.target.checked }))}
                className="rounded border-[var(--gray-a6)] text-[var(--blue-9)] focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <UiBox>
                <UiText size="1" weight="bold" color="gray" highContrast>
                  Designado como Agente de Retención SRI
                </UiText>
                <UiText size="1" color="gray" className="block text-xs">
                  Aplica resolución especial para retenciones tributarias
                </UiText>
              </UiBox>
            </label>
          </UiBox>
        </UiCard>
      )}

      {/* Tab 2: Contact & Location */}
      {activeTab === 'contacto' && (
        <UiCard 
          style={{ 
            backgroundColor: "var(--color-panel-solid)", 
            borderRadius: "var(--radius-4)", 
            border: "1px solid var(--gray-a6)" 
          }} 
          className="p-6 space-y-5"
        >
          <UiBox>
            <UiHeading as="h3" size="3" weight="bold" color="gray" highContrast>
              Canales de Comunicación y Ubicación
            </UiHeading>
            <UiText size="1" color="gray">
              Dirección y correos electrónicos para envío de comprobantes electrónicos (RIDE/XML)
            </UiText>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Correo Electrónico Principal (Facturación)
              </UiLabel>
              <UiInput
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="facturacion@empresa.com"
                size="2"
                className="w-full"
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel size="1" color="gray">
                Correo Secundario / {isSupplier ? 'Pagos y Compras' : 'Cobranzas'}
              </UiLabel>
              <UiInput
                type="email"
                value={formData.secondaryEmail}
                onChange={e => setFormData(p => ({ ...p, secondaryEmail: e.target.value }))}
                placeholder={isSupplier ? "pagos@proveedor.com" : "cobranzas@empresa.com"}
                size="2"
                className="w-full"
              />
            </UiBox>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast>
                Teléfono Celular (WhatsApp)
              </UiLabel>
              <UiInput
                type="tel"
                value={formData.celular}
                onChange={e => setFormData(p => ({ ...p, celular: e.target.value }))}
                placeholder="0991234567"
                size="2"
                className="w-full"
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel size="1" color="gray">
                Teléfono Convencional / Fijo
              </UiLabel>
              <UiInput
                type="tel"
                value={formData.telefono}
                onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                placeholder="022123456"
                size="2"
                className="w-full"
              />
            </UiBox>
          </UiBox>

          <UiBox className="space-y-1.5">
            <UiLabel size="1" weight="bold" color="gray" highContrast>
              Dirección Principal / Domicilio Fiscal *
            </UiLabel>
            <UiInput
              type="text"
              value={formData.direccion}
              onChange={e => setFormData(p => ({ ...p, direccion: e.target.value }))}
              placeholder="Av. Principal N12-34 y Calle Secundaria"
              size="2"
              className="w-full"
            />
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UiBox className="space-y-1.5">
              <UiLabel size="1" color="gray">Ciudad / Cantón</UiLabel>
              <UiInput
                type="text"
                value={formData.ciudad}
                onChange={e => setFormData(p => ({ ...p, ciudad: e.target.value }))}
                placeholder="Ej: Quito"
                size="2"
                className="w-full"
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel size="1" color="gray">Provincia</UiLabel>
              <UiInput
                type="text"
                value={formData.provincia}
                onChange={e => setFormData(p => ({ ...p, provincia: e.target.value }))}
                placeholder="Ej: Pichincha"
                size="2"
                className="w-full"
              />
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel size="1" color="gray">Referencia de Ubicación</UiLabel>
              <UiInput
                type="text"
                value={formData.referencia}
                onChange={e => setFormData(p => ({ ...p, referencia: e.target.value }))}
                placeholder="Frente al parque comercial..."
                size="2"
                className="w-full"
              />
            </UiBox>
          </UiBox>
        </UiCard>
      )}

      {/* Tab 3: Credit Line & Terms */}
      {activeTab === 'credito' && (
        <UiCard 
          style={{ 
            backgroundColor: "var(--color-panel-solid)", 
            borderRadius: "var(--radius-4)", 
            border: "1px solid var(--gray-a6)" 
          }} 
          className="p-6 space-y-6"
        >
          {/* Credit Activation Switch Banner */}
          <UiBox
            style={{
              borderRadius: "var(--radius-3)",
              backgroundColor: formData.hasCredit ? "var(--green-2)" : "var(--gray-2)",
              border: formData.hasCredit ? "1px solid var(--green-6)" : "1px solid var(--gray-a6)"
            }}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <UiBox className="flex items-center gap-3">
              <UiBox
                style={{
                  borderRadius: "var(--radius-3)",
                  backgroundColor: formData.hasCredit ? "var(--green-9)" : "var(--gray-8)",
                  color: "white"
                }}
                className="w-10 h-10 flex items-center justify-center shrink-0"
              >
                {isSupplier ? <Clock size={20} /> : <ShieldCheck size={20} />}
              </UiBox>
              <UiBox>
                <UiHeading as="h4" size="3" weight="bold" color="gray" highContrast>
                  {isSupplier ? 'Condiciones de Pago Otorgadas por el Proveedor' : 'Línea de Crédito para este Cliente'}
                </UiHeading>
                <UiText size="1" color="gray">
                  {isSupplier ? (
                    formData.hasCredit 
                      ? 'Proveedor con CRÉDITO COMERCIAL habilitado. Concede compras a plazo para registrar en Cuentas por Pagar (CxP).'
                      : 'Proveedor bajo modalidad PAGO DE CONTADO. Las compras deberán liquidarse contra entrega o pago inmediato.'
                  ) : (
                    formData.hasCredit 
                      ? 'Línea de crédito HABILITADA. El cliente puede realizar compras a crédito en Ventas y POS con cupo controlado.'
                      : 'Línea de crédito DESHABILITADA. El cliente solo podrá operar bajo pagos de contado (efectivo, transferencia o tarjeta).'
                  )}
                </UiText>
              </UiBox>
            </UiBox>

            {/* Switch Toggle Button */}
            <UiButton
              type="button"
              onClick={() => setFormData(p => ({ ...p, hasCredit: !p.hasCredit }))}
              variant={formData.hasCredit ? "solid" : "outline"}
              color={formData.hasCredit ? "green" : "gray"}
              size="2"
              className="cursor-pointer font-bold shrink-0"
            >
              {formData.hasCredit ? (
                <>
                  <Check size={16} /> {isSupplier ? 'Crédito Habilitado' : 'Crédito Habilitado'}
                </>
              ) : (
                <>
                  <X size={16} /> {isSupplier ? 'Habilitar Crédito' : 'Activar Crédito'}
                </>
              )}
            </UiButton>
          </UiBox>

          {formData.hasCredit ? (
            <UiBox className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Plazo */}
                <UiBox className="space-y-1.5">
                  <UiLabel size="1" weight="bold" color="gray" highContrast>
                    {isSupplier ? 'Plazo Concedido para Pagar *' : 'Plazo de Pago Autorizado *'}
                  </UiLabel>
                  <UiSelect
                    value={formData.paymentDays}
                    onChange={e => setFormData(p => ({ ...p, paymentDays: Number(e.target.value) }))}
                    size="2"
                    className="w-full cursor-pointer"
                  >
                    <option value={7}>7 días (Semanal)</option>
                    <option value={15}>15 días (Quincenal)</option>
                    <option value={30}>30 días (Mensual estándar)</option>
                    <option value={45}>45 días</option>
                    <option value={60}>60 días (Bimestral)</option>
                    <option value={90}>90 días (Trimestral)</option>
                  </UiSelect>
                </UiBox>

                {/* Cupo */}
                <UiBox className="space-y-1.5">
                  <UiLabel size="1" weight="bold" color="gray" highContrast>
                    {isSupplier ? 'Cupo de Crédito Concedido ($)' : 'Cupo Máximo Autorizado ($) *'}
                  </UiLabel>
                  <UiBox className="relative">
                    <UiText size="2" weight="bold" color="gray" highContrast className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
                      $
                    </UiText>
                    <UiInput
                      type="number"
                      step="0.01"
                      min="0"
                      required={!isSupplier}
                      value={formData.creditLimit}
                      onChange={e => setFormData(p => ({ ...p, creditLimit: e.target.value }))}
                      style={{ paddingLeft: '28px' }}
                      size="2"
                      className="w-full font-bold"
                    />
                  </UiBox>
                </UiBox>

                {/* Estado */}
                <UiBox className="space-y-1.5">
                  <UiLabel size="1" weight="bold" color="gray" highContrast>
                    {isSupplier ? 'Estado Comercial del Proveedor' : 'Estado Crediticio'}
                  </UiLabel>
                  <UiSelect
                    value={formData.creditStatus}
                    onChange={e => setFormData(p => ({ ...p, creditStatus: e.target.value }))}
                    size="2"
                    className="w-full cursor-pointer"
                  >
                    <option value="activo">Activo (Aprobado)</option>
                    <option value="bloqueado">{isSupplier ? 'Suspendido' : 'Bloqueado (Mora)'}</option>
                    <option value="en_revision">En Revisión de Condiciones</option>
                  </UiSelect>
                </UiBox>
              </UiBox>

              {/* Contacto / Garante Card */}
              <UiBox
                style={{ 
                  borderRadius: "var(--radius-3)", 
                  backgroundColor: "var(--gray-2)", 
                  border: "1px solid var(--gray-a5)" 
                }}
                className="p-4 space-y-3"
              >
                <UiText size="1" weight="bold" color="gray" highContrast>
                  {isSupplier ? 'Contacto Comercial / Asesor de Ventas del Proveedor (Opcional)' : 'Datos del Garante / Fiador Solidario (Opcional)'}
                </UiText>
                <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UiBox className="space-y-1">
                    <UiLabel size="1" color="gray">
                      {isSupplier ? 'Nombre del Asesor / Ejecutivo de Cuenta' : 'Nombres Completos del Garante'}
                    </UiLabel>
                    <UiInput
                      type="text"
                      value={isSupplier ? formData.commercialContactName : formData.guarantorName}
                      onChange={e => setFormData(p => ({ 
                        ...p, 
                        [isSupplier ? 'commercialContactName' : 'guarantorName']: e.target.value 
                      }))}
                      placeholder={isSupplier ? "Ej: Carlos Andrade (Ventas)" : "Ej: Marcelo Morales"}
                      size="2"
                      className="w-full"
                    />
                  </UiBox>
                  <UiBox className="space-y-1">
                    <UiLabel size="1" color="gray">
                      {isSupplier ? 'Teléfono / WhatsApp del Asesor' : 'Teléfono del Garante'}
                    </UiLabel>
                    <UiInput
                      type="text"
                      value={isSupplier ? formData.commercialContactPhone : formData.guarantorPhone}
                      onChange={e => setFormData(p => ({ 
                        ...p, 
                        [isSupplier ? 'commercialContactPhone' : 'guarantorPhone']: e.target.value 
                      }))}
                      placeholder="Ej: 0987654321"
                      size="2"
                      className="w-full"
                    />
                  </UiBox>
                </UiBox>
              </UiBox>

              {/* Observaciones */}
              <UiBox className="space-y-1.5">
                <UiLabel size="1" weight="bold" color="gray" highContrast>
                  {isSupplier ? 'Acuerdos de Compra y Observaciones' : 'Políticas y Observaciones de Crédito'}
                </UiLabel>
                <UiTextarea
                  rows={3}
                  value={formData.creditObservations}
                  onChange={e => setFormData(p => ({ ...p, creditObservations: e.target.value }))}
                  placeholder={
                    isSupplier 
                      ? "Ej: Descuento comercial 3% por pago antes del día 15. Días de recepción de facturas: lunes a jueves..."
                      : "Ej: Aprobado con pagaré a la orden #104. Descuento comercial máximo 5%..."
                  }
                  size="2"
                  className="w-full"
                />
              </UiBox>
            </UiBox>
          ) : (
            <UiBox
              style={{ 
                borderRadius: "var(--radius-3)", 
                backgroundColor: "var(--gray-2)", 
                border: "1px dashed var(--gray-a6)" 
              }}
              className="p-8 text-center space-y-2"
            >
              {isSupplier ? <Clock size={32} className="mx-auto text-gray-400 opacity-60" /> : <CreditCard size={32} className="mx-auto text-gray-400 opacity-60" />}
              <UiHeading as="h4" size="2" weight="bold" color="gray" highContrast>
                {isSupplier ? 'Este proveedor opera bajo modalidad de Contado' : 'Este cliente no cuenta con crédito comercial'}
              </UiHeading>
              <UiText size="1" color="gray" className="max-w-md mx-auto block">
                {isSupplier 
                  ? 'Para habilitar compras a crédito con este proveedor y programar pagos en CxP, activa el botón superior y define los días de plazo acordados.'
                  : 'Para habilitar ventas con pago a plazo o abonos diferidos, activa el botón de crédito arriba y asigna un cupo en dólares.'
                }
              </UiText>
            </UiBox>
          )}
        </UiCard>
      )}

      {/* Tab 4: Transaction History */}
      {activeTab === 'historial' && (
        <UiCard 
          style={{ 
            backgroundColor: "var(--color-panel-solid)", 
            borderRadius: "var(--radius-4)", 
            border: "1px solid var(--gray-a6)" 
          }} 
          className="p-6 space-y-4"
        >
          <UiBox className="flex items-center justify-between">
            <UiBox>
              <UiHeading as="h3" size="3" weight="bold" color="gray" highContrast>
                {isSupplier ? 'Historial de Compras y Comprobantes Recibidos' : 'Historial de Ventas y Comprobantes Emitidos'}
              </UiHeading>
              <UiText size="1" color="gray">
                Registro cronológico de comprobantes vinculados a {formData.name || 'este contacto'}
              </UiText>
            </UiBox>
            <Badge variant="soft" color="blue" size="1">
              {relatedTransactions.length} {relatedTransactions.length === 1 ? 'Comprobante' : 'Comprobantes'}
            </Badge>
          </UiBox>

          {relatedTransactions.length > 0 ? (
            <UiBox className="overflow-x-auto custom-scrollbar border border-[var(--gray-a5)] rounded-lg">
              <UiTable className="w-full text-left whitespace-nowrap">
                <UiTableHeader style={{ backgroundColor: "var(--gray-2)", color: "var(--gray-12)" }}>
                  <UiTableRow>
                    <UiTableHead className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">Fecha</UiTableHead>
                    <UiTableHead className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">Tipo Documento</UiTableHead>
                    <UiTableHead className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">Comprobante</UiTableHead>
                    <UiTableHead className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">Método de Pago</UiTableHead>
                    <UiTableHead className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">Estado Pago</UiTableHead>
                    <UiTableHead className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">Estado SRI</UiTableHead>
                    <UiTableHead className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right">Total ($)</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  {relatedTransactions.map(tx => {
                    const docTypeLabel = (tx.documentType || (tx.type === 'ingreso' ? 'factura' : 'compra')).toUpperCase().replace('_', ' ');
                    const isPaid = tx.paymentStatus === 'pagado';
                    const isCredit = tx.paymentStatus === 'pendiente' || tx.paymentMethod === 'credito';
                    const isSriAuth = tx.sriStatus === 'autorizado';

                    return (
                      <UiTableRow key={tx.id} className="hover:bg-[var(--gray-a2)] transition-colors">
                        <UiTableCell className="px-4 py-3 font-mono text-xs">
                          {tx.date ? tx.date.substring(0, 10) : '-'}
                        </UiTableCell>
                        <UiTableCell className="px-4 py-3">
                          <Badge 
                            variant="soft" 
                            color={tx.type === 'ingreso' ? 'blue' : 'purple'} 
                            size="1"
                          >
                            {docTypeLabel}
                          </Badge>
                        </UiTableCell>
                        <UiTableCell className="px-4 py-3 font-mono text-xs">
                          {tx.documentNumber || tx.secuencial || tx.id}
                        </UiTableCell>
                        <UiTableCell className="px-4 py-3 text-xs capitalize">
                          {(tx.paymentMethod || 'transferencia').replace('_', ' ')}
                        </UiTableCell>
                        <UiTableCell className="px-4 py-3">
                          <Badge 
                            variant="soft" 
                            color={isPaid ? 'green' : isCredit ? 'amber' : 'gray'} 
                            size="1"
                          >
                            {isPaid ? 'Pagado' : isCredit ? 'Pendiente' : (tx.paymentStatus || 'Emitido')}
                          </Badge>
                        </UiTableCell>
                        <UiTableCell className="px-4 py-3">
                          <Badge 
                            variant="soft" 
                            color={isSriAuth ? 'green' : tx.sriStatus === 'error' ? 'red' : 'gray'} 
                            size="1"
                          >
                            {tx.sriStatus || 'No aplica'}
                          </Badge>
                        </UiTableCell>
                        <UiTableCell className="px-4 py-3 text-right font-bold font-mono text-sm text-[var(--gray-12)]">
                          ${Number(tx.total || 0).toFixed(2)}
                        </UiTableCell>
                      </UiTableRow>
                    );
                  })}
                </UiTableBody>
              </UiTable>
            </UiBox>
          ) : (
            <UiBox 
              style={{ 
                borderRadius: "var(--radius-3)", 
                backgroundColor: "var(--gray-2)", 
                border: "1px dashed var(--gray-a6)" 
              }} 
              className="p-8 text-center space-y-2"
            >
              <FileText size={32} className="mx-auto text-gray-400 opacity-60" />
              <UiHeading as="h4" size="2" weight="bold" color="gray" highContrast>
                No se registran comprobantes para este {isSupplier ? 'proveedor' : 'cliente'}
              </UiHeading>
              <UiText size="1" color="gray" className="max-w-md mx-auto block">
                {isSupplier 
                  ? 'Las facturas de compra y retenciones registradas con este proveedor aparecerán aquí automáticamente.' 
                  : 'Las ventas, cotizaciones y facturas electrónicas emitidas a este cliente aparecerán aquí.'
                }
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
          variant="outline"
          color="gray"
          size="2"
          className="cursor-pointer"
        >
          Volver
        </UiButton>
        <UiButton
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          variant="solid"
          color="blue"
          size="2"
          className="font-medium cursor-pointer"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar Información'}
        </UiButton>
      </UiBox>
    </UiBox>
  );
}
