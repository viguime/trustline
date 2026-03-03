import { z } from "zod";

// ---------------------------------------------------------------------------
// Category options — used by the Select and for API-level validation
// ---------------------------------------------------------------------------

export const REPORT_CATEGORIES = [
  "financial",
  "safety",
  "harassment",
  "discrimination",
  "other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

// Human-readable labels for the Select component
export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  financial: "Financial",
  safety: "Safety",
  harassment: "Harassment",
  discrimination: "Discrimination",
  other: "Other",
};

// ---------------------------------------------------------------------------
// Shared schema
//
// Used by:
//   • The client-side React Hook Form (reportFormSchema)
//   • The POST /api/reports route handler (same schema re-used server-side)
//
// Security: `token` is the magic link token — never companyId.
// The API route resolves companyId from the token entirely server-side.
// ---------------------------------------------------------------------------

export const reportFormSchema = z
  .object({
    /** Magic link token from the URL — used server-side to resolve companyId */
    token: z.string().min(1, "Token is required"),

    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must be under 200 characters")
      .trim(),

    description: z
      .string()
      .min(20, "Description must be at least 20 characters")
      .max(5000, "Description must be under 5000 characters")
      .trim(),

    /**
     * Optional category. The shadcn Select only fires onValueChange with a
     * real enum value; it never emits an empty string. defaultValues carry
     * `undefined`, so no transform/preprocess is needed.
     */
    category: z.enum(REPORT_CATEGORIES).optional(),

    /**
     * Explicit boolean (not z.boolean().default()) so that RHF's input type
     * matches the output type under exactOptionalPropertyTypes.
     */
    isAnonymous: z.boolean(),

    contactEmail: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isAnonymous) {
      const email = data.contactEmail?.trim() ?? "";

      if (!email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contactEmail"],
          message: "Contact email is required when not submitting anonymously",
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contactEmail"],
          message: "Please enter a valid email address",
        });
      }
    }
  });

export type ReportFormValues = z.infer<typeof reportFormSchema>;
