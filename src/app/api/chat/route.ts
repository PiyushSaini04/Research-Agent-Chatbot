import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: { sessionId: string; message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, message } = body;
  if (!sessionId || !message) {
    return NextResponse.json({ error: "Missing sessionId or message" }, { status: 400 });
  }

  // Fetch session data
  const { data: sessionData, error } = await supabase
    .from("research_sessions")
    .select("state, chat_history, company_query")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { state, chat_history } = sessionData;
  const history = Array.isArray(chat_history) ? chat_history : [];

  // Prepare Gemini Context
  const systemPrompt = `You are an expert AI Investment Research Assistant.
The user is asking questions about the company: ${sessionData.company_query}.

Here is the compiled research context for this company:
---
${state?.aggregatedContext || "No context available."}
---

Final Decision Output:
${JSON.stringify(state?.decisionOutput || {})}

Markdown Report:
${state?.reportMarkdown || "No report available."}

Instructions:
- Answer the user's questions based ONLY on the provided research context and decision outputs.
- If asked "Why did you recommend PASS?", use the decisionOutput rationale.
- Maintain a professional, analytical, and conversational tone.
- Do not hallucinate data that is not in the context. If you don't know, state that it's not in the research data.`;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  // Convert chat history to Gemini format
  const formattedHistory = history.map((msg: any) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: formattedHistory,
    generationConfig: {
      temperature: 0.2,
    },
  });

  try {
    const result = await chat.sendMessage(message);
    const aiResponse = result.response.text();

    // Update DB
    const newHistory = [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: aiResponse },
    ];

    await supabase
      .from("research_sessions")
      .update({ chat_history: newHistory })
      .eq("id", sessionId);

    return NextResponse.json({ response: aiResponse, history: newHistory });
  } catch (err) {
    console.error("Chat Error:", err);
    return NextResponse.json({ error: "Failed to generate chat response" }, { status: 500 });
  }
}
