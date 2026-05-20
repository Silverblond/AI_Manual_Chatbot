import { useState } from "react";
import type { Source } from "../types/chat";

interface Props {
  sources: Source[];
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
          {sources.map((src, i) => (
            <div key={i} style={styles.card}>
              <span style={styles.docName}>{src.documentName}</span>
              <span style={styles.page}> · {src.page}p</span>
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
