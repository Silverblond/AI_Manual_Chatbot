import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { postChatStream } from "../api/client";
import SourcesSection from "../components/SourceCard";
import RailIcon from "../components/RailIcon";
import type { ChatMessage, Source } from "../types/chat";

const COLD_START_DELAY = 8000;
const REQUEST_TIMEOUT = 60000;

const BRIEFING_PREFIX = "다음 작업 조건에 맞는 작업 전 안전 브리핑 문서를 작성해줘. 조건: ";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  followUps?: string[];
  isBriefing?: boolean;
  isError?: boolean;
}

const SUGGESTED = [
  "선로작업 시 전차선로 이격 거리 기준은?",
  "철도 작업자 사상사고의 주요 원인과 예방법은?",
  "철도 안전관리체계는 어떤 요소로 구성되나요?",
  "지하철 대형사고 현장 대응 절차는?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const [briefingMode, setBriefingMode] = useState(false);
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || loading) return;

    const isBriefing = briefingMode && !text; // 칩 클릭은 일반 모드로
    const content = isBriefing ? BRIEFING_PREFIX + raw : raw;
    const displayContent = raw; // 화면에는 사용자가 입력한 원문만 표시

    const history: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, { role: "user", content: displayContent, isBriefing }]);
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
        (sources, followUps) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], sources, followUps };
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
  }, [input, loading, messages, briefingMode]);

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
          <div
            className={`chat-header-left${!isEmpty ? " chat-header-left-clickable" : ""}`}
            onClick={() => { if (!isEmpty) { setMessages([]); setInput(""); } }}
            aria-label={!isEmpty ? "대화 초기화" : undefined}
          >
            <span className="chat-logo-icon"><RailIcon size={22} /></span>
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
              <div className="welcome-icon"><RailIcon size={44} /></div>
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
                      <div className="assistant-avatar"><RailIcon size={15} /></div>
                    )}
                    <div className="msg-body">
                      {msg.role === "user" && msg.isBriefing && (
                        <span className="briefing-badge">📋 브리핑</span>
                      )}
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
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div className="follow-ups">
                          {msg.followUps.map((q) => (
                            <button key={q} className="follow-up-chip" onClick={() => send(q)}>
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
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
            <button
              className={`briefing-toggle${briefingMode ? " briefing-toggle-on" : ""}`}
              onClick={() => setBriefingMode((b) => !b)}
              aria-label="브리핑 모드 전환"
              title={briefingMode ? "브리핑 모드 ON" : "브리핑 모드 OFF"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>브리핑</span>
            </button>
            <input
              className="pill-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={briefingMode ? "예) 야간 선로 작업 · 5명" : "철도 안전에 대해 질문하세요"}
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
