import { collection, doc, getDocs, query, where, orderBy, limit, setDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase';
import { KardexTransaction, KardexTransactionSchema } from '../domain/schemas/kardex-transfer.schema';

export class KardexRepository {
  private getCollectionRef() {
    return collection(db, 'artifacts', appId, 'public', 'data', 'inventory_kardex');
  }

  /**
   * Obtiene la ultima transaccion de un producto en una sucursal especifica para conocer su saldo actual.
   * 
   * REQUIERE INDICE COMPUESTO en Firestore:
   * Coleccion: inventory_kardex
   * Campos: productId (Asc), branchId (Asc), date (Desc)
   * Crear en: Firebase Console > Firestore > Indexes > Composite
   */
  async getLastBalance(productId: string, branchId: string): Promise<KardexTransaction | null> {
    const q = query(
      this.getCollectionRef(),
      where('productId', '==', productId),
      where('branchId', '==', branchId),
      orderBy('date', 'desc'),
      limit(1)
    );
    
    const snap = await getDocs(q);
    if (snap.empty) return null;
    
    return snap.docs[0].data() as KardexTransaction;
  }

  /**
   * Guarda una nueva transacción en el Kardex.
   */
  async save(transaction: Partial<KardexTransaction>): Promise<KardexTransaction> {
    const validatedData = KardexTransactionSchema.parse({
      ...transaction,
      id: transaction.id || crypto.randomUUID(),
      createdAt: new Date()
    });

    const docRef = doc(this.getCollectionRef(), validatedData.id);
    await setDoc(docRef, validatedData);
    
    return validatedData;
  }
  
  /**
   * Obtiene el historial completo de un producto.
   */
  async getHistory(productId: string, branchId: string): Promise<KardexTransaction[]> {
    const q = query(
      this.getCollectionRef(),
      where('productId', '==', productId),
      where('branchId', '==', branchId),
      orderBy('date', 'desc')
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as KardexTransaction);
  }
}

export const kardexRepository = new KardexRepository();
