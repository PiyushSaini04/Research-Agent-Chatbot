import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/research/route';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null })
    }))
  }))
}));

// Mock SSE and LangGraph
vi.mock('@/lib/stream/sse-emitter', () => ({
  createSSEStream: vi.fn(() => ({
    stream: new ReadableStream(),
    emit: vi.fn(),
    close: vi.fn()
  }))
}));
vi.mock('@/agents/graph', () => ({
  buildResearchGraph: vi.fn(() => ({
    stream: vi.fn(async function* () { yield {}; })
  }))
}));

describe('/api/research', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing company input', async () => {
    const req = new NextRequest('http://localhost:3000/api/research', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Company name is required');
  });

  it('accepts valid input and returns 200 with an SSE stream', async () => {
    const req = new NextRequest('http://localhost:3000/api/research', {
      method: 'POST',
      body: JSON.stringify({ company: 'Apple Inc.' })
    });

    const res = await POST(req);
    // Next API returns 200 by default when a stream is sent via Response
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
