import type { Prisma } from '@prisma/client';

/** Human-friendly yearly order code: SG-2026-000123 (shared by orders & errands). */
export async function generateOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_code_seq')`;
  const seq = rows[0]?.nextval ?? 0n;
  return `SG-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;
}
