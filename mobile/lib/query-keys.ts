/**
 * React Query key factory — prevents key string drift across hooks.
 */
export const queryKeys = {
  // Dashboard
  dashboard: ["dashboard"] as const,
  dashboardTrend: ["dashboard", "trend"] as const,

  // Inventory
  inventory: ["inventory"] as const,
  product: (id: string) => ["inventory", id] as const,
  categories: ["categories"] as const,

  // BOMs
  boms: ["boms"] as const,
  bom: (id: string) => ["boms", id] as const,
  bomReview: ["boms", "review"] as const,
  bomTemplates: ["bom-templates"] as const,
  bomTemplate: (id: string) => ["bom-templates", id] as const,

  // Assemblies
  assemblies: ["assemblies"] as const,
  assembly: (id: string) => ["assemblies", id] as const,
  assemblyTemplates: ["assembly-templates"] as const,

  // Receiving
  receipts: ["receipts"] as const,
  receipt: (id: string) => ["receipts", id] as const,

  // Suppliers & POs
  suppliers: ["suppliers"] as const,
  pos: ["pos"] as const,

  // Jobs
  jobs: ["jobs"] as const,

  // Cycle counts
  cycleCounts: ["cycle-counts"] as const,

  // Reorder
  reorderList: ["reorder-list"] as const,

  // Transactions
  transactions: ["transactions"] as const,

  // Current user
  me: ["me"] as const,
} as const;
