import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBRw4Mi3m6gke6vBNTIaL99ewgGMjwB4ns",
  authDomain: "proyectos-webfix.firebaseapp.com",
  projectId: "proyectos-webfix",
  storageBucket: "proyectos-webfix.firebasestorage.app",
  messagingSenderId: "625295446429",
  appId: "1:625295446429:web:95fa8147488a6ab3a65f74",
  measurementId: "G-YY0ZWZXTDY",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export let appId = firebaseConfig.appId;

export function setTenantId(newId) {
  if (newId) {
    appId = newId;
  }
}
