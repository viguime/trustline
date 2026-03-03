import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Company } from "@/models/Company";
import { Report } from "@/models/Report";
import { reportFormSchema } from "@/lib/validations/report";
import { auth } from "@/auth";
import mongoose from "mongoose";
import type { ReportRow } from "@/types/report";

// ---------------------------------------------------------------------------
// GET /api/reports — authenticated, returns reports for the session's company
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const rawReports = await Report.find({
      companyId: new mongoose.Types.ObjectId(session.user.companyId),
    })
      .sort({ createdAt: -1 })
      .select("title category status isAnonymous contactEmail createdAt")
      .lean();

    const reports: ReportRow[] = rawReports.map((r) => ({
      _id: r._id.toHexString(),
      title: r.title,
      ...(r.category != null ? { category: r.category } : {}),
      status: r.status as ReportRow["status"],
      isAnonymous: r.isAnonymous,
      contactEmail: r.contactEmail ?? null,
      createdAt: (r.createdAt as Date).toISOString(),
    }));

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[GET /api/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/reports — public, accepts magic link token (no auth required)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ---------------------------------------------------------------------------
  // 1. Parse body
  // ---------------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // 2. Validate input — reuses the shared schema so client and server rules
  //    are always in sync
  // ---------------------------------------------------------------------------
  const result = reportFormSchema.safeParse(body);
  if (!result.success) {
    // Return the first validation error; don't expose the full issue list
    const firstIssue = result.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { token, title, description, category, isAnonymous, contactEmail } =
    result.data;

  // ---------------------------------------------------------------------------
  // 3. Resolve company from token — companyId is NEVER received from the client
  // ---------------------------------------------------------------------------
  try {
    await connectToDatabase();

    const company = await Company.findOne({ magicLinkToken: token })
      .select("_id")
      .lean();

    if (!company) {
      // Generic 404 — no information about why the token is invalid
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // -------------------------------------------------------------------------
    // 4. Persist the report — companyId attached entirely server-side
    // -------------------------------------------------------------------------
    const trimmedCategory = category ?? undefined;
    const trimmedContact =
      !isAnonymous && contactEmail?.trim() ? contactEmail.trim() : null;

    await Report.create({
      companyId: company._id,
      title: title.trim(),
      description: description.trim(),
      ...(trimmedCategory !== undefined ? { category: trimmedCategory } : {}),
      isAnonymous,
      contactEmail: trimmedContact,
    });

    // Minimal response — no internal IDs or sensitive data
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reports]", err);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
