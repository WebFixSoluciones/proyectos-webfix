import React, { useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Sparkles, CheckCircle2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function PosView({ products, thirdParties, isDarkMode, showToast, db, appId, onCheckout }) {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Buscar cliente por defecto o crear consumidor final
  const getSelectedClient = () => {
    if (selectedClientId) {
      return thirdParties.find(tp => tp.id === selectedClientId);
    }
    // Retornar cliente Consumidor Final genérico
    return {
      name: 'Consumidor Final',
      ruc: '9999999999999',
      type: 'cliente',
      email: 'consumidorfinal@sri.gob.ec'
    };
  };

  const addToCart = (product) => {
    if (product.type === 'producto' && product.stock <= 0) {
      showToast("Producto sin stock disponible", "error");
      return;
    }

    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (product.type === 'producto' && existing.quantity >= product.stock) {
        showToast("Excede stock disponible", "error");
        return;
      }
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        ivaCategory: product.ivaCategory
      }]);
    }
  };

  const updateQuantity = (productId, change) => {
    const item = cart.find(i => i.productId === productId);
    const prod = products.find(p => p.id === productId);

    if (!item) return;
    const nextQty = item.quantity + change;
    if (nextQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }

    if (prod && prod.type === 'producto' && nextQty > prod.stock) {
      showToast("Excede stock disponible", "error");
      return;
    }

    setCart(cart.map(i => 
      i.productId === productId 
        ? { ...i, quantity: nextQty }
        : i
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Cómputo de Totales
  const getSubtotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const getIva = () => cart.reduce((acc, item) => acc + (item.price * item.quantity * (item.ivaCategory / 100)), 0);
  const getTotal = () => getSubtotal() + getIva();

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast("El carrito está vacío", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const client = getSelectedClient();
      
      // 1. Si el cliente no existe en la base de datos de Firestore (p.ej. es Consumidor Final y no está guardado), registrarlo
      let clientDocId = selectedClientId;
      if (!selectedClientId) {
        // Buscar si ya existe Consumidor Final por RUC
        const cf = thirdParties.find(tp => tp.ruc === '9999999999999');
        if (cf) {
          clientDocId = cf.id;
        } else {
          clientDocId = `tp_${new Date().getTime()}`;
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', clientDocId), {
            id: clientDocId,
            ...client,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Decrementar el Stock del Inventario para los ítems físicos
      for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.type === 'producto') {
          const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', item.productId);
          const nextStock = Math.max(0, (prod.stock || 0) - item.quantity);
          await setDoc(productRef, { stock: nextStock }, { merge: true });
        }
      }

      // 3. Crear el Comprobante SRI (Factura)
      const invoiceData = {
        type: 'ingreso',
        date: new Date().toISOString().split('T')[0],
        documentType: 'factura',
        thirdPartyId: clientDocId,
        category: 'ventas',
        currency: 'USD',
        baseImponible: Number(getSubtotal().toFixed(2)),
        ivaPorcentaje: 15,
        ivaValor: Number(getIva().toFixed(2)),
        retencionFuente: 0,
        retencionIva: 0,
        total: Number(getTotal().toFixed(2)),
        paymentMethod: 'transferencia',
        paymentStatus: 'pagado',
        sriStatus: 'pendiente',
        items: cart,
        isPOS: true
      };

      // 4. Invocar el callback de facturación SRI que creará e iniciará la simulación de firma
      onCheckout(invoiceData);
      
      setCart([]);
      showToast("Venta POS procesada y enviada a facturación SRI", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al procesar el pago", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[72vh] overflow-hidden">
      
      {/* PANEL IZQUIERDO: CARRITO DE COMPRA */}
      <div className={`lg:col-span-5 rounded-3xl border flex flex-col h-full overflow-hidden ${isDarkMode ? 'border-white/10 bg-white/[0.01]' : 'border-gray-350 bg-white shadow-sm'}`}>
        
        {/* CLIENT SELECTOR */}
        <div className={`p-4 border-b flex items-center gap-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
          <div className={`p-2 rounded-xl bg-blue-600/10 text-blue-500`}>
            <User size={16} />
          </div>
          <div className="flex-1">
            <select 
              value={selectedClientId} 
              onChange={e => setSelectedClientId(e.target.value)} 
              className={`w-full text-xs font-semibold px-2 py-1.5 outline-none rounded-lg border bg-transparent ${isDarkMode ? 'border-white/10 text-white' : 'border-gray-300 text-gray-900'}`}
            >
              <option value="" className="text-black">Consumidor Final (9999999999999)</option>
              {thirdParties.filter(tp => tp.type === 'cliente').map(tp => (
                <option key={tp.id} value={tp.id} className="text-black">{tp.name} - RUC: {tp.ruc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ITEMS DEL CARRITO */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.map((item, index) => (
            <div key={index} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200 shadow-sm'}`}>
              <div className="truncate pr-2 flex-1">
                <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>{item.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">${Number(item.price).toFixed(2)} c/u</p>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateQuantity(item.productId, -1)} className="p-1 rounded bg-gray-600/20 text-gray-400 hover:text-white"><Minus size={12}/></button>
                <span className={`text-xs font-bold w-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.productId, 1)} className="p-1 rounded bg-gray-600/20 text-gray-400 hover:text-white"><Plus size={12}/></button>
                
                <span className={`text-xs font-bold w-16 text-right shrink-0 ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
                
                <button type="button" onClick={() => removeFromCart(item.productId)} className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12">
              <ShoppingCart size={32} className="opacity-40 mb-2" />
              <p className="text-xs italic">Caja Registradora vacía</p>
            </div>
          )}
        </div>

        {/* METRICAS Y PROCESO DE VENTA */}
        <div className={`p-4 border-t space-y-4 shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-gray-500">
              <span>Subtotal Neto</span>
              <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>${getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500">
              <span>IVA (15%)</span>
              <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>${getIva().toFixed(2)}</span>
            </div>
            <div className={`flex justify-between items-center font-black pt-1.5 border-t ${isDarkMode ? 'border-white/5 text-white' : 'border-gray-300 text-gray-950 text-sm'}`}>
              <span>TOTAL A COBRAR</span>
              <span>${getTotal().toFixed(2)}</span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleCheckout} 
            disabled={cart.length === 0 || isProcessing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Sparkles size={14} /> Cobrar y Generar Factura SRI
          </button>
        </div>

      </div>

      {/* PANEL DERECHO: BUSCADOR Y SELECCIÓN DE PRODUCTOS */}
      <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
        
        {/* BUSCADOR DE PRODUCTOS */}
        <div className={`p-4 border rounded-2xl mb-4 flex items-center gap-2 ${isDarkMode ? 'border-white/10 bg-black/25' : 'border-gray-350 bg-white shadow-sm'}`}>
          <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-600'} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-gray-900"
          />
        </div>

        {/* GRID DE ITEMS */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-1 custom-scrollbar">
          {filteredProducts.map(p => {
            const isOutOfStock = p.type === 'producto' && p.stock <= 0;
            return (
              <div 
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`p-4 border rounded-2xl flex flex-col justify-between transition-all cursor-pointer select-none group relative overflow-hidden ${
                  isOutOfStock 
                    ? 'opacity-60 cursor-not-allowed bg-gray-500/5' 
                    : (isDarkMode ? 'border-white/5 hover:border-white/15 bg-white/[0.01]' : 'border-gray-300 hover:border-gray-400 bg-white hover:shadow-md')
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-mono text-[9px] text-gray-500">{p.sku}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${p.type === 'producto' ? 'bg-blue-600/10 text-blue-500' : 'bg-purple-600/10 text-purple-500'}`}>{p.type}</span>
                  </div>
                  <h4 className={`text-xs font-bold leading-tight mt-1.5 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>{p.name}</h4>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>${Number(p.price).toFixed(2)}</span>
                  {p.type === 'producto' && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${p.stock <= p.minStock ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                      Stk: {p.stock}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-gray-500">
              <ShoppingCart size={32} className="opacity-45 mb-2" />
              <p className="text-xs italic">No hay productos en el catálogo que coincidan.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
