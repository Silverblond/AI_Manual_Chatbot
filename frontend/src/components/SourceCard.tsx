import type { Source } from "../types/chat";

interface Props {
  source: Source;
}

export default function SourceCard({ source }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.docName}>{source.documentName}</span>
        <span style={styles.page}>{source.page}페이지</span>
      </div>
      <p style={styles.preview}>{source.preview}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px 12px",
    backgroundColor: "#f8fafc",
    fontSize: "13px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  docName: {
    fontWeight: 600,
    color: "#1e293b",
  },
  page: {
    color: "#64748b",
    fontSize: "12px",
  },
  preview: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
};
