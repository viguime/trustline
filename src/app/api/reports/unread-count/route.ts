import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Report } from "@/models/Report";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// GET /api/reports/unread-count
// Returns the number of unread reports for the authenticated manager's company.
// Intended for lightweight polling — returns { count: number } only.
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const count = await Report.countDocuments({
      companyId: new mongoose.Types.ObjectId(session.user.companyId),
      isRead: false,
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("[GET /api/reports/unread-count]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
