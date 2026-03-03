import { slugify, generateMagicLinkToken } from "@/lib/utils/token";

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe("slugify", () => {
  it("lowercases the input", () => {
    expect(slugify("ACME")).toBe("acme");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("Acme Corporation")).toBe("acme-corporation");
  });

  it("collapses multiple spaces/special chars into a single hyphen", () => {
    expect(slugify("Globex  &  Sons")).toBe("globex-sons");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  --My Company--  ")).toBe("my-company");
  });

  it("removes non-alphanumeric characters", () => {
    expect(slugify("Acme Corp. (Ltd.)")).toBe("acme-corp-ltd");
  });

  it("handles a name that is already a valid slug", () => {
    expect(slugify("initech-solutions")).toBe("initech-solutions");
  });

  it("handles a single word", () => {
    expect(slugify("Trustline")).toBe("trustline");
  });

  it("handles numbers in the name", () => {
    expect(slugify("Company 42")).toBe("company-42");
  });

  it("returns an empty string for an all-special-char input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// generateMagicLinkToken
// ---------------------------------------------------------------------------

describe("generateMagicLinkToken", () => {
  it("starts with the slugified company name", () => {
    const token = generateMagicLinkToken("Acme Corporation");
    expect(token.startsWith("acme-corporation-")).toBe(true);
  });

  it("ends with a 16-character lowercase hex string (64-bit random)", () => {
    const token = generateMagicLinkToken("Acme Corporation");
    const random = token.split("-").pop() ?? "";
    expect(random).toMatch(/^[0-9a-f]{16}$/);
  });

  it("generates a different token on each call (random suffix)", () => {
    const a = generateMagicLinkToken("Acme Corporation");
    const b = generateMagicLinkToken("Acme Corporation");
    // Probability of collision is 1 in 2^64 — effectively impossible
    expect(a).not.toBe(b);
  });

  it("produces a URL-safe token (only lowercase alphanumeric and hyphens)", () => {
    for (let i = 0; i < 20; i++) {
      const token = generateMagicLinkToken("Some Company & Partners");
      expect(token).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("the slug portion matches slugify output", () => {
    const name = "Globex Industries";
    const token = generateMagicLinkToken(name);
    const expectedSlug = slugify(name);
    expect(token.startsWith(`${expectedSlug}-`)).toBe(true);
  });
});
