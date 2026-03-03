import { connectToDatabase } from "@/lib/mongodb";
import { Company } from "@/models/Company";
import ReportForm from "./ReportForm";

// ---------------------------------------------------------------------------
// Dynamic segment — token comes from the URL
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ReportPage({ params }: Props) {
  const { token } = await params;

  await connectToDatabase();

  // companyId is fetched and used entirely server-side — never forwarded to
  // the client. The token is passed to the form so the server action can
  // re-verify ownership when the report is submitted.
  const company = await Company.findOne({ magicLinkToken: token })
    .select("name")
    .lean();

  if (!company) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-destructive">Invalid Link</h1>
          <p className="text-muted-foreground">
            This reporting link is invalid or has expired. Please request a new
            link from your organisation.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-background p-6">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Submit a Report
          </h1>
          <p className="mt-1 text-muted-foreground">
            You are submitting a report to{" "}
            <span className="font-medium text-foreground">{company.name}</span>.
            Your identity can remain anonymous.
          </p>
        </header>

        {/* Only the token travels to the client — companyId stays server-side */}
        <ReportForm token={token} />
      </div>
    </main>
  );
}
