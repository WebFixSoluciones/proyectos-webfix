import { z } from 'zod';

// Category Schema
export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().optional(),
  name: z.string().min(2, "El nombre de la categoría debe tener al menos 2 caracteres"),
  parentId: z.string().uuid().optional(), // Permite jerarquía (Padre/Hijo)
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Category = z.infer<typeof CategorySchema>;

// Brand Schema
export const BrandSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().optional(),
  name: z.string().min(2, "El nombre de la marca debe tener al menos 2 caracteres"),
  manufacturer: z.string().optional(), // Fabricante o Proveedor principal
  history: z.array(z.object({
    date: z.date(),
    action: z.string(),
    user: z.string()
  })).optional(), // Histórico de la marca para trazabilidad
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Brand = z.infer<typeof BrandSchema>;
