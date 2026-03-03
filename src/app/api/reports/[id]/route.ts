import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Report } from "@/models/Report";
import { REPORT_STATUSES } from "@/lib/constants/report";
import { z } from "zod";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Input schema — status is the only mutable field exposed to managers
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  status: z.enum(REPORT_STATUSES, {
    message: `Status must be one of: ${REPORT_STATUSES.join(", ")}`,
  }),
});

// ---------------------------------------------------------------------------
// PATCH /api/reports/[id] — authenticated, status update only
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

    const updated = await Report.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        // Ownership check: only the report's company can update it
        companyId: new mongoose.Types.ObjectId(session.user.companyId),
      },
      { $set: { status: result.data.status } },
      { new: true, select: "title status updatedAt" },
    ).lean();

    if (!updated) {
      // 404 for both "not found" and "wrong company" — no info leak
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Return only minimal safe fields
    return NextResponse.json({
      _id: updated._id.toHexString(),
      status: updated.status,
    });
  } catch (err) {
    console.error(`[PATCH /api/reports/${id}]`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
