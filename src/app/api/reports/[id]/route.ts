import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Report } from "@/models/Report";
import { REPORT_STATUSES } from "@/lib/constants/report";
import { z } from "zod";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Input schema — managers can update status and/or mark a report as read
// ---------------------------------------------------------------------------

const patchSchema = z
  .object({
    status: z
      .enum(REPORT_STATUSES, {
        message: `Status must be one of: ${REPORT_STATUSES.join(", ")}`,
      })
      .optional(),
    isRead: z.boolean().optional(),
  })
  .refine((d) => d.status !== undefined || d.isRead !== undefined, {
    message: "At least one of 'status' or 'isRead' must be provided",
  });

// ---------------------------------------------------------------------------
// Shared route context type
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/reports/[id] — authenticated, returns full report detail
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const report = await Report.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId: new mongoose.Types.ObjectId(session.user.companyId),
    })
      .select("title description category status isAnonymous isRead contactEmail createdAt")
      .lean();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: report._id.toHexString(),
      title: report.title,
      description: report.description,
      ...(report.category != null ? { category: report.category } : {}),
      status: report.status,
      isAnonymous: report.isAnonymous,
      isRead: report.isRead ?? false,
      contactEmail: report.contactEmail ?? null,
      createdAt: (report.createdAt as Date).toISOString(),
    });
  } catch (err) {
    console.error(`[GET /api/reports/${id}]`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/reports/[id] — authenticated, status + isRead update
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  // -------------------------------------------------------------------------
  // 1. Auth guard
  // -------------------------------------------------------------------------
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // -------------------------------------------------------------------------
  // 2. Validate route param
  // -------------------------------------------------------------------------
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  // -------------------------------------------------------------------------
  // 3. Parse and validate body
  // -------------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = patchSchema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  // -------------------------------------------------------------------------
  // 4. Update — filter by BOTH _id AND companyId to prevent cross-company access
  // -------------------------------------------------------------------------
  try {
    await connectToDatabase();

    const updateFields: Record<string, unknown> = {};
    if (result.data.status !== undefined) updateFields.status = result.data.status;
    if (result.data.isRead !== undefined) updateFields.isRead = result.data.isRead;

    const updated = await Report.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        // Ownership check: only the report's company can update it
        companyId: new mongoose.Types.ObjectId(session.user.companyId),
      },
      { $set: updateFields },
      { returnDocument: "after", select: "title status isRead updatedAt" },
    ).lean();

    if (!updated) {
      // 404 for both "not found" and "wrong company" — no info leak
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Return only minimal safe fields
    return NextResponse.json({
      _id: updated._id.toHexString(),
      status: updated.status,
      isRead: updated.isRead,
    });
  } catch (err) {
    console.error(`[PATCH /api/reports/${id}]`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
