import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from("research_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch report
  const { data: report } = await supabase
    .from("saved_reports")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  // Fetch agent logs
  const { data: agentLogs } = await supabase
    .from("agent_execution_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    session,
    report,
    agentLogs: agentLogs || [],
  });
}
