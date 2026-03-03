/**
 * Rich seed script — wipes and recreates all demo data.
 * Run with:  npx tsx scripts/seed.ts
 *
 * Creates:
 *   • 3 companies
 *   • 3 manager accounts (one per company)
 *   • 12 reports spread across companies with varied statuses / categories
 */

import mongoose from "mongoose";
import { Company } from "../src/models/Company";
import { User } from "../src/models/User";
import { Report } from "../src/models/Report";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set in .env.local");

const URI: string = MONGODB_URI;

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const COMPANIES = [
  { name: "Acme Corporation" },
  { name: "Globex Industries" },
  { name: "Initech Solutions" },
] as const;

const PASSWORD = "TrustLine2026!";

const MANAGERS = [
  { email: "manager@acme.dev",    company: "Acme Corporation" },
  { email: "manager@globex.dev",  company: "Globex Industries" },
  { email: "manager@initech.dev", company: "Initech Solutions" },
] as const;

type ReportSeed = {
  company: string;
  title: string;
  description: string;
  category?: "financial" | "safety" | "harassment" | "discrimination" | "other";
  status?: "new" | "in_review" | "resolved";
  isAnonymous: boolean;
  contactEmail?: string;
};

const REPORTS: ReportSeed[] = [
  // ── Acme Corporation ─────────────────────────────────────────────────────
  {
    company: "Acme Corporation",
    title: "Expense report inflation",
    description:
      "A senior team member has been consistently submitting inflated expense reports. Amounts are ~30% above actuals based on receipts I've seen. This has been going on for at least 6 months.",
    category: "financial",
    status: "in_review",
    isAnonymous: true,
  },
  {
    company: "Acme Corporation",
    title: "Unsafe chemical storage in warehouse",
    description:
      "Solvents and flammable materials are being stored adjacent to electrical panels in Warehouse B. I raised this verbally last month but nothing has changed. This is a serious fire hazard.",
    category: "safety",
    status: "new",
    isAnonymous: false,
    contactEmail: "worker.anon@proton.me",
  },
  {
    company: "Acme Corporation",
    title: "Manager making inappropriate comments",
    description:
      "During team standups, the department head regularly makes remarks about colleagues' appearance and personal lives. Multiple team members are uncomfortable but afraid to speak up directly.",
    category: "harassment",
    status: "resolved",
    isAnonymous: true,
  },
  {
    company: "Acme Corporation",
    title: "Contractor invoiced for work not delivered",
    description:
      "We paid a vendor ~$14k for a deliverable that was never completed. The project was quietly closed and the payment was still processed. I have the invoice and the original SOW.",
    category: "financial",
    status: "new",
    isAnonymous: true,
  },

  // ── Globex Industries ─────────────────────────────────────────────────────
  {
    company: "Globex Industries",
    title: "Safety equipment not provided on site",
    description:
      "Workers on the third-floor construction zone are not being given proper fall-arrest harnesses. Supervisors claim 'they ordered more' but this has been the situation for three weeks.",
    category: "safety",
    status: "in_review",
    isAnonymous: true,
  },
  {
    company: "Globex Industries",
    title: "Age discrimination in recent promotions",
    description:
      "In the last two promotion cycles, every person promoted was under 35. Several highly qualified colleagues over 45 were passed over without clear justification. Comments were made in a team meeting about 'needing fresh energy'.",
    category: "discrimination",
    status: "new",
    isAnonymous: false,
    contactEmail: "concerned.employee@pm.me",
  },
  {
    company: "Globex Industries",
    title: "Data privacy breach — customer records shared externally",
    description:
      "I accidentally CC'd on an email that included a spreadsheet with ~2000 customer names, emails, and purchase history sent to a third-party marketing firm. I don't believe customers or management were notified.",
    category: "other",
    status: "new",
    isAnonymous: true,
  },
  {
    company: "Globex Industries",
    title: "Falsified quality control records",
    description:
      "QC sign-off sheets for batch #G-4471 were backdated and amended after the fact. I have photos of the originals. The batch was shipped to a client despite failing initial inspection.",
    category: "financial",
    status: "resolved",
    isAnonymous: true,
  },

  // ── Initech Solutions ─────────────────────────────────────────────────────
  {
    company: "Initech Solutions",
    title: "Hostile work environment from team lead",
    description:
      "Our team lead regularly shouts at junior developers in open-plan office, ridicules mistakes publicly, and has sent several messages that I'd describe as threatening. At least 3 people have already left because of this.",
    category: "harassment",
    status: "in_review",
    isAnonymous: true,
  },
  {
    company: "Initech Solutions",
    title: "Unequal pay between male and female engineers",
    description:
      "I have visibility into salary bands for my level. Female engineers at the same grade and tenure are consistently paid 15-20% less. This was confirmed by two colleagues who showed me their offer letters.",
    category: "discrimination",
    status: "new",
    isAnonymous: false,
    contactEmail: "fair.pay.report@tutanota.com",
  },
  {
    company: "Initech Solutions",
    title: "Software licences purchased but unused",
    description:
      "We have been renewing a $40k/year enterprise licence for a tool the team stopped using 18 months ago. The renewal is approved annually by someone who no longer knows what teams use it. Classic waste.",
    category: "financial",
    status: "resolved",
    isAnonymous: true,
  },
  {
    company: "Initech Solutions",
    title: "Inadequate fire escape signage on floor 2",
    description:
      "Two of the three fire exit signs on the second floor have been broken (dark) for over a month. Maintenance tickets have been closed without the issue being fixed. Flagging here as a formal record.",
    category: "safety",
    status: "new",
    isAnonymous: true,
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  await mongoose.connect(URI, { bufferCommands: false });
  console.log("✔  Connected to MongoDB\n");

  // Wipe existing seed collections so reruns are idempotent
  await Promise.all([
    Company.deleteMany({}),
    User.deleteMany({}),
    Report.deleteMany({}),
  ]);
  console.log("·  Cleared existing data\n");

  // ── Companies — created one-by-one so pre-save hook runs (generates magicLinkToken) ──
  const createdCompanies: Array<{ name: string; _id: mongoose.Types.ObjectId; magicLinkToken: string }> = [];
  for (const c of COMPANIES) {
    const doc = await Company.create({ name: c.name });
    createdCompanies.push({ name: doc.name, _id: doc._id, magicLinkToken: doc.magicLinkToken! });
  }

  console.log("✔  Companies created:");
  const companyMap = new Map<string, { _id: mongoose.Types.ObjectId; magicLinkToken: string }>();
  const appUrl = "http://localhost:3000";
  for (const c of createdCompanies) {
    companyMap.set(c.name, { _id: c._id, magicLinkToken: c.magicLinkToken });
    console.log(`   • ${c.name}`);
    console.log(`     Reporting URL: ${appUrl}/report/${c.magicLinkToken}`);
  }

  // ── Manager users ─────────────────────────────────────────────────────────
  console.log("\n✔  Manager accounts:");
  for (const m of MANAGERS) {
    const comp = companyMap.get(m.company);
    if (!comp) throw new Error(`Company not found: ${m.company}`);
    await User.create({
      email: m.email,
      passwordHash: PASSWORD,   // pre-save hook hashes this
      companyId: comp._id,
      role: "admin",
    });
    console.log(`   • ${m.email}  →  ${m.company}`);
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  console.log("\n✔  Reports:");
  for (const r of REPORTS) {
    const comp = companyMap.get(r.company);
    if (!comp) throw new Error(`Company not found: ${r.company}`);
    const doc = await Report.create({
      companyId: comp._id,
      title: r.title,
      description: r.description,
      ...(r.category ? { category: r.category } : {}),
      status: r.status ?? "new",
      isAnonymous: r.isAnonymous,
      contactEmail: r.isAnonymous ? null : (r.contactEmail ?? null),
    });
    console.log(`   • [${(doc.status ?? "new").padEnd(9)}] ${r.company.padEnd(20)} — ${r.title}`);
  }

  // ── Verify data is in DB ──────────────────────────────────────────────────
  const verified = await Company.find({}).select("name magicLinkToken").lean();
  console.log(`\n✔  Verified ${verified.length} companies in DB\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("  LOGIN CREDENTIALS (all share the same password)");
  console.log("─".repeat(60));
  for (const m of MANAGERS) {
    console.log(`  ${m.email.padEnd(30)} password: ${PASSWORD}`);
  }
  console.log("\n  REPORTING URLS (paste in an incognito window to submit a report)");
  console.log("─".repeat(60));
  for (const c of verified) {
    console.log(`  ${c.name}`);
    console.log(`  ${appUrl}/report/${c.magicLinkToken}`);
    console.log();
  }
  console.log("─".repeat(60) + "\n");

  await mongoose.disconnect();
  console.log("✔  Done");
}

void seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
