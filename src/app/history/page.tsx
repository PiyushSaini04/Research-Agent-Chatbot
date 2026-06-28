import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessionList } from "@/components/history/SessionList";
import { History, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research History — AI Investment Research Agent",
  description: "View your past investment research sessions and reports.",
};

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sessions } = await supabase
    .from("research_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const sessionList = sessions ?? [];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <History size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Research History
              </h1>
              <p className="text-sm text-muted-foreground">
                {sessionList.length} session{sessionList.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Search size={15} />
            New Research
          </Link>
        </div>

        {/* Sessions grid */}
        {sessionList.length > 0 ? (
          <SessionList sessions={sessionList} />
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <History size={32} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                No research sessions yet
              </p>
              <p className="text-muted-foreground mt-1 text-sm max-w-xs">
                Start your first research by searching for a publicly traded
                company.
              </p>
            </div>
            <Link
              href="/"
              className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Search size={15} />
              Start Research
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
