export type AgentStatus = "pending" | "running" | "completed" | "failed";
export type Decision = "INVEST" | "PASS";
export type Recommendation =
  | "STRONG_INVEST"
  | "INVEST"
  | "HOLD"
  | "WEAK_PASS"
  | "PASS"
  | "INSUFFICIENT_DATA";
export type SessionStatus = "pending" | "running" | "completed" | "failed";

export interface AgentUpdate {
  agent: string;
  status: AgentStatus;
  message: string;
  timestamp: number;
  duration_ms?: number;
}

export interface ResearchSession {
  id: string;
  user_id: string;
  company_query: string;
  status: SessionStatus;
  decision: Decision | null;
  recommendation: Recommendation | null;
  investProbability: number | null;
  passProbability: number | null;
  evidence_score: number | null;
  confidence: number | null;
  total_duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface AgentExecutionLog {
  id: string;
  session_id: string;
  agent_name: string;
  status: AgentStatus;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  api_calls_made: string[];
  llm_calls: number;
  duration_ms: number | null;
  created_at: string;
}

export interface Source {
  url: string;
  title: string;
  agent: string;
}

export interface FinalReport {
  sessionId: string;
  decision: Decision;
  recommendation: Recommendation;
  evidenceScore: number;
  confidence: number;
  investProbability: number;
  passProbability: number;
  rationale: string[];
  keyDrivers: string[];
  isFallback: boolean;
  report_markdown: string;
  sources: Source[];
}
