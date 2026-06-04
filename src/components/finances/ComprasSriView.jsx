import React, { useState } from 'react';
import { Download, CheckCircle2, AlertTriangle, FileText, RefreshCw, ShoppingBag, Eye } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';

export default function ComprasSriView({ transactions = [], isDarkMode, showToast, db, appId }) {
  const [sriBills, setSriBills] = useState([]);
  const [loading, setLoading] = useState(false);

  // Simular descarga de facturas electrónicas desde el SRI
  const handleFetchSriBills = () => {
    setLoading(true);
    setTimeout(() => {
      const mockBills = [
        {
          id: 'sri_bill_1',
          ruc: '1760001040001',
          razonSocial: 'CORPORACION NACIONAL DE TELECOMUNICACIONES CNT EP',
          documentNumber: '001-777-089912233',
          date: new Date().toISOString().split('T')[0],
          baseImponible: 25.00,
          ivaValor: 3.75,
          total: 28.75,
          claveAcceso: '0306202601176000104000120017770899122331234567814',
          category: 'gastos_administrativos',
          description: 'Servicio de Internet y Telefonía CNT Mayo'
        },
        {
          id: 'sri_bill_2',
          ruc: '1790016919001',
          razonSocial: 'CORPORACION FAVORITA C.A. (SUPERMAXI)',
          documentNumber: '005-102-000456789',
          date: new Date().toISOString().split('T')[0],
          baseImponible: 120.50,
          ivaValor: 18.08,
          total: 138.58,
          claveAcceso: '0306202601179001691900120051020004567891234567812',
          category: 'gastos_administrativos',
          description: 'Suministros de Oficina y Cafetería'
        },
        {
          id: 'sri_bill_3',
          ruc: '1792286433001',
          razonSocial: 'EDRAN S.A. (NETLIFE)',
          documentNumber: '002-010-098765432',
          date: new Date().toISOString().split('T')[0],
          baseImponible: 44.00,
          ivaValor: 6.60,
          total: 50.60,
          claveAcceso: '0306202601179228643300120020100987654321234567819',
          category: 'gastos_administrativos',
          description: 'Servicio de Internet Fibra Óptica Netlife'
        }
      ];
      setSriBills(mockBills);
      setLoading(false);
      showToast("Facturas recibidas sincronizadas desde el SRI con éxito", "success");
    }, 1200);
  };

  // Importar factura en la contabilidad
  const handleImportBill = async (bill) => {
    // Verificar si ya está importada
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
      
      {/* HEADER ACCIONES */}
      <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${
        isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'
      }`}>
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider">Buzón de Comprobantes Electrónicos Recibidos (SRI)</h3>
          <p className="text-[10px] text-gray-500">Consulta las facturas autorizadas a favor de su RUC directamente desde los servidores del SRI para su validación e integración al ATS.</p>
        </div>
        <button
          onClick={handleFetchSriBills}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Consultando...' : 'Consultar Facturas SRI'}</span>
        </button>
      </div>

      {/* LISTADO DE COMPROBANTES */}
      <div className={`border rounded-3xl shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[9px] font-black uppercase tracking-wider ${
                isDarkMode ? 'bg-black/10 border-white/5 text-gray-400' : 'bg-primary-light border-primary/15 text-[#000000]'
              }`}>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Comprobante</th>
                <th className="py-3.5 px-4">Emisor (Proveedor)</th>
                <th className="py-3.5 px-4 text-right">Subtotal</th>
                <th className="py-3.5 px-4 text-right">IVA (15%)</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Estado Contable</th>
                <th className="py-3.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5 text-xs">
              {sriBills.map(bill => {
                const isImported = transactions.some(t => t.documentNumber === bill.documentNumber);
                return (
                  <tr key={bill.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 text-gray-400 font-medium">{bill.date}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">{bill.documentNumber}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-black dark:text-white line-clamp-1">{bill.razonSocial}</p>
                        <p className="text-[9px] text-gray-500 font-mono">RUC: {bill.ruc}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">${bill.baseImponible.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-mono">${bill.ivaValor.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-red-500">${bill.total.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isImported 
                          ? 'bg-emerald-500/10 text-emerald-450' 
                          : 'bg-amber-500/10 text-amber-450'
                      }`}>
                        {isImported ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        {isImported ? 'Importado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleImportBill(bill)}
                        disabled={isImported}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 mx-auto ${
                          isImported 
                            ? 'bg-gray-550/10 text-gray-550 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
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
                  <td colSpan="8" className="py-12 text-center text-gray-500 italic">
                    Haga clic en "Consultar Facturas SRI" para recuperar los últimos comprobantes electrónicos recibidos.
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
