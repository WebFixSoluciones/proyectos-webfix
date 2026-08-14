import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analizarComprobanteConGemini, parsearXMLComprobante } from './geminiService';
import { registrarAuditoria } from './auditService';

const COLLECTION = 'fin_capturas';

export async function getCapturas(db) {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getResumenCapturas(capturas) {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const esteMes = capturas.filter(c => {
    const f = c.createdAt?.toDate?.() || new Date(c.createdAt);
    return f >= inicioMes;
  });
  const pendientes = capturas.filter(c => c.estado === 'pendiente');
  const confirmados = capturas.filter(c => c.estado === 'confirmado');
  const rechazados = capturas.filter(c => c.estado === 'rechazado');
  const montoTotal = confirmados.reduce((s, c) => s + (c.datosExtraidos?.montoTotal || 0), 0);
  return { total: capturas.length, esteMes: esteMes.length, pendientes: pendientes.length, confirmados: confirmados.length, rechazados: rechazados.length, montoTotal };
}

export async function procesarArchivoCaptura(db, storage, appId, file, usuario) {
  const tipoDocumento = file.type === 'application/pdf' ? 'pdf' : file.name.endsWith('.xml') ? 'xml' : 'imagen';
  let urlArchivo = null;

  if (storage && appId) {
    const path = `capturas/${appId}/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, file);
    urlArchivo = await getDownloadURL(sRef);
  }

  let datosExtraidos = null;

  if (tipoDocumento === 'xml') {
    const text = await file.text();
    const parsed = parsearXMLComprobante(text);
    if (parsed.success) {
      const d = parsed.data;
      datosExtraidos = {
        ruc: d.ruc || '',
        razonSocial: d.razonSocial || '',
        fecha: d.date || '',
        montoTotal: Number(d.total) || 0,
        iva: Number(d.ivaValor) || 0,
        retencionFuente: Number(d.retencionFuente) || 0,
        retencionIva: Number(d.retencionIva) || 0,
        claveAcceso: '',
        tipo: 'egreso',
        categoria: d.category || 'otros',
        centroCosto: '',
        confianza: 95,
      };
    }
  } else {
    try {
      const geminiData = await analizarComprobanteConGemini(file);
      if (geminiData) {
        datosExtraidos = {
          ruc: geminiData.ruc || '',
          razonSocial: geminiData.razonSocial || '',
          fecha: geminiData.date || '',
          montoTotal: Number(geminiData.total) || 0,
          iva: Number(geminiData.ivaValor) || 0,
          retencionFuente: Number(geminiData.retencionFuente) || 0,
          retencionIva: Number(geminiData.retencionIva) || 0,
          claveAcceso: geminiData.claveAcceso || '',
          tipo: geminiData.tipo || 'egreso',
          categoria: geminiData.category || 'otros',
          centroCosto: geminiData.centroCosto || '',
          confianza: calcularConfianza(geminiData),
        };
      }
    } catch (err) {
      console.error('Error OCR Gemini:', err);
      throw err;
    }
  }

  if (!datosExtraidos) {
    throw new Error('No se pudieron extraer datos del documento');
  }

  const duplicado = await detectarDuplicado(db, datosExtraidos);

  const captura = {
    tipoDocumento,
    nombreArchivo: file.name,
    urlArchivo: urlArchivo || '',
    datosExtraidos,
    duplicado: duplicado?.esDuplicado || false,
    documentoExistenteId: duplicado?.documentoId || '',
    estado: 'pendiente',
    usuarioId: usuario?.uid || '',
    usuarioEmail: usuario?.email || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const refDoc = await addDoc(collection(db, COLLECTION), captura);
  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: refDoc.id, accion: 'crear', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: { nuevo: { nombreArchivo: file.name, tipo: tipoDocumento } }, modulo: 'finanzas' });

  return { id: refDoc.id, ...captura };
}

function calcularConfianza(data) {
  let score = 50;
  if (data.ruc && data.ruc.length >= 10) score += 15;
  if (data.razonSocial && data.razonSocial.length > 2) score += 10;
  if (data.date) score += 10;
  if (data.total && Number(data.total) > 0) score += 10;
  if (data.ivaValor !== undefined) score += 5;
  return Math.min(100, score);
}

async function detectarDuplicado(db, datos) {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const existentes = snap.docs.map(d => d.data());

    if (datos.claveAcceso && datos.claveAcceso.length > 5) {
      const match = existentes.find(c => c.datosExtraidos?.claveAcceso === datos.claveAcceso && c.estado === 'confirmado');
      if (match) return { esDuplicado: true, documentoId: match.documentoExistenteId || '', motivo: 'Clave de acceso duplicada' };
    }

    if (datos.ruc && datos.fecha && datos.montoTotal > 0) {
      const match = existentes.find(c => {
        const cd = c.datosExtraidos;
        return cd?.ruc === datos.ruc && cd?.fecha === datos.fecha && Math.abs((Number(cd?.montoTotal) || 0) - datos.montoTotal) < 0.01 && c.estado === 'confirmado';
      });
      if (match) return { esDuplicado: true, documentoId: match.documentoExistenteId || '', motivo: 'RUC + Fecha + Monto coinciden' };
    }

    return { esDuplicado: false, documentoId: '', motivo: '' };
  } catch {
    return { esDuplicado: false, documentoId: '', motivo: '' };
  }
}

export async function confirmarCaptura(db, capturaId, datosEditados, usuario) {
  const docRef = doc(db, COLLECTION, capturaId);
  await updateDoc(docRef, {
    datosExtraidos: datosEditados,
    estado: 'confirmado',
    updatedAt: serverTimestamp(),
  });
  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: capturaId, accion: 'confirmar', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: { datos: datosEditados }, modulo: 'finanzas' });
}

export async function rechazarCaptura(db, capturaId, usuario) {
  const docRef = doc(db, COLLECTION, capturaId);
  await updateDoc(docRef, {
    estado: 'rechazado',
    updatedAt: serverTimestamp(),
  });
  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: capturaId, accion: 'rechazar', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: {}, modulo: 'finanzas' });
}
