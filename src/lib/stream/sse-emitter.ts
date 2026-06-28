export function createSSEStream(): {
  stream: ReadableStream<Uint8Array>;
  emit: (event: string, data: Record<string, unknown>) => void;
  close: () => void;
} {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      // Stream was cancelled by client
    },
  });

  function emit(event: string, data: Record<string, unknown>): void {
    try {
      const payload = JSON.stringify({ event, data });
      const message = `data: ${payload}\n\n`;
      controller.enqueue(encoder.encode(message));
    } catch (err) {
      console.error("[SSE] Failed to emit event:", err);
    }
  }

  function close(): void {
    try {
      controller.close();
    } catch {
      // Already closed
    }
  }

  return { stream, emit, close };
}
