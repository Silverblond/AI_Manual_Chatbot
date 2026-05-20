export interface Source {
  documentName: string;
  page: number;
  preview: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}
