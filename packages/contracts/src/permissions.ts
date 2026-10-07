/** Single source of truth for permissions, shared by API (guards) and web (UI gating). */
export const PERMISSIONS = [
  "user.read",
  "user.manage",
  "role.manage",
  "product.read",
  "product.manage",
  "stock.read",
  "stock.adjust",
  "sale.create",
  "sale.discount.approve",
  "controlled.dispense",
  "cash.manage",
  "report.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Roles created for every new tenant. Tenants can customize later. */
export const DEFAULT_ROLES: Record<string, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: PERMISSIONS.filter((p) => p !== "role.manage"),
  PHARMACIST: ["product.read", "stock.read", "sale.create", "controlled.dispense", "report.read"],
  CASHIER: ["product.read", "stock.read", "sale.create", "cash.manage"],
  WAREHOUSE: ["product.read", "product.manage", "stock.read", "stock.adjust"],
};
