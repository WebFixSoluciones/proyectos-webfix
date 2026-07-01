import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertTriangle, FileText, RefreshCw, ShoppingBag, Eye, ShieldAlert } from 'lucide-react';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { getEcuadorDateString } from '../../services/sriService';

export default function ComprasSriView({ transactions = [], isDarkMode, showToast, db, appId }) {
  const [sriBills, setSriBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyRuc, setCompanyRuc] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Cargar configuración de la empresa y facturas del SRI guardadas al montar
  useEffect(() => {
    if (!db || !appId) return;
    async function init() {
      try {
        // 1. Cargar RUC y Nombre de la Empresa
        const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const snap = await getDoc(configRef);
        let currentRuc = '';
        if (snap.exists()) {
          const configData = snap.data();
          currentRuc = configData.ruc || '';
          setCompanyRuc(currentRuc);
          setCompanyName(configData.razonSocial || configData.nombreComercial || '');
        }

        // 2. Cargar facturas de compra del SRI previamente sincronizadas
        const sriColRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras');
        const sriSnap = await getDocs(sriColRef);
        const list = [];
        sriSnap.forEach(docSnap => {
          const data = docSnap.data();
          // Solo mostrar facturas dirigidas a este RUC de empresa
          if (currentRuc && data.receiverRuc === currentRuc) {
            list.push(data);
          }
        });
        
        // Ordenar por fecha de forma descendente
        list.sort((a, b) => b.date.localeCompare(a.date));
        setSriBills(list);
      } catch (err) {
        console.error("Error al inicializar buzón SRI de compras:", err);
      }
    }
    init();
  }, [db, appId]);

  // Simular descarga y sincronización de facturas desde el SRI
  const handleFetchSriBills = () => {
    if (!companyRuc) {
      showToast("No se ha configurado el RUC de la empresa en Ajustes", "error");
      return;
    }

    setLoading(true);
    showToast("Conectando con el Servicio de Rentas Internas (SRI)...", "info");

    setTimeout(async () => {
      try {
        // Generar facturas de compra mock dirigidas al RUC actual de la empresa
        const mockBills = [
          {
            id: `sri_bill_${companyRuc}_1`,
            ruc: '1760001040001',
            razonSocial: 'CORPORACION NACIONAL DE TELECOMUNICACIONES CNT EP',
            documentNumber: '001-777-089912233',
            date: getEcuadorDateString(),
            baseImponible: 25.00,
            ivaValor: 3.75,
            total: 28.75,
            claveAcceso: `0306202601176000104000120017770899122331234567814`,
            category: 'gastos_administrativos',
            description: 'Servicio de Internet y Telefonía CNT Mayo',
            receiverRuc: companyRuc
          },
          {
            id: `sri_bill_${companyRuc}_2`,
            ruc: '1790016919001',
            razonSocial: 'CORPORACION FAVORITA C.A. (SUPERMAXI)',
            documentNumber: '005-102-000456789',
            date: getEcuadorDateString(),
            baseImponible: 120.50,
            ivaValor: 18.08,
            total: 138.58,
            claveAcceso: `0306202601179001691900120051020004567891234567812`,
            category: 'gastos_administrativos',
            description: 'Suministros de Oficina y Cafetería',
            receiverRuc: companyRuc
          },
          {
            id: `sri_bill_${companyRuc}_3`,
            ruc: '1792286433001',
            razonSocial: 'EDRAN S.A. (NETLIFE)',
            documentNumber: '002-010-098765432',
            date: getEcuadorDateString(),
            baseImponible: 44.00,
            ivaValor: 6.60,
            total: 50.60,
            claveAcceso: `0306202601179228643300120020100987654321234567819`,
            category: 'gastos_administrativos',
            description: 'Servicio de Internet Fibra Óptica Netlife',
            receiverRuc: companyRuc
          }
        ];

        // Guardar cada factura en la colección de Firestore para mantener la sincronización persistente
        for (const bill of mockBills) {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras', bill.id);
          await setDoc(docRef, bill);
        }

        setSriBills(mockBills);
        showToast(`Sincronizadas con éxito 3 facturas emitidas a su RUC (${companyRuc})`, "success");
      } catch (err) {
        console.error(err);
        showToast("Error al guardar comprobantes en la base de datos", "error");
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  // Importar factura electrónica recibida en la contabilidad general
  const handleImportBill = async (bill) => {
    // Verificar si ya está importada por número de documento
    const exists = transactions.some(t => t.documentNumber === bill.documentNumber);
    if (exists) {
      showToast("Esta factura ya ha sido importada a la contabilidad", "warning");
      return;
    }

    try {
      const txId = `tx_${new Date().getTime()}_${bill.id}`;
      const payload = {
        id: txId,
        type: 'egreso',
        documentType: 'factura',
        date: bill.date,
        documentNumber: bill.documentNumber,
        thirdPartyId: '', // Proveedor externo
        category: bill.category,
        description: `${bill.description} (Importado SRI)`,
        currency: 'USD',
        baseImponible: bill.baseImponible,
        ivaPorcentaje: 15,
        ivaValor: bill.ivaValor,
        total: bill.total,
        paymentMethod: 'transferencia',
        paymentStatus: 'pagado',
        sriStatus: 'autorizado',
        claveAcceso: bill.claveAcceso,
        paymentsBreakdown: {
          efectivo: 0,
          transferencia: bill.total,
          tarjeta: 0,
          cruce_cuentas: 0
        },
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId), payload);
      showToast(`Factura ${bill.documentNumber} importada exitosamente`, "success");
    } catch (err) {
      console.error(err);
      showToast("Error al importar la factura", "error");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ALERTA DE CONFIGURACIÓN REQUERIDA */}
      {!companyRuc && (
        <div className="p-4.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-500 dark:text-amber-400 text-xs flex items-center gap-3 animate-pulse">
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <p className="font-extrabold uppercase tracking-wide">Falta Configuración de Empresa</p>
            <p className="mt-0.5 opacity-90">Por favor ingrese y guarde el RUC de su empresa en Ajustes (Perfil de Empresa) para poder descargar y sincronizar sus comprobantes de compras electrónicas desde el SRI.</p>
          </div>
        </div>
      )}

      {/* HEADER ACCIONES */}
      <div className={`p-6 rounded-3xl border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm ${
        isDarkMode ? 'bg-[#151517] border-white/5 text-gray-300' : 'bg-white border-gray-250 text-gray-700'
      }`}>
        <div className="space-y-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <ShoppingBag size={14} /> Buzón de Comprobantes Electrónicos Recibidos (SRI)
          </h3>
          <p className="text-[10px] text-gray-500 leading-normal max-w-xl">
            Descargue y concilie las facturas electrónicas emitidas por sus proveedores directamente desde el SRI.
            {companyRuc && (
              <span className="font-bold block text-primary mt-1">
                Empresa configurada: {companyName || 'Persona Natural'} — RUC: {companyRuc}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleFetchSriBills}
          disabled={loading || !companyRuc}
          className={`btn-primary shrink-0 ${
            !companyRuc ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Sincronizando...' : 'Consultar Facturas SRI'}</span>
        </button>
      </div>

      {/* LISTADO DE COMPROBANTES */}
      <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
        isDarkMode 
          ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
          : 'border-slate-200/80 bg-white'
      }`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${
              isDarkMode 
                ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                : 'bg-slate-50 text-slate-600 border-b border-slate-100'
            }`}>
              <tr>
                <th className="px-6 py-3.5">Fecha</th>
                <th className="px-6 py-3.5">Comprobante</th>
                <th className="px-6 py-3.5">Emisor (Proveedor)</th>
                <th className="px-6 py-3.5 text-right">Subtotal</th>
                <th className="px-6 py-3.5 text-right">IVA (15%)</th>
                <th className="px-6 py-3.5 text-right">Total</th>
                <th className="px-6 py-3.5 text-center">Estado Contable</th>
                <th className="px-6 py-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {sriBills.map(bill => {
                const isImported = transactions.some(t => t.documentNumber === bill.documentNumber);
                return (
                  <tr key={bill.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                    <td className="px-6 py-3.5 text-gray-400 font-medium">{bill.date}</td>
                    <td className="px-6 py-3.5 font-mono text-[10px] font-bold">{bill.documentNumber}</td>
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-bold text-black dark:text-white line-clamp-1">{bill.razonSocial}</p>
                        <p className="text-[9px] text-gray-500 font-mono">RUC: {bill.ruc}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono">${bill.baseImponible.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono">${bill.ivaValor.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-red-500">${bill.total.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 badge-status-sm ${
                        isImported 
                          ? 'bg-emerald-500/10 text-emerald-450' 
                          : 'bg-amber-500/10 text-amber-450'
                      }`}>
                        {isImported ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        {isImported ? 'Importado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => handleImportBill(bill)}
                        disabled={isImported}
                        className={`h-[34px] px-3.5 rounded-[var(--radius-button)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-white border-none mx-auto ${
                          isImported 
                            ? 'bg-gray-500/20 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'bg-emerald-650 hover:bg-emerald-600'
                        }`}
                      >
                        <Download size={10} />
                        <span>Importar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {sriBills.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">
                    {companyRuc 
                      ? 'Haga clic en "Consultar Facturas SRI" para recuperar los comprobantes asociados a su RUC.' 
                      : 'Configure el RUC de su empresa para poder realizar consultas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
