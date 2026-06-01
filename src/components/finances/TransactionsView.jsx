import React, { useState, useRef } from 'react';
import { Plus, Search, Filter, Download, Trash2, Edit2, FileText, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import TransactionForm from './TransactionForm';

export default function TransactionsView({ transactions, thirdParties, isDarkMode, showToast, db, storage, appId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [isUploadingMassive, setIsUploadingMassive] = useState(false);
  const massiveInputRef = useRef(null);

  const filtered = transactions.filter(tx => {
    const matchesSearch = (tx.documentNumber || '').includes(searchTerm) || 
                          (thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    let matchesMonth = true;
    let matchesYear = true;
    if (tx.date) {
      const d = new Date(tx.date);
      if (filterMonth !== 'all') matchesMonth = d.getMonth().toString() === filterMonth;
      if (filterYear !== 'all') matchesYear = d.getFullYear().toString() === filterYear;
    }

    return matchesSearch && matchesType && matchesMonth && matchesYear;
  });

  const handleMassiveUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsUploadingMassive(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const text = await file.text();
        const rucMatch = text.match(/<ruc>([^<]+)<\/ruc>/);
        const rzMatch = text.match(/<razonSocial>([^<]+)<\/razonSocial>/);
        const numMatch = text.match(/<estab>([^<]+)<\/estab>.*?<ptoEmi>([^<]+)<\/ptoEmi>.*?<secuencial>([^<]+)<\/secuencial>/s);
        const baseMatch = text.match(/<baseImponible>([^<]+)<\/baseImponible>/);
        const dateMatch = text.match(/<fechaEmision>([^<]+)<\/fechaEmision>/);

        let thirdPartyId = '';
        if (rucMatch) {
          const tp = thirdParties.find(t => t.ruc === rucMatch[1]);
          if (tp) thirdPartyId = tp.id;
          else {
            const newTpId = `tp_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', newTpId), {
              name: rzMatch ? rzMatch[1] : 'Desconocido',
              ruc: rucMatch[1],
              type: 'proveedor'
            });
            thirdPartyId = newTpId;
          }
        }

        const path = `artifacts/${appId}/finances/${new Date().getTime()}_massive_${file.name}`;
        const storageRef = ref(storage, path);
        const uploadTask = await uploadBytesResumable(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        const docId = `tx_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), {
          type: 'egreso',
          date: dateMatch ? dateMatch[1].split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
          documentType: 'factura',
          documentNumber: numMatch ? `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}` : '',
          thirdPartyId,
          category: 'otros',
          currency: 'USD',
          baseImponible: baseMatch ? parseFloat(baseMatch[1]) : 0,
          ivaPorcentaje: 15,
          ivaValor: baseMatch ? parseFloat((parseFloat(baseMatch[1]) * 0.15).toFixed(2)) : 0,
          retencionFuente: 0,
          retencionIva: 0,
          total: baseMatch ? parseFloat((parseFloat(baseMatch[1]) * 1.15).toFixed(2)) : 0,
          paymentMethod: 'transferencia',
          paymentStatus: 'pendiente',
          sriStatus: 'emitido',
          xmlUrl: downloadURL,
          xmlPath: path,
          pdfUrl: '',
          pdfPath: '',
          updatedAt: new Date().toISOString()
        });

        successCount++;
      } catch (err) {
        console.error("Error importando", file.name, err);
      }
    }
    
    setIsUploadingMassive(false);
    showToast(`Se importaron ${successCount} comprobantes`, 'success');
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'autorizado': return <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-500 font-bold uppercase"><CheckCircle2 size={10}/> Autorizado</span>;
      case 'pendiente': return <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-500 font-bold uppercase"><AlertCircle size={10}/> Pendiente</span>;
      case 'anulado': return <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-red-500/20 text-red-500 font-bold uppercase">Anulado</span>;
      default: return <span className="text-[10px] px-2 py-1 rounded-md bg-gray-500/20 text-gray-500 font-bold uppercase">{status || 'Borrador'}</span>;
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-64 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
            <Search size={16} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
            <input 
              type="text" 
              placeholder="Buscar documento o tercero..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-3 py-2 rounded-xl border text-sm outline-none ${isDarkMode ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
            <option value="all" className="text-black">Todos los tipos</option>
            <option value="ingreso" className="text-black">Ingresos (Ventas)</option>
            <option value="egreso" className="text-black">Egresos (Compras)</option>
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className={`px-3 py-2 rounded-xl border text-sm outline-none ${isDarkMode ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
            <option value="all" className="text-black">Mes</option>
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => <option key={i} value={i} className="text-black">{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={`px-3 py-2 rounded-xl border text-sm outline-none ${isDarkMode ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
            <option value="all" className="text-black">Año</option>
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <input type="file" multiple accept=".xml" ref={massiveInputRef} onChange={handleMassiveUpload} className="hidden" />
          <button 
            onClick={() => massiveInputRef.current.click()}
            disabled={isUploadingMassive}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
          >
            {isUploadingMassive ? <span className="animate-pulse">Importando...</span> : <><UploadCloud size={16} /> Importación XML</>}
          </button>
          <button 
            onClick={() => { setEditingTx(null); setIsModalOpen(true); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Plus size={16} /> Registrar
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white'}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-xs uppercase font-semibold ${isDarkMode ? 'bg-black/40 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Tercero</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Estado SRI</th>
                <th className="px-6 py-4">Archivos</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
              {filtered.map(tx => (
                <tr key={tx.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 text-xs">{tx.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tx.type === 'ingreso' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{tx.documentNumber || '-'}</td>
                  <td className="px-6 py-4 font-medium truncate max-w-[200px]" title={thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name}>
                    {thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || 'Desconocido'}
                  </td>
                  <td className="px-6 py-4 font-bold text-xs">${Number(tx.total || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">{getStatusBadge(tx.sriStatus)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {tx.xmlUrl ? <a href={tx.xmlUrl} target="_blank" rel="noreferrer" className="p-1 rounded bg-blue-500/20 text-blue-500 hover:bg-blue-500/40" title="Ver XML"><FileText size={12}/></a> : <span className="p-1 rounded bg-gray-500/20 text-gray-500 opacity-50"><FileText size={12}/></span>}
                      {tx.pdfUrl ? <a href={tx.pdfUrl} target="_blank" rel="noreferrer" className="p-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/40" title="Ver PDF"><FileText size={12}/></a> : <span className="p-1 rounded bg-gray-500/20 text-gray-500 opacity-50"><FileText size={12}/></span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingTx(tx); setIsModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-500 transition-colors"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"><Trash2 size={14}/></button>
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

      {isModalOpen && (
        <TransactionForm 
          tx={editingTx} 
          onClose={() => setIsModalOpen(false)} 
          thirdParties={thirdParties} 
          isDarkMode={isDarkMode} 
          showToast={showToast} 
          db={db} 
          storage={storage} 
          appId={appId} 
        />
      )}

    </div>
  );
}
