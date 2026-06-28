export interface ResearchRequestBody {
  company: string;
}

export type SSEEventType = "agent_update" | "complete" | "error" | "heartbeat";

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}
