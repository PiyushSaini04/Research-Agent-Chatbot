import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { DecisionBadge } from "@/components/research/DecisionBadge";
import { ReportRenderer } from "@/components/research/ReportRenderer";
import { Recommendation } from "@/types/research";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Report — AI Investment Research Agent",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: session } = await supabase
    .from("research_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: report } = await supabase
    .from("saved_reports")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/history"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back to History
          </Link>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-foreground">
          {session.company_query} — Research Report
        </h1>

        {(session.decision || session.recommendation) && (
          <div className="mb-6">
            <DecisionBadge
              recommendation={(session.recommendation ?? session.decision) as Recommendation}
              decision={session.decision as "INVEST" | "PASS"}
              evidenceScore={session.evidence_score ?? session.invest_probability ?? 0}
              confidence={session.confidence ?? 0}
              investProbability={session.invest_probability ?? 0}
              passProbability={session.pass_probability ?? 0}
              rationale={
                (session.state as { decisionOutput?: { rationale?: string[] } })?.decisionOutput?.rationale ?? []
              }
              keyDrivers={
                (session.state as { decisionOutput?: { keyDrivers?: string[] } })?.decisionOutput?.keyDrivers ?? []
              }
              isFallback={
                (session.state as { decisionOutput?: { isFallback?: boolean } })?.decisionOutput?.isFallback ?? false
              }
            />
          </div>
        )}

        {report?.report_markdown ? (
          <ReportRenderer markdown={report.report_markdown} />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <FileText size={28} className="text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Report not found</p>
              <p className="text-sm mt-1 text-muted-foreground max-w-sm">
                The research session may have failed before the final report was generated, or it was not saved.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
