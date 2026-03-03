"use client";

import { useActionState, useState } from "react";
import { submitReport, type ReportFormState } from "./actions";

interface Props {
  token: string;
}

const initialState: ReportFormState = { success: false, message: "" };

// Shared Tailwind classes for consistency
const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "ring-offset-background placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function ReportForm({ token }: Props) {
  const [isAnonymous, setIsAnonymous] = useState(true);

  const [state, formAction, isPending] = useActionState(
    submitReport,
    initialState,
  );

  // Success state — replace the form with a confirmation message
  if (state.success) {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-8 text-center space-y-2">
        <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
          Report Submitted
        </h2>
        <p className="text-muted-foreground text-sm">
          Thank you. Your report has been received and will be reviewed shortly.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Passes the magic link token; the server action re-validates it to
          resolve companyId — companyId never touches the client. */}
      <input type="hidden" name="token" value={token} />

      {/* ------------------------------------------------------------------ */}
      {/* Title                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="Brief summary of the incident"
          className={inputClass}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Description                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          placeholder="Describe the incident in detail…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Category (optional)                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-1.5">
        <label htmlFor="category" className="text-sm font-medium">
          Category{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          id="category"
          name="category"
          type="text"
          maxLength={100}
          placeholder="e.g. Financial, Safety, Harassment…"
          className={inputClass}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Anonymous toggle                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-3">
        <input
          id="isAnonymous"
          name="isAnonymous"
          type="checkbox"
          defaultChecked
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
        />
        <label
          htmlFor="isAnonymous"
          className="text-sm font-medium cursor-pointer"
        >
          Submit anonymously
        </label>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Contact email — visible only when NOT anonymous                    */}
      {/* ------------------------------------------------------------------ */}
      {!isAnonymous && (
        <div className="space-y-1.5">
          <label htmlFor="contactEmail" className="text-sm font-medium">
            Contact email{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Inline error message                                                */}
      {/* ------------------------------------------------------------------ */}
      {state.message && !state.success && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Submit button                                                       */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}
