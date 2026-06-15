import { z } from 'zod';

export const ProductTypeEnum = z.enum(['STANDARD', 'SUBPRODUCT', 'COMBO', 'SERVICE']);

export const ProductSchema = z.object({
  id: z.string().uuid().optional(), // Puede ser opcional al crear
  tenantId: z.string().optional(),
  type: ProductTypeEnum,
  sku: z.string().min(3, "El SKU debe tener al menos 3 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  
  // Precios base que se registran al crear (luego se gestionan en Pricing)
  baseCost: z.number().nonnegative("El costo base no puede ser negativo").default(0),
  marginPercentage: z.number().nonnegative().default(0),
  salePrice: z.number().nonnegative("El precio de venta no puede ser negativo").default(0),
  
  // Relaciones
  parentId: z.string().optional(), // Para SUBPRODUCT
  comboItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive()
  })).optional(), // Para COMBO
  
  // SRI & Tax
  taxRate: z.number().default(15), // IVA Ecuador actual, o 0, etc.
  
  stock: z.number().default(0),
  
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Product = z.infer<typeof ProductSchema>;
