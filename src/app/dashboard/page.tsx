import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Report } from "@/models/Report";
import ReportsTable from "./_components/ReportsTable";
import type { ReportRow } from "@/types/report";
import mongoose from "mongoose";

export default async function DashboardPage() {
  const session = await auth();
  // layout.tsx already guards access; this guard defends against direct RSC
  // invocation without the layout wrapper (e.g. route groups, testing).
  if (!session) return null;

  await connectToDatabase();

  const rawReports = await Report.find({
    companyId: new mongoose.Types.ObjectId(session.user.companyId),
  })
    .sort({ createdAt: -1 })
    .select("title category status isAnonymous isRead contactEmail createdAt")
    .lean();

  // Serialise Mongoose documents to plain objects safe for client components
  const reports: ReportRow[] = rawReports.map((r) => ({
    _id: r._id.toHexString(),
    title: r.title,
    ...(r.category != null ? { category: r.category } : {}),
    status: r.status as ReportRow["status"],
    isAnonymous: r.isAnonymous,
    isRead: r.isRead ?? false,
    contactEmail: r.contactEmail ?? null,
    createdAt: (r.createdAt as Date).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reports.length === 0
            ? "No reports received yet."
            : `${reports.length} report${reports.length === 1 ? "" : "s"} received.`}
        </p>
      </div>

      <ReportsTable reports={reports} />
    </div>
  );
}
