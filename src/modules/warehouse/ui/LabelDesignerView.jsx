import { useMemo, useState } from 'react';
import { Printer, Search, Tag, Plus, Minus, Trash2, Sparkles, ScanBarcode } from 'lucide-react';
import { encodeCode128Bars, renderBarcodeSvgString, generateInternalEan13 } from '../domain/barcodeUtils.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase.js';

const LABEL_TEMPLATES = [
  { id: '50x25', name: 'Térmica 50×25 mm (Estándar)', widthMm: 50, heightMm: 25, cols: 1, mode: 'thermal' },
  { id: '40x30', name: 'Térmica 40×30 mm (Compacta)', widthMm: 40, heightMm: 30, cols: 1, mode: 'thermal' },
  { id: '60x40', name: 'Térmica 60×40 mm (Bodega / Caja)', widthMm: 60, heightMm: 40, cols: 1, mode: 'thermal' },
  { id: 'a4_3x8', name: 'Hoja A4 — 24 etiquetas (3×8)', widthMm: 64, heightMm: 33, cols: 3, mode: 'sheet' },
  { id: 'a4_4x10', name: 'Hoja A4 — 40 etiquetas (4×10)', widthMm: 48, heightMm: 26, cols: 4, mode: 'sheet' }
];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function LabelPreviewCard({ item, config, companyName }) {
  const codeValue = item.codigoBarras || item.sku || item.id;
  const encoded = useMemo(() => encodeCode128Bars(codeValue), [codeValue]);
  const pvp = Number(item.precio_con_iva ?? item.salePrice ?? item.price ?? 0);

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-2.5 flex flex-col justify-between gap-1 text-slate-900 select-none">
      {config.showCompany && (
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate text-center">
          {companyName || 'MI EMPRESA'}
        </div>
      )}
      {config.showName && (
        <div className="text-[11px] font-bold leading-tight text-slate-900 line-clamp-2 text-center">
          {item.name}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-[10px] px-1">
        {config.showSku && <span className="font-mono text-slate-600 truncate">SKU: {item.sku || '—'}</span>}
        {config.showPrice && (
          <span className="font-mono font-extrabold text-slate-950 shrink-0">
            ${pvp.toFixed(2)}
          </span>
        )}
      </div>
      {encoded.totalModules > 0 && (
        <svg
          viewBox={`0 0 ${encoded.totalModules} ${config.barcodeHeight + 14}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: `${config.barcodeHeight + 14}px` }}
        >
          {encoded.bars.map((b, idx) => (
            <rect key={idx} x={b.x} y={0} width={b.w} height={config.barcodeHeight} fill="#0f172a" />
          ))}
          <text
            x={encoded.totalModules / 2}
            y={config.barcodeHeight + 11}
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="10"
            fill="#0f172a"
          >
            {encoded.text}
          </text>
        </svg>
      )}
      {config.customNote && (
        <div className="text-[9px] text-slate-500 text-center truncate">{config.customNote}</div>
      )}
    </div>
  );
}

/**
 * Diseñador e Impresor de Etiquetas de Códigos de Barra (Térmicas y Hojas A4).
 * Permite generar EAN-13 automático para productos sin código y guardar directamente en el catálogo.
 */
export default function LabelDesignerView({ products = [], companyName = '', showToast, onOpenScanner }) {
  const [search, setSearch] = useState('');
  const [templateId, setTemplateId] = useState('50x25');
  const [queue, setQueue] = useState([]); // [{ product, copies }]
  const [config, setConfig] = useState({
    showCompany: true,
    showName: true,
    showSku: true,
    showPrice: true,
    barcodeHeight: 38,
    customNote: ''
  });
  const [savingBarcodeId, setSavingBarcodeId] = useState(null);

  const template = LABEL_TEMPLATES.find((t) => t.id === templateId) || LABEL_TEMPLATES[0];

  const physicalProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p && p.type !== 'SERVICE')
      .filter((p) => {
        if (!q) return true;
        return (
          String(p.name || '').toLowerCase().includes(q) ||
          String(p.sku || '').toLowerCase().includes(q) ||
          String(p.codigoBarras || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 60);
  }, [products, search]);

  const addToQueue = (product, copies = 1) => {
    setQueue((prev) => {
      const idx = prev.findIndex((x) => x.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], copies: Math.min(500, next[idx].copies + copies) };
        return next;
      }
      return [...prev, { product, copies }];
    });
  };

  const updateCopies = (productId, delta) => {
    setQueue((prev) =>
      prev
        .map((x) => (x.product.id === productId ? { ...x, copies: Math.max(0, Math.min(500, x.copies + delta)) } : x))
        .filter((x) => x.copies > 0)
    );
  };

  const handleGenerateBarcode = async (product) => {
    setSavingBarcodeId(product.id);
    try {
      const newBarcode = generateInternalEan13(product.sku || product.id);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory_products', product.id), {
        codigoBarras: newBarcode,
        updatedAt: new Date().toISOString()
      });
      setQueue((prev) =>
        prev.map((x) => (x.product.id === product.id ? { ...x, product: { ...x.product, codigoBarras: newBarcode } } : x))
      );
      showToast?.(`Código EAN-13 generado: ${newBarcode}`, 'success');
    } catch (err) {
      showToast?.(`No se pudo asignar el código de barras: ${err.message}`, 'error');
    } finally {
      setSavingBarcodeId(null);
    }
  };

  const totalLabels = queue.reduce((sum, x) => sum + x.copies, 0);

  const handlePrint = () => {
    if (queue.length === 0) {
      showToast?.('Agrega al menos un producto a la cola de impresión.', 'warning');
      return;
    }

    const cardsHtml = [];
    for (const entry of queue) {
      const p = entry.product;
      const code = p.codigoBarras || p.sku || p.id;
      const svg = renderBarcodeSvgString(code, { height: config.barcodeHeight, showText: true });
      const pvp = Number(p.precio_con_iva ?? p.salePrice ?? p.price ?? 0).toFixed(2);
      const card = `
        <div class="label-card">
          ${config.showCompany ? `<div class="company">${escapeHtml(companyName || 'MI EMPRESA')}</div>` : ''}
          ${config.showName ? `<div class="name">${escapeHtml(p.name)}</div>` : ''}
          <div class="meta">
            ${config.showSku ? `<span class="sku">SKU: ${escapeHtml(p.sku || '-')}</span>` : '<span></span>'}
            ${config.showPrice ? `<span class="price">$${pvp}</span>` : ''}
          </div>
          <div class="barcode">${svg}</div>
          ${config.customNote ? `<div class="note">${escapeHtml(config.customNote)}</div>` : ''}
        </div>
      `;
      for (let i = 0; i < entry.copies; i++) {
        cardsHtml.push(card);
      }
    }

    const pageCss = template.mode === 'thermal'
      ? `@page { size: ${template.widthMm}mm ${template.heightMm}mm; margin: 1mm; }
         .grid { display: block; }
         .label-card { width: ${template.widthMm - 2}mm; height: ${template.heightMm - 2}mm; page-break-after: always; box-sizing: border-box; }`
      : `@page { size: A4 portrait; margin: 8mm; }
         .grid { display: grid; grid-template-columns: repeat(${template.cols}, 1fr); gap: 3mm; }
         .label-card { height: ${template.heightMm}mm; border: 0.4pt dashed #cbd5e1; box-sizing: border-box; break-inside: avoid; }`;

    const html = `<!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Etiquetas de Inventario</title>
      <style>
        body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; }
        ${pageCss}
        .label-card { padding: 2mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
        .company { font-size: 7pt; font-weight: 700; text-transform: uppercase; text-align: center; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .name { font-size: 8.5pt; font-weight: 700; text-align: center; line-height: 1.15; max-height: 2.3em; overflow: hidden; }
        .meta { display: flex; justify-content: space-between; align-items: center; font-size: 7.5pt; }
        .sku { font-family: monospace; color: #334155; }
        .price { font-family: monospace; font-weight: 800; font-size: 9pt; }
        .barcode { width: 100%; }
        .note { font-size: 6.5pt; text-align: center; color: #64748b; }
      </style></head>
      <body><div class="grid">${cardsHtml.join('')}</div>
      <script>window.onload = function(){ window.print(); };</script>
      </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      showToast?.('Habilita las ventanas emergentes para imprimir etiquetas.', 'error');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const previewProduct = queue[0]?.product || physicalProducts[0] || {
    id: 'demo',
    name: 'Producto de Muestra',
    sku: 'SKU-0001',
    codigoBarras: '2000001234568',
    precio_con_iva: 19.99
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Tag size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Diseño e Impresión de Etiquetas</h2>
            <p className="text-xs text-slate-500">
              Genera códigos EAN-13 / Code 128 escaneables, personaliza el diseño y lanza impresión térmica o A4 en lote.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <ScanBarcode size={15} />
              <span>Escanear Producto</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            disabled={totalLabels === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black disabled:opacity-40 cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir {totalLabels > 0 ? `(${totalLabels} etiquetas)` : 'Etiquetas'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna izquierda: Catálogo y selección */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU o código de barras..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Producto</th>
                  <th className="py-2.5 px-3 font-semibold">Código de Barras</th>
                  <th className="py-2.5 px-3 font-semibold text-right">PVP</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {physicalProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">SKU: {p.sku || '—'}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {p.codigoBarras ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {p.codigoBarras}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={savingBarcodeId === p.id}
                          onClick={() => handleGenerateBarcode(p)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                        >
                          <Sparkles size={11} />
                          <span>{savingBarcodeId === p.id ? 'Generando...' : 'Generar EAN-13'}</span>
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                      ${Number(p.precio_con_iva ?? p.salePrice ?? p.price ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => addToQueue(p, 1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 font-semibold cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Añadir</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {physicalProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No se encontraron productos físicos para etiquetar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna derecha: Plantilla, vista previa y cola de impresión */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Plantilla y Diseño</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Formato de Papel / Impresora</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {LABEL_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'showCompany', label: 'Nombre empresa' },
                { key: 'showName', label: 'Nombre producto' },
                { key: 'showSku', label: 'Mostrar SKU' },
                { key: 'showPrice', label: 'Mostrar PVP' }
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config[opt.key]}
                    onChange={(e) => setConfig((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                  />
                  <span className="text-slate-700 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nota / Pie de etiqueta (opcional)</label>
              <input
                type="text"
                value={config.customNote}
                onChange={(e) => setConfig((prev) => ({ ...prev, customNote: e.target.value }))}
                placeholder="Ej. Incluye IVA • Garantía 12 meses"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Vista previa en vivo ({template.widthMm}×{template.heightMm} mm)</div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 max-w-[260px] mx-auto">
                <LabelPreviewCard item={previewProduct} config={config} companyName={companyName} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cola de Impresión ({totalLabels})
              </h3>
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Limpiar cola
                </button>
              )}
            </div>
            {queue.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Selecciona productos del catálogo para agregarlos a la cola de impresión.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {queue.map(({ product, copies }) => (
                  <div key={product.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{product.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{product.codigoBarras || product.sku}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCopies(product.id, -1)}
                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center font-mono font-bold">{copies}</span>
                      <button
                        type="button"
                        onClick={() => updateCopies(product.id, 1)}
                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueue((prev) => prev.filter((x) => x.product.id !== product.id))}
                        className="w-6 h-6 rounded text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
