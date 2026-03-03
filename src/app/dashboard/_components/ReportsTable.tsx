"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_STATUSES, type ReportStatus } from "@/lib/constants/report";
import type { ReportRow } from "@/types/report";

// ---------------------------------------------------------------------------
// Status presentation helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ReportStatus, string> = {
  new: "New",
  in_review: "In Review",
  resolved: "Resolved",
};

const STATUS_VARIANTS: Record<
  ReportStatus,
  "default" | "secondary" | "outline"
> = {
  new: "default",
  in_review: "secondary",
  resolved: "outline",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function patchReport(reportId: string, patch: { status?: ReportStatus; isRead?: boolean }) {
  return fetch(`/api/reports/${reportId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

// ---------------------------------------------------------------------------
// Inline status updater cell
// Marks the report as read on status change (manager engagement implied).
// ---------------------------------------------------------------------------

function StatusCell({
  reportId,
  current,
  onRead,
}: {
  reportId: string;
  current: ReportStatus;
  onRead: () => void;
}) {
  const [value, setValue] = useState<ReportStatus>(current);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleChange(next: string) {
    const nextStatus = next as ReportStatus;
    setValue(nextStatus); // optimistic status
    onRead();            // optimistic read

    const res = await patchReport(reportId, { status: nextStatus, isRead: true });

    if (!res.ok) {
      setValue(current); // revert on failure
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-7 w-32 text-xs" aria-label="Update status">
        <SelectValue>
          <Badge variant={STATUS_VARIANTS[value]} className="text-xs">
            {STATUS_LABELS[value]}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {REPORT_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Reports table
// ---------------------------------------------------------------------------

interface Props {
  reports: ReportRow[];
}

export default function ReportsTable({ reports }: Props) {
  // Local map of overridden read states — avoids a full page refresh just for
  // the unread indicator toggle (the badge will catch up on next poll).
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});

  function markRead(id: string) {
    setReadOverrides((prev) => ({ ...prev, [id]: true }));
    // Fire-and-forget — failures are non-critical for this UX signal
    patchReport(id, { isRead: true }).catch(() => undefined);
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        No reports yet. Share the magic link with employees to start receiving
        reports.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead className="w-32">Category</TableHead>
          <TableHead className="w-36">Status</TableHead>
          <TableHead className="w-36">Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((r) => {
          const isRead = readOverrides[r._id] ?? r.isRead;
          return (
            <TableRow
              key={r._id}
              className={isRead ? undefined : "bg-primary/5 hover:bg-primary/10"}
            >
              {/* Title — navigates to detail page and marks as read */}
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/reports/${r._id}`}
                  onClick={() => { if (!isRead) markRead(r._id); }}
                  className="flex items-center gap-2 hover:underline"
                >
                  {!isRead && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  )}
                  <span className={isRead ? "text-foreground/80" : "text-foreground font-semibold"}>
                    {r.title}
                  </span>
                </Link>
              </TableCell>

              <TableCell>
                {r.category ? (
                  <span className="capitalize text-sm">{r.category}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>

              <TableCell>
                <StatusCell
                  reportId={r._id}
                  current={r.status}
                  onRead={() => setReadOverrides((prev) => ({ ...prev, [r._id]: true }))}
                />
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
