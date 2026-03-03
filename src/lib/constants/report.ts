/**
 * Report status constants — no Node.js / Mongoose dependencies.
 * Safe to import in both server and client components.
 */
export const REPORT_STATUSES = ["new", "in_review", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
