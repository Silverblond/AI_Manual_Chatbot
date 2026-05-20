import { useState, useRef, useEffect, useCallback } from "react";
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

const SUGGESTED = [
  "선로 작업 시 열차 접근 대피 기준은?",
  "지하철 화재 발생 시 대응 절차는?",
  "철도 안전관리체계란 무엇인가요?",
  "신호수의 역할과 배치 기준이 궁금해요",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const history: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);
    setColdStart(false);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const coldTimer = setTimeout(() => setColdStart(true), COLD_START_DELAY);
    const abort = new AbortController();
    const timeoutTimer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT);

    try {
      await postChatStream(
        content,
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
        abort.signal,
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
      clearTimeout(coldTimer);
      clearTimeout(timeoutTimer);
      setColdStart(false);
      setLoading(false);
    }
  }, [input, loading, messages]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className={dark ? "dark" : "light"} style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <div className="chat-app">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <span className="chat-logo-icon">✦</span>
            <span className="chat-logo-text">철도 안전 AI</span>
          </div>
          <button className="theme-btn" onClick={() => setDark((d) => !d)} aria-label="테마 전환">
            {dark ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a1 1 0 011 1v1a1 1 0 01-2 0V4a1 1 0 011-1zm0 15a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zm9-6a1 1 0 010 2h-1a1 1 0 010-2h1zM4 12a1 1 0 010 2H3a1 1 0 010-2h1zm14.657-5.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM7.05 16.95a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707A1 1 0 017.05 16.95zm11.314 0a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707zM5.636 7.05a1 1 0 01-1.414 1.414l-.707-.707A1 1 0 014.93 6.343l.707.707zM12 7a5 5 0 100 10A5 5 0 0012 7z"/>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
              </svg>
            )}
          </button>
        </header>

        {/* Main */}
        <main className="chat-main">
          {isEmpty ? (
            <div className="welcome">
              <div className="welcome-glow" />
              <div className="welcome-icon">✦</div>
              <h1 className="welcome-title">무엇이 궁금하신가요?</h1>
              <p className="welcome-sub">철도·지하철 안전 매뉴얼 기반 AI 챗봇</p>
              <div className="suggestions">
                {SUGGESTED.map((q) => (
                  <button key={q} className="suggestion-chip" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((msg, i) => {
                const isStreaming = loading && i === messages.length - 1 && msg.role === "assistant";
                const isEmptyStream = isStreaming && msg.content === "";
                return (
                  <div key={i} className={`msg-row msg-${msg.role}`}>
                    {msg.role === "assistant" && (
                      <div className="assistant-avatar">✦</div>
                    )}
                    <div className="msg-body">
                      <div className={[
                        "bubble",
                        `bubble-${msg.role}`,
                        msg.isError ? "bubble-error" : "",
                        isEmptyStream ? "bubble-empty" : "",
                      ].join(" ").trim()}>
                        {isEmptyStream ? (
                          <span className="typing"><span /><span /><span /></span>
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
                  </div>
                );
              })}
              {coldStart && (
                <p className="cold-notice">
                  ⏳ 서버가 잠들어 있어서 첫 응답이 느릴 수 있어요. 잠시만 기다려주세요…
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className={`chat-footer${isEmpty ? " chat-footer-centered" : ""}`}>
          <div className="input-pill">
            <input
              className="pill-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="철도 안전에 대해 질문하세요"
              disabled={loading}
            />
            <button
              className={`pill-send${input.trim() && !loading ? " pill-send-active" : ""}`}
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="전송"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="disclaimer">AI 답변은 참고용입니다. 정확한 내용은 원문 문서를 확인하세요.</p>
        </footer>
      </div>
    </div>
  );
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: "0 0 8px 0", lineHeight: 1.75 }}>{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ margin: "12px 0 6px", fontSize: "17px", fontWeight: 700 }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ margin: "12px 0 6px", fontSize: "16px", fontWeight: 700 }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ margin: "8px 0 4px", fontSize: "15px", fontWeight: 600 }}>{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: "4px 0 8px", paddingLeft: "18px" }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: "4px 0 8px", paddingLeft: "18px" }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: "4px" }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 700 }}>{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code style={{ backgroundColor: "rgba(0,0,0,0.07)", borderRadius: "4px", padding: "2px 6px", fontSize: "13px" }}>
      {children}
    </code>
  ),
};
