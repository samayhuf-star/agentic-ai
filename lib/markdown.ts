import { createElement, type ReactNode } from "react";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1]) {
      nodes.push(createElement("img", { key: key++, src: match[3], alt: match[2], className: "mk-inline-img" }));
    } else if (match[4]) {
      const href = match[6];
      const external = href.startsWith("http");
      nodes.push(
        createElement(
          "a",
          { key: key++, href, ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}) },
          match[5],
        ),
      );
    } else if (match[7]) {
      nodes.push(createElement("strong", { key: key++ }, match[8]));
    } else if (match[9]) {
      nodes.push(createElement("em", { key: key++ }, match[10]));
    } else if (match[11]) {
      nodes.push(createElement("code", { key: key++ }, match[12]));
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const takeList = (ordered: boolean) => {
    const items: ReactNode[] = [];
    const re = ordered ? /^\d+\.\s+(.*)$/ : /^[-*]\s+(.*)$/;
    while (i < lines.length && re.test(lines[i])) {
      const text = lines[i].replace(re, "$1");
      items.push(createElement("li", { key: items.length }, ...inline(text)));
      i += 1;
    }
    blocks.push(createElement(ordered ? "ol" : "ul", { key: key++ }, items));
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(createElement("h3", { key: key++ }, ...inline(line.slice(4))));
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(createElement("h2", { key: key++ }, ...inline(line.slice(3))));
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(createElement("h1", { key: key++ }, ...inline(line.slice(2))));
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(createElement("blockquote", { key: key++ }, createElement("p", null, ...inline(quote.join(" ")))));
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      takeList(false);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      takeList(true);
      continue;
    }
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line.trim())) {
      blocks.push(createElement("p", { key: key++, className: "mk-figure" }, ...inline(line.trim())));
      i += 1;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |[-*] |\d+\. |> |!\[[^\]]*\]\([^)]+\)$)/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    if (para.length) blocks.push(createElement("p", { key: key++ }, ...inline(para.join(" "))));
  }

  return blocks;
}

export function wordCount(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Escape helper kept for tests and plain-text extracts. */
export function plainText(markdown: string) {
  return escapeHtml(
    markdown
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#>*_`]/g, " "),
  );
}
