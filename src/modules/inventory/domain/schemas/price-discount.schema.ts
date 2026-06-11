import { z } from 'zod';

// Discount Schema
export const DiscountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_VALUE', 'VOLUME']);
export const DiscountTargetEnum = z.enum(['PRODUCT', 'CATEGORY', 'BRAND', 'CLIENT']);

export const DiscountSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().optional(),
  name: z.string(),
  type: DiscountTypeEnum,
  targetType: DiscountTargetEnum,
  targetId: z.string().uuid(), // ID del producto, categoría, marca o cliente
  value: z.number().positive(), // Porcentaje o valor fijo
  volumeRequirement: z.number().positive().optional(), // Si es por volumen, cantidad mínima
  priority: z.number().int().default(0), // Reglas de prioridad y sobreposición
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Discount = z.infer<typeof DiscountSchema>;

// Price Schema (Control de Precios por Sucursal)
export const PriceSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  branchId: z.string().uuid(), // Precio puede variar por sucursal
  baseCost: z.number().nonnegative(),
  marginPercentage: z.number().nonnegative(),
  salePrice: z.number().nonnegative(),
  promotionalPrice: z.number().nonnegative().optional(),
  promoStartDate: z.date().optional(),
  promoEndDate: z.date().optional(),
  history: z.array(z.object({
    date: z.date(),
    oldPrice: z.number(),
    newPrice: z.number(),
    changedBy: z.string()
  })).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Price = z.infer<typeof PriceSchema>;
