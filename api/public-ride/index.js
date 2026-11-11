import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { projectPublicIssuer, resolvePublicReceipt } from './receipt.js';

function firestoreAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('PUBLIC_RIDE_NOT_CONFIGURED');
  if (!getApps().length) {
    const serviceAccount = JSON.parse(raw);
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key
      }),
      projectId: 'proyectos-webfix'
    });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  const tenantId = String(req.query.tenantId || '');
  const txId = String(req.query.txId || '');
  const claveAcceso = String(req.query.claveAcceso || '');
  const token = String(req.query.token || '');
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(tenantId)
    || (txId && !/^[A-Za-z0-9._:-]{1,256}$/.test(txId))
    || (claveAcceso && !/^\d{49}$/.test(claveAcceso))
    || (token && !/^[A-Za-z0-9-]{1,128}$/.test(token))
    || (!txId && !claveAcceso)) {
    return res.status(400).json({ error: 'Enlace de comprobante inválido.' });
  }

  try {
    const db = firestoreAdmin();
    const store = {
      async getById(id, documentId) {
        const snap = await db.doc(`artifacts/${id}/public/data/finances_transactions/${documentId}`).get();
        return snap.exists ? { ...snap.data(), id: snap.id } : null;
      },
      async getByKey(id, key) {
        const snap = await db.collection(`artifacts/${id}/public/data/finances_transactions`)
          .where('claveAcceso', '==', key).limit(2).get();
        return snap.size === 1 ? { ...snap.docs[0].data(), id: snap.docs[0].id } : null;
      }
    };
    const receipt = await resolvePublicReceipt(store, { tenantId, txId, claveAcceso, token });
    if (!receipt) return res.status(404).json({ error: 'Comprobante no encontrado.' });
    const [config, info] = await Promise.all([
      db.doc(`artifacts/${tenantId}/public/data/finances_settings/config`).get(),
      db.doc(`artifacts/${tenantId}/public/data/meta/info`).get()
    ]);
    const issuer = {
      ...projectPublicIssuer(info.exists ? info.data() : null),
      ...projectPublicIssuer(config.exists ? config.data() : null),
      ...receipt.emisorSnapshot
    };
    return res.status(200).json({ receipt, issuer });
  } catch (error) {
    if (error.message === 'PUBLIC_RIDE_NOT_CONFIGURED') return res.status(503).json({ error: 'Visor público en configuración.' });
    console.error('Error al consultar comprobante público:', error);
    return res.status(500).json({ error: 'No se pudo consultar el comprobante.' });
  }
}
