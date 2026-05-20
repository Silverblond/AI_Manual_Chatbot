import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { postChatStream } from "../api/client";
import SourcesSection from "../components/SourceCard";
import type { ChatMessage, Source } from "../types/chat";

const COLD_START_DELAY = 8000;
const REQUEST_TIMEOUT = 60000;

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isError?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setColdStart(false);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const coldStartTimer = setTimeout(() => setColdStart(true), COLD_START_DELAY);
    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT);

    try {
      await postChatStream(
        text,
        history,
        (token) => {
          setColdStart(false);
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content + token,
            };
            return next;
          });
        },
        (sources) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], sources };
            return next;
          });
        },
        abortController.signal,
      );
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "AbortError";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: isTimeout
            ? "응답 시간이 초과됐습니다. 다시 시도해주세요."
            : "오류가 발생했습니다. 다시 시도해주세요.",
          isError: true,
        };
        return next;
      });
    } finally {
      clearTimeout(coldStartTimer);
      clearTimeout(timeoutTimer);
      setColdStart(false);
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>안전매뉴얼 AI 챗봇</h1>
      </header>

      <main style={styles.messageList}>
        {messages.length === 0 && (
          <p style={styles.placeholder}>안전 작업에 관해 궁금한 점을 물어보세요.</p>
        )}
        {messages.map((msg, i) => {
          const isStreaming = loading && i === messages.length - 1 && msg.role === "assistant";
          const isEmpty = isStreaming && msg.content === "";
          return (
            <div
              key={i}
              style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "72%" }}
            >
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor: msg.isError
                    ? "#fef2f2"
                    : msg.role === "user"
                    ? "#2563eb"
                    : "#f1f5f9",
                  color: msg.isError
                    ? "#dc2626"
                    : msg.role === "user"
                    ? "#fff"
                    : isEmpty
                    ? "#94a3b8"
                    : "#1e293b",
                }}
              >
                {isEmpty ? (
                  "..."
                ) : msg.role === "assistant" && !msg.isError ? (
                  <ReactMarkdown components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              {msg.sources && <SourcesSection sources={msg.sources} />}
            </div>
          );
        })}
        {coldStart && (
          <p style={styles.coldStartNotice}>
            ⏳ 서버가 잠들어 있어서 첫 응답이 느릴 수 있어요. 잠시만 기다려주세요…
          </p>
        )}
        <div ref={bottomRef} />
      </main>

      <footer style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
          disabled={loading}
        />
        <button style={styles.button} onClick={send} disabled={loading}>
          {loading ? "…" : "전송"}
        </button>
      </footer>
    </div>
  );
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: "0 0 8px 0", lineHeight: 1.6 }}>{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ margin: "8px 0 6px 0", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ margin: "8px 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ margin: "6px 0 4px 0", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: "4px 0 8px 0", paddingLeft: "20px" }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: "4px 0 8px 0", paddingLeft: "20px" }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: "4px" }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 700 }}>{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code style={{ backgroundColor: "#e2e8f0", borderRadius: "4px", padding: "2px 5px", fontSize: "13px" }}>
      {children}
    </code>
  ),
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    maxWidth: "720px",
    margin: "0 auto",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  placeholder: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: "40px",
  },
  coldStartNotice: {
    color: "#64748b",
    fontSize: "13px",
    textAlign: "center",
    margin: "4px 0",
  },
  bubble: {
    padding: "10px 14px",
    borderRadius: "12px",
    lineHeight: 1.5,
    fontSize: "14px",
    wordBreak: "break-word",
    textAlign: "left",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
  },
  button: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },
};
