import { useState } from "react";

interface NewsArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

interface Props {
  articles: NewsArticle[];
}

export default function NewsSection({ articles }: Props) {
  const [open, setOpen] = useState(false);
  if (!articles || articles.length === 0) return null;

  return (
    <div className="news-section">
      <button className="news-toggle" onClick={() => setOpen((o) => !o)}>
        <span>📰 관련 뉴스 {articles.length}건</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="news-list">
          {articles.map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener noreferrer" className="news-card">
              <span className="news-title">{a.title}</span>
              <span className="news-desc">{a.description}</span>
              <span className="news-date">{new Date(a.pubDate).toLocaleDateString("ko-KR")}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
