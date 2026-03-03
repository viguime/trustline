import type { ReportStatus } from "@/lib/constants/report";

/**
 * Serialised report row returned by GET /api/reports.
 * Safe to pass to client components — no internal DB refs exposed.
 */
export interface ReportRow {
  _id: string;
  title: string;
  category?: string;
  status: ReportStatus;
  isAnonymous: boolean;
  isRead: boolean;
  contactEmail: string | null;
  createdAt: string; // ISO string — Date serialised over the wire
}
