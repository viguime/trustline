"use server";

import { connectToDatabase } from "@/lib/mongodb";
import { Company } from "@/models/Company";
import { Report } from "@/models/Report";

// ---------------------------------------------------------------------------
// Shared form-state type — used by both server action and client component
// ---------------------------------------------------------------------------

export interface ReportFormState {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Server Action
//
// Security note: the `token` field in formData is only used to look up the
// company on the server. companyId is NEVER received from or returned to the
// client — it is resolved entirely inside this action.
// ---------------------------------------------------------------------------

export async function submitReport(
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const token = formData.get("token");
  const title = formData.get("title");
  const description = formData.get("description");
  const category = formData.get("category");
  const isAnonymous = formData.get("isAnonymous") === "on";
  const contactEmail = formData.get("contactEmail");

  // Basic type guards — form values are always FormDataEntryValue | null
  if (
    typeof token !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string"
  ) {
    return { success: false, message: "Missing required fields." };
  }

  if (!title.trim() || !description.trim()) {
    return { success: false, message: "Title and description are required." };
  }

  try {
    await connectToDatabase();

    // Re-validate the magic link token — resolves companyId server-side only.
    // Using .select("_id") + .lean() avoids fetching unnecessary fields.
    const company = await Company.findOne({ magicLinkToken: token })
      .select("_id")
      .lean();

    if (!company) {
      return {
        success: false,
        message: "Invalid or expired reporting link.",
      };
    }

    // Build the document object; omit `category` entirely when blank so that
    // exactOptionalPropertyTypes does not complain about `undefined` vs absent.
    const trimmedCategory =
      typeof category === "string" && category.trim()
        ? category.trim()
        : undefined;

    const trimmedContact =
      !isAnonymous &&
      typeof contactEmail === "string" &&
      contactEmail.trim()
        ? contactEmail.trim()
        : null;

    await Report.create({
      companyId: company._id,
      title: title.trim(),
      description: description.trim(),
      ...(trimmedCategory !== undefined
        ? { category: trimmedCategory }
        : {}),
      isAnonymous,
      // Only persist contact email when reporter explicitly opts in
      contactEmail: trimmedContact,
    });

    return { success: true, message: "Report submitted successfully." };
  } catch (err) {
    console.error("[submitReport]", err);
    return {
      success: false,
      message: "An error occurred. Please try again later.",
    };
  }
}
