import { REPORT_STATUSES, type ReportStatus } from "@/lib/constants/report";

describe("REPORT_STATUSES", () => {
  it("contains exactly the three expected statuses in order", () => {
    expect(REPORT_STATUSES).toEqual(["new", "in_review", "resolved"]);
  });

  it("has exactly 3 statuses", () => {
    expect(REPORT_STATUSES).toHaveLength(3);
  });

  it("every status is a non-empty lowercase string with no spaces", () => {
    REPORT_STATUSES.forEach((s) => {
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
      expect(s).toBe(s.toLowerCase());
      expect(s).not.toContain(" ");
    });
  });

  it("includes 'new' as the first status (default for new submissions)", () => {
    expect(REPORT_STATUSES[0]).toBe("new");
  });

  it("TypeScript type ReportStatus accepts each constant value (compile-time guard)", () => {
    // If ReportStatus diverged from REPORT_STATUSES this file would not compile.
    const typed: ReportStatus[] = [...REPORT_STATUSES];
    expect(typed).toHaveLength(REPORT_STATUSES.length);
  });
});

