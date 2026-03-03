import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Report } from "@/models/Report";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import mongoose from "mongoose";
import type { ReportStatus } from "@/lib/constants/report";
import type { ReportDetail } from "@/types/report";

// ---------------------------------------------------------------------------
// Status presentation helpers (duplicated from ReportsTable — server-safe)
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ReportStatus, string> = {
  new: "New",
  in_review: "In Review",
  resolved: "Resolved",
};

const STATUS_VARIANTS: Record<ReportStatus, "default" | "secondary" | "outline"> = {
  new: "default",
  in_review: "secondary",
  resolved: "outline",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  if (!session) notFound();

  await connectToDatabase();

  const raw = await Report.findOne({
    _id: new mongoose.Types.ObjectId(id),
    companyId: new mongoose.Types.ObjectId(session.user.companyId),
  })
    .select("title description category status isAnonymous isRead contactEmail createdAt")
    .lean();

  if (!raw) notFound();

  // Mark as read — best-effort, don't block render
  if (!raw.isRead) {
    Report.findByIdAndUpdate(id, { $set: { isRead: true } }).exec().catch(() => undefined);
  }

  const report: ReportDetail = {
    _id: raw._id.toHexString(),
    title: raw.title,
    description: raw.description,
    ...(raw.category != null ? { category: raw.category } : {}),
    status: raw.status as ReportStatus,
    isAnonymous: raw.isAnonymous,
    isRead: raw.isRead ?? false,
    contactEmail: raw.contactEmail ?? null,
    createdAt: (raw.createdAt as Date).toISOString(),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
          <Badge variant={STATUS_VARIANTS[report.status]} className="shrink-0 mt-1">
            {STATUS_LABELS[report.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Submitted {new Date(report.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {report.category && (
            <> · <span className="capitalize">{report.category}</span></>
          )}
        </p>
      </div>

      {/* Description */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Report Details
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.description}</p>
      </div>

      {/* Reporter info */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reporter
        </h2>
        {report.isAnonymous ? (
          <p className="text-sm text-muted-foreground">Submitted anonymously — no contact information provided.</p>
        ) : (
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">The reporter opted in to be contacted.</p>
            {report.contactEmail && (
              <p>
                <span className="text-muted-foreground">Email: </span>
                <a
                  href={`mailto:${report.contactEmail}`}
                  className="font-medium hover:underline"
                >
                  {report.contactEmail}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
