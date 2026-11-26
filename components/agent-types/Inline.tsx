import Link from "next/link";
import { Fragment } from "react";

/** Renders [label](url) links and **bold** from dataset text. External links open normally with rel=noopener. */
export function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    if (m[1]) {
      const href = m[2];
      parts.push(
        href.startsWith("/") ? (
          <Link key={i++} href={href}>
            {m[1]}
          </Link>
        ) : (
          <a key={i++} href={href} rel="noopener" target="_blank">
            {m[1]}
          </a>
        ),
      );
    } else parts.push(<strong key={i++}>{m[3]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}
