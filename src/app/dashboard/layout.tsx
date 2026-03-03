import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Company } from "@/models/Company";
import SignOutButton from "./_components/SignOutButton";
import MagicLinkDisplay from "./_components/MagicLinkDisplay";
import UnreadBadge from "./_components/UnreadBadge";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ---------------------------------------------------------------------------
  // Auth guard — server-side, no flash
  // ---------------------------------------------------------------------------
  const session = await auth();
  if (!session) redirect("/login");

  // ---------------------------------------------------------------------------
  // Fetch company for display info — companyId comes from the verified JWT
  // ---------------------------------------------------------------------------
  await connectToDatabase();
  const company = await Company.findById(session.user.companyId)
    .select("name magicLinkToken")
    .lean();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const magicLinkUrl = company?.magicLinkToken
    ? `${appUrl}/report/${company.magicLinkToken}`
    : null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* --------------------------------------------------------------- */}
      {/* Sidebar                                                           */}
      {/* --------------------------------------------------------------- */}
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card px-4 py-6">
        {/* Brand */}
        <div className="mb-8">
          <span className="text-lg font-bold tracking-tight">
            Trust<span className="text-primary">Line</span>
          </span>
          {company && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {company.name}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Reports
            <UnreadBadge />
          </Link>
        </nav>

        {/* Magic link */}
        {magicLinkUrl && (
          <div className="mb-4">
            <MagicLinkDisplay url={magicLinkUrl} />
          </div>
        )}

        {/* Sign out */}
        <SignOutButton />
      </aside>

      {/* --------------------------------------------------------------- */}
      {/* Main content                                                      */}
      {/* --------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
