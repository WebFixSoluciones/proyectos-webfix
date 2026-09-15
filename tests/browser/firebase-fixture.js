// In-memory Firebase adapter used only by the isolated browser test server.
const prefix = 'artifacts/test/public/data/';
export const fixtureProducts = [
  { id: 'product-1', name: 'Teclado USB', sku: 'TEC-001', type: 'STANDARD', inventoryType: 'PHYSICAL', stock: 8, baseCost: 12, salePrice: 20, taxRate: 15, status: 'ACTIVE', showInSales: true },
  { id: 'product-2', name: 'Servicio de instalación', sku: 'SER-001', type: 'SERVICE', stock: 0, baseCost: 0, salePrice: 10, taxRate: 0, status: 'ACTIVE', showInSales: true },
  { id: 'combo-1', name: 'Kit de oficina', sku: 'KIT-001', type: 'COMBO', stock: 0, salePrice: 25, taxRate: 15, comboItems: [{ productId: 'product-1', quantity: 1 }, { productId: 'product-2', quantity: 1 }] },
];
export const fixtureClient = { id: 'client-1', name: 'Cliente de prueba', ruc: '9999999999999', tipoIdentificacion: 'consumidor_final', isValidated: true, type: 'cliente' };
const data = new Map([
  [prefix + 'finances_settings/config', { ruc: '1790012345001', razonSocial: 'WebFix Pruebas', establecimiento: '001', puntoEmision: '001', secuencialNotaVenta: 1, secuencialFactura: 1, ambiente: '1', rucActivo: false }],
  [prefix + 'finances_cash_sessions/session-1', { id: 'session-1', status: 'abierta', responsible: 'Cajero de prueba', initialAmount: 100 }],
  ...fixtureProducts.map(p => [prefix + 'inventory_products/' + p.id, p]),
]);
const listeners = new Set();
const snap = path => ({ id: path.split('/').at(-1), exists: () => data.has(path), data: () => structuredClone(data.get(path)) });
export const getFirestore = () => ({});
export const doc = (...args) => ({ path: args[0]?.path ? [args[0].path, ...args.slice(1)].join('/') : args.slice(1).join('/') });
export const collection = doc;
export const where = (field, op, value) => ({ field, op, value });
export const orderBy = () => null;
export const limit = () => null;
export const query = (ref, ...filters) => ({ ...ref, filters: filters.filter(Boolean) });
export const getDoc = async ref => snap(ref.path);
export const getDocs = async ref => {
  const docs = [...data.keys()].filter(k => k.startsWith(ref.path + '/') && k.slice(ref.path.length + 1).indexOf('/') < 0).filter(k => (ref.filters || []).every(f => data.get(k)[f.field] === f.value)).map(snap);
  return { docs, empty: docs.length === 0, forEach: callback => docs.forEach(callback) };
};
const emit = () => listeners.forEach(callback => callback());
export const setDoc = async (ref, value, options) => { if (globalThis.__failWrites) throw new Error('Fallo de guardado simulado'); data.set(ref.path, { ...(options?.merge ? data.get(ref.path) : {}), ...structuredClone(value) }); emit(); };
export const updateDoc = (ref, value) => setDoc(ref, value, { merge: true });
export const deleteDoc = async ref => { data.delete(ref.path); emit(); };
export const addDoc = async (ref, value) => { const child = doc(ref, crypto.randomUUID()); await setDoc(child, value); return child; };
export const serverTimestamp = () => new Date();
export const Timestamp = { fromDate: value => value, now: () => new Date() };
export const onSnapshot = (ref, callback) => { const run = () => getDocs(ref).then(callback); listeners.add(run); run(); return () => listeners.delete(run); };
export const runTransaction = async (_db, body) => {
  const writes = [];
  const result = await body({ get: getDoc, set: (...args) => writes.push(() => setDoc(...args)), update: (...args) => writes.push(() => updateDoc(...args)), delete: (...args) => writes.push(() => deleteDoc(...args)) });
  for (const write of writes) await write();
  return result;
};
export const writeBatch = () => { const writes = []; return { set: (...args) => writes.push(() => setDoc(...args)), update: (...args) => writes.push(() => updateDoc(...args)), delete: (...args) => writes.push(() => deleteDoc(...args)), commit: async () => { for (const write of writes) await write(); } }; };
export const getStorage = () => ({});
export const ref = () => ({});
export const getDownloadURL = async () => '/product.svg';
export const uploadBytes = async () => ({});
export const uploadBytesResumable = () => ({ on: (_event, _progress, _error, complete) => complete() });
export const getAuth = () => ({ currentUser: { uid: 'tester' } });
export const onAuthStateChanged = (_auth, callback) => { callback({ uid: 'tester' }); return () => {}; };
export const signOut = async () => {};
export const signInWithEmailAndPassword = async () => ({ user: { uid: 'tester' } });
globalThis.__fixtureData = data;
