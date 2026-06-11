import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, appId } from '../../../firebase';
import { Product, ProductSchema } from '../domain/schemas/product.schema';

export class ProductRepository {
  private getCollectionRef() {
    // Usar la misma estructura que App.jsx usa para otras colecciones
    return collection(db, 'artifacts', appId, 'public', 'data', 'inventory_products');
  }

  async create(productData: Partial<Product>): Promise<Product> {
    // Validar con Zod
    const validatedData = ProductSchema.parse({
      ...productData,
      id: productData.id || crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const docRef = doc(this.getCollectionRef(), validatedData.id);
    await setDoc(docRef, validatedData);
    
    return validatedData;
  }

  async findById(id: string): Promise<Product | null> {
    const docRef = doc(this.getCollectionRef(), id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Product;
  }

  async findAll(): Promise<Product[]> {
    const snap = await getDocs(this.getCollectionRef());
    return snap.docs.map(doc => doc.data() as Product);
  }

  async update(id: string, updates: Partial<Product>): Promise<void> {
    const docRef = doc(this.getCollectionRef(), id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.getCollectionRef(), id);
    await deleteDoc(docRef);
  }
}

// Exportar una instancia única (Singleton)
export const productRepository = new ProductRepository();
