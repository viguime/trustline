import { reportFormSchema, REPORT_CATEGORIES, REPORT_CATEGORY_LABELS } from "@/lib/validations/report";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal valid anonymous payload — baseline for most tests. */
function validAnonymous(overrides: Record<string, unknown> = {}) {
  return {
    token: "acme-corporation-abc123",
    title: "Expense fraud in Q4",
    description: "I noticed discrepancies in the marketing team expense claims.",
    isAnonymous: true,
    ...overrides,
  };
}

/** A minimal valid non-anonymous payload with contact email. */
function validWithEmail(overrides: Record<string, unknown> = {}) {
  return {
    token: "acme-corporation-abc123",
    title: "Expense fraud in Q4",
    description: "I noticed discrepancies in the marketing team expense claims.",
    isAnonymous: false,
    contactEmail: "reporter@example.com",
    ...overrides,
  };
}

function firstError(data: unknown) {
  const result = reportFormSchema.safeParse(data);
  if (result.success) return null;
  return result.error.issues[0];
}

// ---------------------------------------------------------------------------
// Token field
// ---------------------------------------------------------------------------

describe("token", () => {
  it("is required", () => {
    const err = firstError(validAnonymous({ token: "" }));
    expect(err).not.toBeNull();
    expect(err?.path).toContain("token");
  });

  it("accepts any non-empty string", () => {
    const result = reportFormSchema.safeParse(validAnonymous({ token: "some-token-value" }));
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Title field
// ---------------------------------------------------------------------------

describe("title", () => {
  it("rejects titles shorter than 3 characters", () => {
    const err = firstError(validAnonymous({ title: "Hi" }));
    expect(err?.path).toContain("title");
    expect(err?.message).toMatch(/3/);
  });

  it("rejects an empty title", () => {
    const err = firstError(validAnonymous({ title: "" }));
    expect(err?.path).toContain("title");
  });

  it("rejects titles longer than 200 characters", () => {
    const longTitle = "a".repeat(201);
    const err = firstError(validAnonymous({ title: longTitle }));
    expect(err?.path).toContain("title");
    expect(err?.message).toMatch(/200/);
  });

  it("accepts a title exactly 3 characters long", () => {
    const result = reportFormSchema.safeParse(validAnonymous({ title: "abc" }));
    expect(result.success).toBe(true);
  });

  it("accepts a title exactly 200 characters long", () => {
    const result = reportFormSchema.safeParse(validAnonymous({ title: "a".repeat(200) }));
    expect(result.success).toBe(true);
  });

  it("trims whitespace from the title", () => {
    const result = reportFormSchema.safeParse(validAnonymous({ title: "  Valid Title  " }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Valid Title");
  });
});

// ---------------------------------------------------------------------------
// Description field
// ---------------------------------------------------------------------------

describe("description", () => {
  it("rejects descriptions shorter than 20 characters", () => {
    const err = firstError(validAnonymous({ description: "Too short." }));
    expect(err?.path).toContain("description");
    expect(err?.message).toMatch(/20/);
  });

  it("rejects descriptions longer than 5000 characters", () => {
    const err = firstError(validAnonymous({ description: "a".repeat(5001) }));
    expect(err?.path).toContain("description");
    expect(err?.message).toMatch(/5000/);
  });

  it("accepts a description exactly 20 characters long", () => {
    const result = reportFormSchema.safeParse(validAnonymous({ description: "a".repeat(20) }));
    expect(result.success).toBe(true);
  });

  it("accepts a description exactly 5000 characters long", () => {
    const result = reportFormSchema.safeParse(validAnonymous({ description: "a".repeat(5000) }));
    expect(result.success).toBe(true);
  });

  it("trims whitespace from the description", () => {
    const desc = "  " + "a".repeat(20) + "  ";
    const result = reportFormSchema.safeParse(validAnonymous({ description: desc }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe("a".repeat(20));
  });
});

// ---------------------------------------------------------------------------
// Category field (optional)
// ---------------------------------------------------------------------------

describe("category", () => {
  it("is optional — parses successfully when omitted", () => {
    const result = reportFormSchema.safeParse(validAnonymous());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.category).toBeUndefined();
  });

  it.each(REPORT_CATEGORIES)("accepts valid category '%s'", (category) => {
    const result = reportFormSchema.safeParse(validAnonymous({ category }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.category).toBe(category);
  });

  it("rejects an unknown category value", () => {
    const err = firstError(validAnonymous({ category: "bribery" }));
    expect(err?.path).toContain("category");
  });
});

// ---------------------------------------------------------------------------
// Anonymous / contact email logic (superRefine)
// ---------------------------------------------------------------------------

describe("anonymous submission", () => {
  it("is valid without contactEmail when isAnonymous is true", () => {
    const result = reportFormSchema.safeParse(validAnonymous());
    expect(result.success).toBe(true);
  });

  it("is valid even when contactEmail is provided alongside isAnonymous: true", () => {
    // Email is ignored server-side when anonymous, but schema does not block it
    const result = reportFormSchema.safeParse(
      validAnonymous({ contactEmail: "someone@example.com" })
    );
    expect(result.success).toBe(true);
  });
});

describe("non-anonymous submission", () => {
  it("is valid with a well-formed contactEmail", () => {
    const result = reportFormSchema.safeParse(validWithEmail());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contactEmail).toBe("reporter@example.com");
  });

  it("rejects when contactEmail is missing", () => {
    const err = firstError(validWithEmail({ contactEmail: undefined }));
    expect(err?.path).toContain("contactEmail");
    expect(err?.message).toMatch(/required/i);
  });

  it("rejects when contactEmail is an empty string", () => {
    const err = firstError(validWithEmail({ contactEmail: "" }));
    expect(err?.path).toContain("contactEmail");
    expect(err?.message).toMatch(/required/i);
  });

  it("rejects when contactEmail is whitespace only", () => {
    const err = firstError(validWithEmail({ contactEmail: "   " }));
    expect(err?.path).toContain("contactEmail");
    expect(err?.message).toMatch(/required/i);
  });

  it("rejects a malformed email address", () => {
    const err = firstError(validWithEmail({ contactEmail: "not-an-email" }));
    expect(err?.path).toContain("contactEmail");
    expect(err?.message).toMatch(/valid email/i);
  });

  it("rejects an email missing the domain part", () => {
    const err = firstError(validWithEmail({ contactEmail: "user@" }));
    expect(err?.path).toContain("contactEmail");
    expect(err?.message).toMatch(/valid email/i);
  });

  it("rejects an email missing the @ symbol", () => {
    const err = firstError(validWithEmail({ contactEmail: "userexample.com" }));
    expect(err?.path).toContain("contactEmail");
    expect(err?.message).toMatch(/valid email/i);
  });
});

// ---------------------------------------------------------------------------
// REPORT_CATEGORIES & REPORT_CATEGORY_LABELS
// ---------------------------------------------------------------------------

describe("REPORT_CATEGORIES", () => {
  it("contains exactly 5 categories", () => {
    expect(REPORT_CATEGORIES).toHaveLength(5);
  });

  it("every category has an entry in REPORT_CATEGORY_LABELS", () => {
    REPORT_CATEGORIES.forEach((c) => {
      expect(REPORT_CATEGORY_LABELS[c]).toBeDefined();
      expect(typeof REPORT_CATEGORY_LABELS[c]).toBe("string");
    });
  });

  it("REPORT_CATEGORY_LABELS has no extra keys beyond the defined categories", () => {
    const labelKeys = Object.keys(REPORT_CATEGORY_LABELS);
    expect(labelKeys).toHaveLength(REPORT_CATEGORIES.length);
  });
});
