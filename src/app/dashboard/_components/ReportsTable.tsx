"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { REPORT_STATUSES, type ReportStatus } from "@/models/Report";
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
// Inline status updater cell
// ---------------------------------------------------------------------------

function StatusCell({
  reportId,
  current,
}: {
  reportId: string;
  current: ReportStatus;
}) {
  const [value, setValue] = useState<ReportStatus>(current);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleChange(next: string) {
    const nextStatus = next as ReportStatus;
    setValue(nextStatus); // optimistic

    const res = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!res.ok) {
      setValue(current); // revert on failure
      return;
    }

    startTransition(() => {
      router.refresh(); // revalidate server data
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
        {reports.map((r) => (
          <TableRow key={r._id}>
            <TableCell className="font-medium">{r.title}</TableCell>
            <TableCell>
              {r.category ? (
                <span className="capitalize text-sm">{r.category}</span>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell>
              <StatusCell reportId={r._id} current={r.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
