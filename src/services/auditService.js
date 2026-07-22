import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function registrarAuditoria(db, params) {
  try {
    await addDoc(collection(db, 'fin_auditoria'), {
      coleccion: params.coleccion,
      documentoId: params.documentoId,
      accion: params.accion,
      usuario: params.usuario,
      usuarioEmail: params.usuarioEmail,
      fecha: serverTimestamp(),
      cambios: params.cambios || { antes: null, despues: null },
      modulo: params.modulo || 'finanzas',
      ip: null,
    });
  } catch (e) {
    console.error('[auditService] Error registrando auditoría:', e);
  }
}
