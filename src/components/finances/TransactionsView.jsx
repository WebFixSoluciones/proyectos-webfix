import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, AlertCircle, UploadCloud, Sparkles, AlertTriangle, Eye } from 'lucide-react';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { analizarComprobanteConGemini, parsearXMLComprobante } from '../../services/geminiService';
import RidePreviewModal from './RidePreviewModal';

export default function TransactionsView({ transactions, thirdParties, isDarkMode, showToast, db, storage, appId, onOpenForm, forcedDocType, forcedType }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(forcedType || 'all');
  const [filterDocType, setFilterDocType] = useState(forcedDocType || 'all'); // Filtro por Tipo de Comprobante SRI
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  useEffect(() => {
    if (forcedDocType) {
      setFilterDocType(forcedDocType);
    }
  }, [forcedDocType]);

  useEffect(() => {
    if (forcedType) {
      setFilterType(forcedType);
    }
  }, [forcedType]);
  
  // Estados de IA y Carga
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedRideTx, setSelectedRideTx] = useState(null);
  
  const fileInputRef = useRef(null);

  const filtered = transactions.filter(tx => {
    const matchesSearch = (tx.documentNumber || '').includes(searchTerm) || 
                          (thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    let matchesDocType = false;
    if (filterDocType === 'all') {
      matchesDocType = true;
    } else if (filterDocType === 'ventas_resumen') {
      matchesDocType = tx.type === 'ingreso' && (tx.documentType === 'factura' || tx.documentType === 'nota_venta');
    } else {
      matchesDocType = tx.documentType === filterDocType;
    }
    
    let matchesMonth = true;
    let matchesYear = true;
    if (tx.date) {
      const d = new Date(tx.date);
      if (filterMonth !== 'all') matchesMonth = d.getMonth().toString() === filterMonth;
      if (filterYear !== 'all') matchesYear = d.getFullYear().toString() === filterYear;
    }

    return matchesSearch && matchesType && matchesDocType && matchesMonth && matchesYear;
  });

  // Procesar archivo (PDF, Imagen o XML) para captura inteligente
  const handleFileCapture = async (file) => {
    if (!file) return;
    setIsAnalyzing(true);
    showToast(`Analizando '${file.name}'...`, 'info');

    try {
      let extracted = null;

      // 1. Si es XML, parseo local
      if (file.name.endsWith('.xml')) {
        const text = await file.text();
        const res = parsearXMLComprobante(text);
        if (res.success) {
          extracted = res.data;
        } else {
          throw new Error(res.error);
        }
      } else {
        // 2. Si es imagen o PDF, usar Gemini OCR
        extracted = await analizarComprobanteConGemini(file);
      }

      if (!extracted) {
        throw new Error("No se pudieron extraer datos del comprobante.");
      }

      // 3. Identificar o Crear Tercero (Cliente/Proveedor)
      let thirdPartyId = '';
      if (extracted.ruc) {
        const matchedTp = thirdParties.find(tp => tp.ruc === matchedRucFormat(extracted.ruc));
        if (matchedTp) {
          thirdPartyId = matchedTp.id;
          showToast(`Proveedor encontrado: ${matchedTp.name}`, 'success');
        } else {
          // Auto-crear tercero si no existe
          const newTpId = `tp_${new Date().getTime()}`;
          const newTp = {
            name: extracted.razonSocial || 'Nuevo Proveedor Extraído',
            ruc: matchedRucFormat(extracted.ruc),
            email: extracted.email || '',
            phone: extracted.phone || '',
            type: 'proveedor',
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', newTpId), newTp);
          thirdPartyId = newTpId;
          showToast(`Contacto creado automáticamente: ${newTp.name}`, 'success');
        }
      }

      // 4. Detectar duplicados
      const isDuplicate = transactions.some(tx => 
        tx.thirdPartyId === thirdPartyId && 
        tx.documentNumber === extracted.documentNumber && 
        extracted.documentNumber !== ""
      );

      if (isDuplicate) {
        showToast("Advertencia: Este número de comprobante ya está registrado.", "error");
      }

      // 5. Subir archivo a Storage
      let downloadURL = '';
      let storagePath = '';
      try {
        const extension = file.name.split('.').pop();
        const path = `artifacts/${appId}/finances/${new Date().getTime()}_capture.${extension}`;
        const storageRef = ref(storage, path);
        const uploadTask = await uploadBytesResumable(storageRef, file);
        downloadURL = await getDownloadURL(uploadTask.ref);
        storagePath = path;
      } catch (storageErr) {
        console.error(storageErr);
      }

      // 6. Enviar datos al formulario central
      const newTxData = {
        id: '',
        type: 'egreso',
        date: extracted.date || new Date().toISOString().split('T')[0],
        documentType: 'factura',
        documentNumber: extracted.documentNumber || '',
        thirdPartyId,
        category: extracted.category || 'otros',
        currency: 'USD',
        baseImponible: Number(extracted.baseImponible) || 0,
        ivaPorcentaje: extracted.ivaPorcentaje || 15,
        ivaValor: Number(extracted.ivaValor) || 0,
        retencionFuente: 0,
        retencionIva: 0,
        total: Number(extracted.total) || 0,
        paymentMethod: extracted.paymentMethod || 'transferencia',
        paymentStatus: 'pendiente',
        sriStatus: file.name.endsWith('.xml') ? 'autorizado' : 'pendiente',
        xmlUrl: file.name.endsWith('.xml') ? downloadURL : '',
        xmlPath: file.name.endsWith('.xml') ? storagePath : '',
        pdfUrl: file.name.endsWith('.pdf') ? downloadURL : '',
        pdfPath: file.name.endsWith('.pdf') ? storagePath : '',
        isAIDetected: true,
        isDuplicateWarning: isDuplicate
      };

      onOpenForm(newTxData);
      showToast("Datos leídos con éxito. Revisa el formulario.", "success");

    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al procesar el archivo con IA", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const matchedRucFormat = (rucStr) => {
    return String(rucStr).trim();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileCapture(file);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta transacción permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', id));
        showToast('Transacción eliminada', 'success');
      } catch(e) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  const getStatusBadge = (status, documentType) => {
    const baseClass = "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border";
    switch(status) {
      case 'autorizado': 
        if (documentType === 'nota_venta') {
          return isDarkMode 
            ? <span className={`${baseClass} bg-emerald-500/20 text-emerald-400 border-emerald-500/20`}><CheckCircle2 size={10}/> Registrado</span>
            : <span className={`${baseClass} bg-emerald-100 text-emerald-800 border-emerald-300`}><CheckCircle2 size={10}/> Registrado</span>;
        }
        return isDarkMode 
          ? <span className={`${baseClass} bg-emerald-500/20 text-emerald-400 border-emerald-500/20`}><CheckCircle2 size={10}/> Autorizado</span>
          : <span className={`${baseClass} bg-emerald-100 text-emerald-800 border-emerald-300`}><CheckCircle2 size={10}/> Autorizado</span>;
      case 'pendiente': 
        return isDarkMode 
          ? <span className={`${baseClass} bg-yellow-500/20 text-yellow-400 border-yellow-500/20`}><AlertCircle size={10}/> Pendiente</span>
          : <span className={`${baseClass} bg-yellow-100 text-yellow-800 border-yellow-300`}><AlertCircle size={10}/> Pendiente</span>;
      case 'anulado': 
        return isDarkMode 
          ? <span className={`${baseClass} bg-red-500/20 text-red-400 border-red-500/20`}>Anulado</span>
          : <span className={`${baseClass} bg-red-100 text-red-800 border-red-300`}>Anulado</span>;
      case 'rechazado': 
        return isDarkMode 
          ? <span className={`${baseClass} bg-red-500/20 text-red-400 border-red-500/20`}><AlertTriangle size={10}/> Rechazado</span>
          : <span className={`${baseClass} bg-red-100 text-red-800 border-red-300`}><AlertTriangle size={10}/> Rechazado</span>;
      default: 
        return isDarkMode 
          ? <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-550/20 text-gray-400 border border-white/5 font-bold uppercase">{status || 'Borrador'}</span>
          : <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-150 text-gray-700 border border-gray-300 font-bold uppercase">{status || 'Borrador'}</span>;
    }
  };

  const docTypeTabs = [
    { id: 'all', label: 'Todos' },
    { id: 'factura', label: 'Facturas' },
    { id: 'retencion', label: 'Retenciones' },
    { id: 'nota_credito', label: 'N. Crédito' },
    { id: 'nota_debito', label: 'N. Débito' },
    { id: 'guia_remision', label: 'Guías' },
    { id: 'liquidacion', label: 'Liquidaciones' }
  ];

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      {/* DRAG AND DROP ZONE */}
      {(!forcedType || forcedType !== 'ingreso') && (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
            isDragging 
              ? 'border-purple-500 bg-purple-500/5 shadow-2xl scale-[1.01]' 
              : (isDarkMode ? 'border-white/10 hover:border-white/20 bg-white/[0.01]' : 'border-gray-355 hover:border-gray-400 bg-white')
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileCapture(e.target.files[0])} 
            accept=".pdf,.png,.jpg,.jpeg,.xml" 
            className="hidden" 
          />
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="text-xs font-semibold text-purple-400 animate-pulse">Gemini IA está extrayendo información del comprobante...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-800'}`}>
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Captura Inteligente IA / Carga XML</p>
                <p className={`text-[10px] mt-1 max-w-md leading-normal ${isDarkMode ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                  Arrastra tu factura (PDF, XML, Imagen) aquí. Gemini la clasificará y auto-completará los campos del formulario de forma instantánea.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABS DE TIPO DE DOCUMENTO SRI */}
      {!forcedDocType && (
        <div className={`flex p-1 gap-1 rounded-2xl border overflow-x-auto custom-scrollbar whitespace-nowrap ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-gray-100/70 border-gray-200 shadow-inner'}`}>
          {docTypeTabs.map(tab => {
            const isActive = filterDocType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterDocType(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? isDarkMode ? 'bg-white/15 text-white shadow-sm' : 'bg-white text-gray-900 border border-gray-300/40 shadow-sm'
                    : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* FILTROS Y BUSQUEDA */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div>
          <button 
            onClick={() => {
              if (forcedDocType) {
                const defaultDocType = forcedDocType === 'ventas_resumen' ? 'factura' : forcedDocType;
                const defaultType = forcedType || (forcedDocType === 'liquidacion' || forcedDocType === 'retencion' ? 'egreso' : 'ingreso');
                onOpenForm({
                  id: '',
                  type: defaultType,
                  documentType: defaultDocType,
                  date: new Date().toISOString().split('T')[0],
                  currency: 'USD',
                  baseImponible: 0,
                  ivaPorcentaje: 15,
                  ivaValor: 0,
                  retencionFuente: 0,
                  retencionIva: 0,
                  total: 0,
                  paymentMethod: 'transferencia',
                  paymentStatus: 'pendiente',
                  sriStatus: 'pendiente',
                  items: []
                });
              } else {
                onOpenForm(null);
              }
            }}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-xs font-bold transition-all hover-lift shadow-md ${
              isDarkMode 
                ? 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-primary/20 border border-primary/30' 
                : 'bg-primary text-white hover:bg-primary-hover shadow-primary/10'
            }`}
          >
            <Plus size={15} /> Registrar {
              forcedDocType 
                ? (forcedDocType === 'ventas_resumen' 
                    ? 'Venta' 
                    : (docTypeTabs.find(t => t.id === forcedDocType)?.label || forcedDocType)) 
                : 'Comprobante'
            }
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] border w-full sm:w-64 transition-all focus-within:ring-1 focus-within:ring-primary/25 ${
            isDarkMode 
              ? 'bg-[#151722]/80 border-white/10 focus-within:border-primary/50' 
              : 'bg-white border-slate-200 focus-within:border-primary'
          }`}>
            <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
            <input 
              type="text" 
              placeholder="Buscar documento o tercero..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-current placeholder-gray-500 focus:ring-0"
            />
          </div>

          {!forcedType && (
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)} 
              className={`px-3 py-2 rounded-[10px] border text-xs font-medium outline-none transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#151722]/80 border-white/10 text-gray-300 focus:border-primary/50' 
                  : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
              }`}
            >
              <option value="all" className="text-black">Todos los tipos</option>
              <option value="ingreso" className="text-black">Ingresos (Ventas)</option>
              <option value="egreso" className="text-black">Egresos (Compras)</option>
            </select>
          )}

          <select 
            value={filterMonth} 
            onChange={e => setFilterMonth(e.target.value)} 
            className={`px-3 py-2 rounded-[10px] border text-xs font-medium outline-none transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-[#151722]/80 border-white/10 text-gray-300 focus:border-primary/50' 
                : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
            }`}
          >
            <option value="all" className="text-black">Mes: Todos</option>
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
              <option key={i} value={i} className="text-black">{m}</option>
            ))}
          </select>

          <select 
            value={filterYear} 
            onChange={e => setFilterYear(e.target.value)} 
            className={`px-3 py-2 rounded-[10px] border text-xs font-medium outline-none transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-[#151722]/80 border-white/10 text-gray-300 focus:border-primary/50' 
                : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
            }`}
          >
            <option value="all" className="text-black">Año: Todos</option>
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} className="text-black">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA DE COMPROBANTES */}
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
                <th className="px-6 py-3.5">Tipo</th>
                <th className="px-6 py-3.5">Documento</th>
                <th className="px-6 py-3.5">Tercero</th>
                <th className="px-6 py-3.5">Total</th>
                <th className="px-6 py-3.5">Estado SRI</th>
                <th className="px-6 py-3.5">Archivos</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filtered.map(tx => (
                <tr key={tx.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                  <td className={`px-6 py-3.5 ${isDarkMode ? '' : 'text-black font-semibold'}`}>{tx.date}</td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-0.5 rounded-[10px] text-[9px] font-bold uppercase tracking-wider ${tx.type === 'ingreso' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-850 border border-emerald-300') : (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-850 border border-red-300')}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`px-6 py-3.5 font-mono text-[10px] ${isDarkMode ? '' : 'text-black font-semibold'}`}>{tx.documentNumber || '-'}</td>
                  <td className={`px-6 py-3.5 font-bold truncate max-w-[200px] ${isDarkMode ? '' : 'text-black'}`} title={thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name}>
                    {thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || 'Desconocido'}
                  </td>
                  <td className={`px-6 py-3.5 font-extrabold ${isDarkMode ? '' : 'text-black font-black'}`}>${Number(tx.total || 0).toFixed(2)}</td>
                  <td className="px-6 py-3.5">{getStatusBadge(tx.sriStatus, tx.documentType)}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex gap-1.5">
                      {tx.xmlUrl ? <a href={tx.xmlUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-[10px] bg-primary/20 text-primary hover:bg-primary/40" title="Ver XML"><FileText size={12}/></a> : <span className="p-1.5 rounded-[10px] bg-gray-500/10 text-gray-400 border border-gray-250 opacity-60"><FileText size={12}/></span>}
                      {tx.pdfUrl ? <a href={tx.pdfUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-[10px] bg-red-500/20 text-red-500 hover:bg-red-500/40" title="Ver PDF"><FileText size={12}/></a> : <span className="p-1.5 rounded-[10px] bg-gray-500/10 text-gray-400 border border-gray-250 opacity-60"><FileText size={12}/></span>}
                      {tx.documentType && (
                        <button 
                          onClick={() => setSelectedRideTx(tx)}
                          className="p-1.5 rounded-[10px] bg-orange-500/20 text-orange-500 hover:bg-orange-500/40 border border-orange-500/10 transition-all"
                          title={tx.documentType === 'nota_venta' ? "Ver Recibo / Imprimir" : "Ver RIDE Interactivo / Imprimir Factura"}
                        >
                          <Eye size={12}/>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => onOpenForm(tx)} className={`p-1.5 rounded-[10px] transition-colors ${isDarkMode ? 'hover:bg-primary/20 text-primary' : 'hover:bg-primary/10 text-primary border border-primary/25'}`}><Edit2 size={13}/></button>
                      <button onClick={() => handleDelete(tx.id)} className={`p-1.5 rounded-[10px] transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-650 border border-gray-300'}`}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">No se encontraron comprobantes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRideTx && (
        <RidePreviewModal 
          tx={selectedRideTx} 
          onClose={() => setSelectedRideTx(null)} 
          thirdParties={thirdParties} 
          isDarkMode={isDarkMode} 
          db={db} 
          appId={appId} 
        />
      )}
    </div>
  );
}
