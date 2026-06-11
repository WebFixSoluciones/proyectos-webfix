import { z } from 'zod';

// --- KARDEX SCHEMA ---
export const TransactionTypeEnum = z.enum([
  'PURCHASE_RECEIPT', 'CUSTOMER_RETURN', 'POSITIVE_ADJUSTMENT', // Entradas
  'SALE', 'TRANSFER_OUT', 'NEGATIVE_ADJUSTMENT', 'SHRINKAGE', 'MASSIVE_ZERO' // Salidas
]);

export const KardexTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  date: z.date(),
  type: TransactionTypeEnum,
  referenceId: z.string(), // ID de la venta, compra, o ajuste (trazabilidad)
  quantity: z.number(), // Positivo para entradas, negativo para salidas
  unitCost: z.number().nonnegative(), // Costo unitario para esta transacción específica
  totalCost: z.number(), // quantity * unitCost (el valor absoluto de lo que sale o entra)
  balanceQuantity: z.number().nonnegative(), // Saldo actual de inventario después de la transacción
  balanceAverageCost: z.number().nonnegative(), // Costo Promedio Ponderado recalculado
  createdAt: z.date().optional()
});

export type KardexTransaction = z.infer<typeof KardexTransactionSchema>;

// --- TRANSFER SCHEMA ---
export const TransferTypeEnum = z.enum(['INTERNAL', 'EXTERNAL']);
export const TransferStatusEnum = z.enum(['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']);

export const TransferSchema = z.object({
  id: z.string().uuid().optional(),
  type: TransferTypeEnum,
  sourceBranchId: z.string().uuid(),
  targetBranchId: z.string().uuid(),
  status: TransferStatusEnum.default('PENDING'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative() // Costo en el momento de la transferencia
  })),
  transferCost: z.number().nonnegative().optional(), // Costo logístico (para EXTERNAL)
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Transfer = z.infer<typeof TransferSchema>;

// --- ADJUSTMENT SCHEMA ---
export const AdjustmentTypeEnum = z.enum(['MANUAL', 'MASSIVE', 'ZERO_INVENTORY']);

export const InventoryAdjustmentSchema = z.object({
  id: z.string().uuid().optional(),
  branchId: z.string().uuid(),
  type: AdjustmentTypeEnum,
  reason: z.string().min(5, "La justificación es obligatoria y debe ser descriptiva"),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number(), // +ingreso o -egreso
    operation: z.enum(['IN', 'OUT'])
  })),
  confirmedBy: z.string(), // Usuario que autoriza (necesario para ZERO_INVENTORY)
  status: z.enum(['DRAFT', 'APPLIED']).default('APPLIED'),
  createdAt: z.date().optional()
});

export type InventoryAdjustment = z.infer<typeof InventoryAdjustmentSchema>;
