/**
 * Zod Validation Schemas - Validação de Inputs
 *
 * Todos os schemas usados para validar inputs do cliente
 * (auth, game actions, payments, etc)
 *
 * @module ValidationSchemas
 */

import { z } from 'zod';

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username deve ter no mínimo 3 caracteres')
    .max(50, 'Username deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username deve conter apenas letras, números e underscore'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[@$!%*?&#]/, 'Senha deve conter pelo menos um caractere especial (@$!%*?&#)'),
  referralCode: z.string().optional(),
});

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter no mínimo 8 caracteres')
    .max(128, 'Nova senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Nova senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Nova senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Nova senha deve conter pelo menos um número')
    .regex(/[@$!%*?&#]/, 'Nova senha deve conter pelo menos um caractere especial'),
});

// ============================================================
// GAME SCHEMAS
// ============================================================

export const PlayerInputSchema = z.object({
  steering: z.number().min(-1).max(1),
  pressing: z.boolean(),
  timestamp: z.number().optional(),
});

export const PlayerNameSchema = z.object({
  name: z.string().min(1).max(50),
});

export const PositionUpdateSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  yaw: z.number(),
  timestamp: z.number().optional(),
});

export const JoinRoomSchema = z.object({
  roomType: z.enum(['public', 'private']),
  betAmount: z.number().min(1).max(1000).optional(),
  inviteCode: z.string().max(50).optional(),
});

// ============================================================
// PAYMENT SCHEMAS
// ============================================================

export const CreateDepositSchema = z.object({
  amount: z
    .number()
    .min(10, 'Depósito mínimo: R$ 10')
    .max(10000, 'Depósito máximo: R$ 10.000'),
});

export const CreateWithdrawalSchema = z.object({
  amount: z
    .number()
    .min(20, 'Saque mínimo: R$ 20')
    .max(50000, 'Saque máximo: R$ 50.000'),
  pixKey: z.string().min(1, 'Chave PIX é obrigatória'),
});

export const ApprovePaymentSchema = z.object({
  paymentId: z.string().cuid('ID de pagamento inválido'),
  transactionId: z.string().optional(),
});

export const VerifyPaymentSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID é obrigatório'),
});

// ============================================================
// USER SCHEMAS
// ============================================================

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  email: z.string().email().optional(),
  carColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (formato: #RRGGBB)').optional(),
});

export const UpdateAvatarSchema = z.object({
  avatarUrl: z.string().url('URL de avatar inválida'),
});

export const BanUserSchema = z.object({
  userId: z.string().cuid('ID de usuário inválido'),
  reason: z.string().min(10, 'Razão deve ter no mínimo 10 caracteres'),
  expiresAt: z.string().datetime().optional(),
});

// ============================================================
// ADMIN SCHEMAS
// ============================================================

export const UpdateUserRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['USER', 'ADMIN']),
});

export const UpdateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(), // Pode ser qualquer tipo JSON
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Valida dados com schema Zod e retorna erro formatado
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessages = result.error.errors.map((err) => err.message).join(', ');
    return { success: false, error: errorMessages };
  }
}

/**
 * Middleware Express para validar body com Zod
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = validateWithSchema(schema, req.body);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    req.validatedBody = result.data;
    next();
  };
}

/**
 * Middleware Express para validar query params com Zod
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = validateWithSchema(schema, req.query);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    req.validatedQuery = result.data;
    next();
  };
}

export default {
  RegisterSchema,
  LoginSchema,
  ChangePasswordSchema,
  PlayerInputSchema,
  PlayerNameSchema,
  PositionUpdateSchema,
  JoinRoomSchema,
  CreateDepositSchema,
  CreateWithdrawalSchema,
  ApprovePaymentSchema,
  VerifyPaymentSchema,
  UpdateProfileSchema,
  UpdateAvatarSchema,
  BanUserSchema,
  UpdateUserRoleSchema,
  UpdateSettingSchema,
  validateWithSchema,
  validateBody,
  validateQuery,
};
