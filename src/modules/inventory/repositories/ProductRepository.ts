import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, appId } from '../../../firebase';
import { Product, ProductSchema } from '../domain/schemas/product.schema';

export class ProductRepository {
  private getCollectionRef() {
    // Usar la misma estructura que App.jsx usa para otras colecciones
    return collection(db, 'artifacts', appId, 'public', 'data', 'inventory_products');
  }

  async create(productData: Partial<Product>): Promise<Product> {
    // Si no tiene imagen, asignar imagen de placeholder automática (placehold.co)
    const imageUrl = productData.imageUrl && productData.imageUrl.trim() !== '' 
      ? productData.imageUrl 
      : '/product.svg';

    // Validar con Zod
    const validatedData = ProductSchema.parse({
      ...productData,
      imageUrl,
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
        imageUrl: validatedData.imageUrl,
        stock: validatedData.type === 'SERVICE' ? 0 : 0, // Inicializado en 0 (el stock real se calcula del Kardex)
        minStock: validatedData.stockMinimo !== undefined ? validatedData.stockMinimo : 5,
        maxStock: validatedData.stockMaximo !== undefined ? validatedData.stockMaximo : 100,
        inventoryType: validatedData.inventoryType || 'PHYSICAL',
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

  async findBySku(sku: string): Promise<Product | null> {
    if (!sku || !sku.trim()) return null;
    const cleanSku = sku.trim().toUpperCase();
    const q = query(this.getCollectionRef(), where('sku', '==', cleanSku));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Product;
  }

  async findAll(): Promise<Product[]> {
    const snap = await getDocs(this.getCollectionRef());
    const productsMap = new Map<string, Product>();
    for (const doc of snap.docs) {
      const data = doc.data() as Product;
      if (data && data.id && !productsMap.has(data.id)) {
        productsMap.set(data.id, data);
      }
    }
    return Array.from(productsMap.values());
  }

  async update(id: string, updates: Partial<Product>): Promise<void> {
    const docRef = doc(this.getCollectionRef(), id);
    const cleanedUpdates = { ...updates };
    if (cleanedUpdates.imageUrl !== undefined && (!cleanedUpdates.imageUrl || cleanedUpdates.imageUrl.trim() === '')) {
      cleanedUpdates.imageUrl = '/product.svg';
    }

    await updateDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: new Date()
    });

    // INTEGRACIÓN GLOBAL: Actualizar también en la colección de finanzas
    try {
      const financesProductRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', id);
      
      const updateData: any = {};
      if (cleanedUpdates.name !== undefined) updateData.name = cleanedUpdates.name;
      if (cleanedUpdates.sku !== undefined) updateData.sku = cleanedUpdates.sku.toUpperCase();
      if (cleanedUpdates.description !== undefined) updateData.description = cleanedUpdates.description;
      if (cleanedUpdates.salePrice !== undefined) updateData.price = cleanedUpdates.salePrice;
      if (cleanedUpdates.baseCost !== undefined) updateData.cost = cleanedUpdates.baseCost;
      if (cleanedUpdates.taxRate !== undefined) updateData.ivaCategory = cleanedUpdates.taxRate;
      if (cleanedUpdates.type !== undefined) updateData.type = cleanedUpdates.type === 'SERVICE' ? 'servicio' : 'producto';
      if (cleanedUpdates.stockMinimo !== undefined) updateData.minStock = cleanedUpdates.stockMinimo;
      if (cleanedUpdates.stockMaximo !== undefined) updateData.maxStock = cleanedUpdates.stockMaximo;
      if (cleanedUpdates.inventoryType !== undefined) updateData.inventoryType = cleanedUpdates.inventoryType;
      if (cleanedUpdates.imageUrl !== undefined) updateData.imageUrl = cleanedUpdates.imageUrl;
      
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
