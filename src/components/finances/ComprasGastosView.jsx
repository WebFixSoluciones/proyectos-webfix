import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiTextarea, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState } from 'react';
import { Sparkles, Save, CheckCircle2, X, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from '../../services/financeStore.js';
import { analizarTextoFacturaConGemini } from '../../services/geminiService';
import { getEcuadorDateString } from '../../services/sriService';
import { sincronizarCompra } from '../../services/integracionFinanzasService';

export default function ComprasGastosView({ transactions = [], showToast, db, appId }) {
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Textos Demo de Facturas de Ecuador para facilitar pruebas del usuario
  const MOCK_CNT_TEXT = `CORPORACION NACIONAL DE TELECOMUNICACIONES CNT EP
RUC: 1760001040001
Factura Nro: 001-777-089912233
Fecha Emision: 03/06/2026
Cliente: WEBFIX SOLUCIONES
Subtotal 12% / 15%: 25.00
IVA 15%: 3.75
TOTAL A PAGAR: 28.75 USD
Forma de Pago: Otros con utilizacion del sistema financiero`;

  const MOCK_SUPERMAXI_TEXT = `CORPORACION FAVORITA C.A. (SUPERMAXI)
RUC: 1790016919001
Direccion: Av. Eloy Alfaro y de los Granados
Factura Nro: 005-102-000456789
Fecha: 03-06-2026
1 Papel Bond A4 Resma - 5.50
1 Cafetera Oster Negra - 85.00
1 Pack Vasos Plasticos - 30.00
SUBTOTAL: 120.50
IVA 15%: 18.08
TOTAL: 138.58
Gracias por su compra`;

  // Analizar texto con Gemini
  const handleAnalyzeText = async () => {
    if (!pastedText.trim()) {
      showToast("Por favor pegue o escriba el contenido de una factura para analizar", "error");
      return;
    }
    setAnalyzing(true);
    try {
      const data = await analizarTextoFacturaConGemini(pastedText);
      setParsedData(data);
      showToast("Factura analizada correctamente por Gemini AI", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al analizar con la IA", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  // Guardar Gasto
  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (!parsedData) return;

    try {
      const txId = `tx_${new Date().getTime()}_gasto`;
      const payload = {
        id: txId,
        type: 'egreso',
        documentType: 'nota_venta',
        date: parsedData.date || getEcuadorDateString(),
        documentNumber: parsedData.documentNumber || `REC-${new Date().getTime().toString().slice(-6)}`,
        thirdPartyId: '', // Proveedor externo
        category: parsedData.category || 'gastos_administrativos',
        description: `${parsedData.razonSocial} - Gasto clasificado con IA`,
        currency: 'USD',
        baseImponible: Number(parsedData.baseImponible) || Number(parsedData.total) || 0,
        ivaPorcentaje: parsedData.ivaValor > 0 ? 15 : 0,
        ivaValor: Number(parsedData.ivaValor) || 0,
        total: Number(parsedData.total) || 0,
        paymentMethod: parsedData.paymentMethod || 'transferencia',
        paymentStatus: 'pagado',
        sriStatus: 'no_aplica',
        paymentsBreakdown: {
          efectivo: parsedData.paymentMethod === 'efectivo' ? Number(parsedData.total) : 0,
          transferencia: parsedData.paymentMethod === 'transferencia' ? Number(parsedData.total) : 0,
          tarjeta: parsedData.paymentMethod === 'tarjeta' ? Number(parsedData.total) : 0,
          cruce_cuentas: 0
        },
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId), payload);

      try {
        await sincronizarCompra({
          id: txId,
          type: 'egreso',
          documentType: 'nota_venta',
          documentNumber: payload.documentNumber || '',
          claveAcceso: '',
          total: Number(payload.total) || 0,
          baseImponible: Number(payload.baseImponible) || 0,
          ivaValor: Number(payload.ivaValor) || 0,
          proveedorNombre: parsedData.razonSocial || '',
          proveedorRuc: '',
          thirdPartyId: '',
          date: payload.date || new Date().toISOString(),
          paymentMethod: payload.paymentMethod || 'transferencia',
          paymentStatus: 'pagado',
          sriStatus: 'no_aplica',
          category: parsedData.category || 'gastos_administrativos',
          descripcion: payload.description || '',
          creadoPor: '',
        }, db, { uid: '', email: '' });
      } catch (syncErr) {
        console.error('Error sincronizando gasto con modulo financiero:', syncErr);
      }

      showToast("Gasto registrado y clasificado correctamente en la contabilidad", "success");
      setParsedData(null);
      setPastedText('');
    } catch (err) {
      console.error(err);
      showToast("Error al guardar el gasto", "error");
    }
  };

  // Eliminar gasto de la contabilidad (los egresos ingresados)
  const handleDeleteGasto = async (id) => {
    if (!await window.confirm("¿Está seguro de eliminar este gasto de la contabilidad?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', id));
      showToast("Gasto eliminado con éxito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar el gasto", "error");
    }
  };

  const currentExpenses = transactions.filter(t => t.type === 'egreso' && t.id.includes('gasto'));

  

  return (
    <UiBox {...{"className":"space-y-6"}}>
      
      {/* SECCIÓN ANALIZADOR */}
      <UiBox {...{"className":"grid grid-cols-1 lg:grid-cols-2 gap-6"}}>
        
        {/* ENTRADA DE TEXTO */}
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6 space-y-4"}}>
          <UiBox>
            <UiHeading as="h3" {...{"size":"1","weight":"bold","className":"flex items-center gap-1.5"}}>
              <Sparkles size={16} {...{"style":{"color":"var(--amber-11)"},"className":"animate-pulse"}} />
              <UiText>Categorizador de Gastos con Inteligencia Artificial</UiText>
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Pegue el texto copiado de un correo de facturación o el texto extraído de un ticket y Gemini identificará los montos, proveedor y tipo de gasto contable.</UiText>
          </UiBox>

          <UiBox {...{"className":"flex gap-2"}}>
            <UiButton
              onClick={() => setPastedText(MOCK_CNT_TEXT)}
              {...{"variant":"soft","color":"blue","className":"flex items-center gap-1"}}
            >
              <Copy size={10} />
              <UiText>Demo Factura CNT</UiText>
            </UiButton>
            <UiButton
              onClick={() => setPastedText(MOCK_SUPERMAXI_TEXT)}
              {...{"variant":"soft","color":"purple","className":"flex items-center gap-1"}}
            >
              <Copy size={10} />
              <UiText>Demo Supermaxi</UiText>
            </UiButton>
          </UiBox>

          <UiTextarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Pegue aquí el texto de su factura..."
            rows={8}
            {...{"size":"2","color":"gray","className":"w-full"}}
          />

          <UiButton
            onClick={handleAnalyzeText}
            disabled={analyzing || !pastedText.trim()}
            {...{"variant":"solid","color":"pink","size":"2","className":"w-full flex justify-center items-center gap-2 disabled:opacity-50"}}
          >
            {analyzing ? <RefreshCw size={14} {...{"className":"animate-spin"}} /> : <Sparkles size={14} />}
            <UiText>{analyzing ? 'Analizando Gasto con Gemini...' : 'Analizar Gasto con IA'}</UiText>
          </UiButton>
        </UiCard>

        {/* RESULTADO DEL ANÁLISIS */}
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6 flex flex-col justify-between"}}>
          {parsedData ? (
            <form onSubmit={handleSaveGasto} {...{"className":"space-y-4 h-full flex flex-col justify-between"}}>
              <UiBox>
                <UiBox {...{"className":"flex justify-between items-center mb-3"}}>
                  <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"green","className":"flex items-center gap-1"}}>
                    <CheckCircle2 size={14} /> Campos Extraídos por IA
                  </UiHeading>
                  <UiButton iconOnly type="button" onClick={() => setParsedData(null)} {...{"variant":"surface","color":"gray"}}><X size={14} /></UiButton>
                </UiBox>

                <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                  <UiBox {...{"className":"col-span-2"}}>
                    <UiLabel {...{}}>Razón Social Proveedor</UiLabel>
                    <UiInput
                      type="text"
                      required
                      value={parsedData.razonSocial || ''}
                      onChange={e => setParsedData({ ...parsedData, razonSocial: e.target.value })}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{}}>RUC Proveedor</UiLabel>
                    <UiInput
                      type="text"
                      required
                      value={parsedData.ruc || ''}
                      onChange={e => setParsedData({ ...parsedData, ruc: e.target.value })}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{}}>Nro de Documento</UiLabel>
                    <UiInput
                      type="text"
                      required
                      value={parsedData.documentNumber || ''}
                      onChange={e => setParsedData({ ...parsedData, documentNumber: e.target.value })}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{}}>Fecha Emisión</UiLabel>
                    <UiInput
                      type="date"
                      required
                      value={parsedData.date || ''}
                      onChange={e => setParsedData({ ...parsedData, date: e.target.value })}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{}}>Categoría Gasto</UiLabel>
                    <UiSelect
                      value={parsedData.category || ''}
                      onChange={e => setParsedData({ ...parsedData, category: e.target.value })}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    >
                      <option value="gastos_administrativos" {...{"style":{"color":"var(--gray-12)"}}}>Gastos Administrativos / Servicios</option>
                      <option value="costos" {...{"style":{"color":"var(--gray-12)"}}}>Costos / Compras Directas</option>
                      <option value="gastos_marketing" {...{"style":{"color":"var(--gray-12)"}}}>Marketing y Publicidad</option>
                      <option value="activos" {...{"style":{"color":"var(--gray-12)"}}}>Activos Fijos</option>
                      <option value="otros" {...{"style":{"color":"var(--gray-12)"}}}>Otros Gastos</option>
                    </UiSelect>
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{}}>Base Imponible ($)</UiLabel>
                    <UiInput
                      type="number"
                      step="0.01"
                      required
                      value={parsedData.baseImponible || 0}
                      onChange={e => setParsedData({ ...parsedData, baseImponible: parseFloat(e.target.value) || 0 })}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{}}>IVA Cobrado ($)</UiLabel>
                    <UiInput
                      type="number"
                      step="0.01"
                      required
                      value={parsedData.ivaValor || 0}
                      onChange={e => setParsedData({ ...parsedData, ivaValor: parseFloat(e.target.value) || 0 })}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"col-span-2 pt-2 flex justify-between items-center"}}>
                    <UiText {...{"weight":"bold","color":"red"}}>Total a Contabilizar:</UiText>
                    <UiText {...{"weight":"bold","color":"red","size":"3"}}>${(Number(parsedData.baseImponible || 0) + Number(parsedData.ivaValor || 0)).toFixed(2)}</UiText>
                  </UiBox>
                </UiBox>
              </UiBox>

              <UiButton
                type="submit"
                {...{"variant":"solid","color":"green","size":"2","className":"w-full flex justify-center items-center gap-1.5"}}
              >
                <Save size={14} />
                <UiText>Confirmar y Registrar Gasto</UiText>
              </UiButton>
            </form>
          ) : (
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"h-full flex flex-col items-center justify-center text-center p-6"}}>
              <Sparkles size={32} {...{"style":{"color":"var(--gray-11)"},"className":"mb-2 animate-bounce"}} />
              <UiText as="p" {...{"size":"1","weight":"bold"}}>Esperando análisis...</UiText>
              <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>Pegue los datos en el recuadro de la izquierda y presione "Analizar Gasto con IA".</UiText>
            </UiBox>
          )}
        </UiCard>

      </UiBox>

      {/* HISTORIAL RECIENTE GASTOS IA */}
      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"p-6 pb-2"}}>
          <UiHeading as="h3" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Últimos Gastos Registrados con IA</UiHeading>
        </UiBox>
        <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
          <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
            <UiTableHeader {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}}}>
              <UiTableRow>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Proveedor / RUC</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Documento</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Categoría</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Base</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>IVA</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Total</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-center"}}>Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody {...{}}>
              {currentExpenses.map(tx => (
                <UiTableRow key={tx.id} {...{}}>
                  <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{tx.date}</UiTableCell>
                  <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>{tx.description}</UiTableCell>
                  <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>{tx.documentNumber}</UiTableCell>
                  <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{String(tx.category || '').replace('_', ' ')}</UiTableCell>
                  <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5 text-right"}}>${(Number(tx.baseImponible) || 0).toFixed(2)}</UiTableCell>
                  <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5 text-right"}}>${(Number(tx.ivaValor) || 0).toFixed(2)}</UiTableCell>
                  <UiTableCell {...{"style":{"color":"var(--red-11)"},"className":"px-6 py-3.5 text-right"}}>${Number(tx.total).toFixed(2)}</UiTableCell>
                  <UiTableCell {...{"className":"px-6 py-3.5 text-center"}}>
                    <UiButton iconOnly
                      onClick={() => handleDeleteGasto(tx.id)}
                      {...{"variant":"solid","color":"red"}}
                      title="Eliminar gasto"
                    >
                      <Trash2 size={13} />
                    </UiButton>
                  </UiTableCell>
                </UiTableRow>
              ))}

              {currentExpenses.length === 0 && (
                <UiTableRow>
                  <UiTableCell colSpan="8" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center italic"}}>No hay gastos ingresados por IA en esta sesión.</UiTableCell>
                </UiTableRow>
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>

    </UiBox>
  );
}
