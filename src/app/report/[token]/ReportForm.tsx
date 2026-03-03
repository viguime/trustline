"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  reportFormSchema,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABELS,
  type ReportFormValues,
} from "@/lib/validations/report";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  token: string;
}

export default function ReportForm({ token }: Props) {
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      token,
      title: "",
      description: "",
      category: undefined,
      isAnonymous: true,
      contactEmail: "",
    },
  });

  // Watch isAnonymous to conditionally render the email field
  const isAnonymous = useWatch({ control: form.control, name: "isAnonymous" });

  // -------------------------------------------------------------------------
  // Submit handler — posts JSON to the API route; companyId resolved server-side
  // -------------------------------------------------------------------------

  async function onSubmit(values: ReportFormValues) {
    setServerError("");
    setSubmitStatus("idle");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 404) {
        setServerError("This reporting link is no longer valid.");
        setSubmitStatus("error");
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(body.error ?? "An unexpected error occurred. Please try again.");
        setSubmitStatus("error");
        return;
      }

      setSubmitStatus("success");
    } catch {
      setServerError("Could not reach the server. Please check your connection.");
      setSubmitStatus("error");
    }
  }

  // -------------------------------------------------------------------------
  // Success screen
  // -------------------------------------------------------------------------

  if (submitStatus === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-500/25 bg-green-500/10 p-8 text-center space-y-3"
      >
        <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
          Report Submitted
        </h2>
        <p className="text-sm text-muted-foreground">
          Thank you. Your report has been received and will be reviewed shortly.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Form
  // -------------------------------------------------------------------------

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>

        {/* ---------------------------------------------------------------- */}
        {/* Title                                                             */}
        {/* ---------------------------------------------------------------- */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Title <span className="text-destructive" aria-hidden>*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Brief summary of the incident" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Description                                                       */}
        {/* ---------------------------------------------------------------- */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description <span className="text-destructive" aria-hidden>*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the incident in as much detail as possible…"
                  className="min-h-36 resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>Minimum 20 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Category (optional select)                                        */}
        {/* ---------------------------------------------------------------- */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {REPORT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {REPORT_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Anonymous toggle                                                  */}
        {/* ---------------------------------------------------------------- */}
        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">Submit anonymously</FormLabel>
                <FormDescription>
                  When enabled your identity will not be recorded. Uncheck only
                  if you wish to be contacted about this report.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Contact email — shown only when NOT anonymous                    */}
        {/* ---------------------------------------------------------------- */}
        {!isAnonymous && (
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Contact email <span className="text-destructive" aria-hidden>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Used only to follow up on this report — never shared publicly.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Server-level error banner                                         */}
        {/* ---------------------------------------------------------------- */}
        {submitStatus === "error" && serverError && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Submit                                                            */}
        {/* ---------------------------------------------------------------- */}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Submitting…" : "Submit Report"}
        </Button>
      </form>
    </Form>
  );
}
