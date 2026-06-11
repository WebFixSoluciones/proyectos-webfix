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
    
    // INTEGRACIÓN GLOBAL: Guardar también en la colección de finanzas para que el POS y Ventas puedan facturarlo
    try {
      const financesProductRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', validatedData.id);
      
      let categoryName = "";
      let brandName = "";
      if (validatedData.categoryId) {
        const catSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory_categories', validatedData.categoryId));
        if (catSnap.exists()) categoryName = catSnap.data().name || "";
      }
      if (validatedData.brandId) {
        const brandSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory_brands', validatedData.brandId));
        if (brandSnap.exists()) brandName = brandSnap.data().name || "";
      }

      await setDoc(financesProductRef, {
        id: validatedData.id,
        name: validatedData.name,
        sku: validatedData.sku.toUpperCase(),
        description: validatedData.description || "",
        price: validatedData.salePrice,
        cost: validatedData.baseCost,
        ivaCategory: validatedData.taxRate,
        stock: validatedData.type === 'SERVICE' ? 0 : 0, // Inicializado en 0 (el stock real se calcula del Kardex)
        minStock: 5,
        type: validatedData.type === 'SERVICE' ? 'servicio' : 'producto',
        marca: brandName,
        categoria: categoryName,
        bodega: "Bodega Central",
        codigoBarras: "",
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error synchronizing with finances_products:", err);
    }
    
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

    // INTEGRACIÓN GLOBAL: Actualizar también en la colección de finanzas
    try {
      const financesProductRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', id);
      
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.sku !== undefined) updateData.sku = updates.sku.toUpperCase();
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.salePrice !== undefined) updateData.price = updates.salePrice;
      if (updates.baseCost !== undefined) updateData.cost = updates.baseCost;
      if (updates.taxRate !== undefined) updateData.ivaCategory = updates.taxRate;
      if (updates.type !== undefined) updateData.type = updates.type === 'SERVICE' ? 'servicio' : 'producto';
      
      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date().toISOString();
        await updateDoc(financesProductRef, updateData);
      }
    } catch (err) {
      console.error("Error updating finances_products:", err);
    }
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.getCollectionRef(), id);
    await deleteDoc(docRef);

    // INTEGRACIÓN GLOBAL: Eliminar también de la colección de finanzas
    try {
      const financesProductRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', id);
      await deleteDoc(financesProductRef);
    } catch (err) {
      console.error("Error deleting from finances_products:", err);
    }
  }
}

// Exportar una instancia única (Singleton)
export const productRepository = new ProductRepository();
