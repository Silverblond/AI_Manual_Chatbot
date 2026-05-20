import { useState, useRef, useEffect } from "react";
import { postChatStream } from "../api/client";
import SourceCard from "../components/SourceCard";
import type { ChatMessage, Source } from "../types/chat";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

    // 빈 assistant 메시지 미리 추가 (스트리밍으로 채움)
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await postChatStream(
        text,
        history,
        (token) => {
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
      );
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: "오류가 발생했습니다. 다시 시도해주세요.",
        };
        return next;
      });
    } finally {
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
          const displayContent = isStreaming && msg.content === "" ? "..." : msg.content;
          return (
            <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "70%" }}>
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor: msg.role === "user" ? "#2563eb" : "#f1f5f9",
                  color: msg.role === "user" ? "#fff" : isStreaming && msg.content === "" ? "#94a3b8" : "#1e293b",
                }}
              >
                {displayContent}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div style={styles.sourceList}>
                  {msg.sources.map((src, j) => (
                    <SourceCard key={j} source={src} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
          전송
        </button>
      </footer>
    </div>
  );
}

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
  bubble: {
    padding: "10px 14px",
    borderRadius: "12px",
    lineHeight: 1.5,
    fontSize: "14px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  sourceList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "8px",
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
