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
      <button className="source-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "출처 닫기 ▲" : `출처 보기 (${sources.length}) ▼`}
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          {groupByDoc(sources).map(({ docName, pages }, i) => (
            <div key={i} className="source-card">
              <span className="source-doc">{docName}</span>
              <span className="source-page"> · {pages.join(", ")}p</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
