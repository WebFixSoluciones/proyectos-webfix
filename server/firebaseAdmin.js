import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export function adminServices() {
  let app = getApps().find(item => item.name === 'webfix-admin');
  if (!app) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw Object.assign(new Error('Servicio de administración no configurado.'), { status: 503 });
    const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (account.project_id !== 'proyectos-webfix') throw Object.assign(new Error('Configuración de proyecto incorrecta.'), { status: 503 });
    app = initializeApp({ credential: cert(account), projectId: account.project_id }, 'webfix-admin');
  }
  return { auth: getAuth(app), db: getFirestore(app), serverTimestamp: () => FieldValue.serverTimestamp(), timestamp: date => Timestamp.fromDate(date) };
}
