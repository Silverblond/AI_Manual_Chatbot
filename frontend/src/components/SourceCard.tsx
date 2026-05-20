import { useState } from "react";
import type { Source } from "../types/chat";

interface Props {
  sources: Source[];
}

function groupByDoc(sources: Source[]): { docName: string; pages: number[] }[] {
  const map = new Map<string, number[]>();
  for (const src of sources) {
    const pages = map.get(src.documentName) ?? [];
    if (!pages.includes(src.page)) pages.push(src.page);
    map.set(src.documentName, pages);
  }
  return Array.from(map.entries()).map(([docName, pages]) => ({ docName, pages }));
}

export default function SourcesSection({ sources }: Props) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginTop: "6px" }}>
      <button onClick={() => setOpen((v) => !v)} style={styles.toggle}>
        {open ? "출처 닫기 ▲" : `출처 보기 (${sources.length}) ▼`}
      </button>
      {open && (
        <div style={styles.list}>
          {groupByDoc(sources).map(({ docName, pages }, i) => (
            <div key={i} style={styles.card}>
              <span style={styles.docName}>{docName}</span>
              <span style={styles.page}> · {pages.join(", ")}p</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toggle: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    fontSize: "12px",
    padding: "2px 0",
    textDecoration: "underline",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "4px",
  },
  card: {
    backgroundColor: "#f1f5f9",
    borderRadius: "6px",
    padding: "5px 10px",
    fontSize: "12px",
  },
  docName: {
    fontWeight: 600,
    color: "#334155",
  },
  page: {
    color: "#64748b",
  },
};
