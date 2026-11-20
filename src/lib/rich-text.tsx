import type { ReactNode } from "react";

/**
 * Safe renderer for Deadlock asset descriptions. The API returns small HTML snippets such as
 * `Deal <span class="highlight">120</span> damage.<br>Cooldown...`. We never inject HTML; we parse the few tags
 * we know and drop everything else.
 */
const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };
const decode = (value: string) => value.replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (match) => ENTITIES[match] ?? match);

export function stripRichText(value: string | null | undefined): string {
  if (!value) return "";
  return decode(value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

type Mark = "strong" | "muted" | null;

export function RichText({ text, className }: { text?: string | null; className?: string }) {
  if (!text || !text.trim()) return null;
  const lines: ReactNode[][] = [[]];
  const stack: Mark[] = [];
  const pattern = /<\/?[a-zA-Z][^>]*>/g;
  let last = 0;
  let key = 0;
  const push = (raw: string) => {
    const content = decode(raw);
    if (!content) return;
    const mark = [...stack].reverse().find(Boolean);
    const node: ReactNode = mark === "strong" ? <strong key={key++} className="rt-highlight">{content}</strong> : mark === "muted" ? <span key={key++} className="rt-muted">{content}</span> : content;
    lines[lines.length - 1].push(node);
  };
  for (const match of text.matchAll(pattern)) {
    push(text.slice(last, match.index));
    last = (match.index ?? 0) + match[0].length;
    const tag = match[0];
    if (/^<br/i.test(tag)) { lines.push([]); continue; }
    if (/^<\//.test(tag)) { stack.pop(); continue; }
    if (/\/>$/.test(tag)) continue;
    const classes = /class\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    stack.push(/highlight/.test(classes) || /^<(b|strong)\b/i.test(tag) ? "strong" : /diminish|dim|muted/.test(classes) ? "muted" : null);
  }
  push(text.slice(last));
  const visible = lines.filter((line) => line.length);
  return <div className={className ? `rich-text ${className}` : "rich-text"}>{visible.map((line, index) => <p key={index}>{line}</p>)}</div>;
}
