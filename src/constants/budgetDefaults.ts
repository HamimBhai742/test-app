/**
 * Shared default budget limits used by Budget screen (explore.tsx)
 * and budget warning notifications (TransactionContext.tsx).
 * Edit here to keep both in sync.
 */
export const DEFAULT_BUDGETS: Record<string, number> = {
  Food: 3000,
  Shopping: 2000,
  Utilities: 1500,
  Rent: 5000,
  Entertainment: 500,
  Transport: 2500,
  Health: 2000,
  Education: 3000,
  Bills: 1800,
  Others: 1000,
};
