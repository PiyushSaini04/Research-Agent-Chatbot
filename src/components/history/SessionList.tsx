import { SessionCard } from "./SessionCard";

interface Session {
  id: string;
  company_query: string;
  status: string;
  decision: string | null;
  recommendation: string | null;
  confidence: number | null;
  evidence_score: number | null;
  invest_probability: number | null;
  created_at: string;
  total_duration_ms: number | null;
}

interface SessionListProps {
  sessions: Session[];
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Research session history"
    >
      {sessions.map((session) => (
        <div key={session.id} role="listitem">
          <SessionCard session={session} />
        </div>
      ))}
    </div>
  );
}
