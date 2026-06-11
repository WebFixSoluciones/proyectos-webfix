import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase';
import { Category, CategorySchema, Brand, BrandSchema } from '../domain/schemas/category-brand.schema';

export class CategoryBrandRepository {
  private getCategoriesRef() {
    return collection(db, 'artifacts', appId, 'public', 'data', 'inventory_categories');
  }

  private getBrandsRef() {
    return collection(db, 'artifacts', appId, 'public', 'data', 'inventory_brands');
  }

  // --- CATEGORIES ---
  async createCategory(categoryData: Partial<Category>): Promise<Category> {
    const validated = CategorySchema.parse({
      ...categoryData,
      id: categoryData.id || crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const docRef = doc(this.getCategoriesRef(), validated.id);
    await setDoc(docRef, validated);
    return validated;
  }

  async getCategories(): Promise<Category[]> {
    const snap = await getDocs(this.getCategoriesRef());
    return snap.docs.map(doc => {
      const data = doc.data();
      // Aseguramos conversión de fechas si es necesario para el cliente
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Category;
    });
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    const docRef = doc(this.getCategoriesRef(), id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const docRef = doc(this.getCategoriesRef(), id);
    await deleteDoc(docRef);
  }

  // --- BRANDS ---
  async createBrand(brandData: Partial<Brand>): Promise<Brand> {
    const validated = BrandSchema.parse({
      ...brandData,
      id: brandData.id || crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const docRef = doc(this.getBrandsRef(), validated.id);
    await setDoc(docRef, validated);
    return validated;
  }

  async getBrands(): Promise<Brand[]> {
    const snap = await getDocs(this.getBrandsRef());
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Brand;
    });
  }

  async updateBrand(id: string, updates: Partial<Brand>): Promise<void> {
    const docRef = doc(this.getBrandsRef(), id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async deleteBrand(id: string): Promise<void> {
    const docRef = doc(this.getBrandsRef(), id);
    await deleteDoc(docRef);
  }
}

export const categoryBrandRepository = new CategoryBrandRepository();
