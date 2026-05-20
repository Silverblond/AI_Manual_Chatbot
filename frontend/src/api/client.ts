import type { ChatMessage, Source } from "../types/chat";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type { ChatMessage, Source };

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error("health check failed");
  return res.json();
}

export async function postChat(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("chat request failed");
  return res.json();
}

export async function postChatStream(
  message: string,
  history: ChatMessage[],
  onToken: (text: string) => void,
  onDone: (sources: Source[]) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
    signal,
  });
  if (!res.ok) throw new Error("chat stream failed");

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.type === "token") onToken(data.text);
      else if (data.type === "done") onDone(data.sources);
    }
  }
}
