import { ArchDiagram, FlowDiagram } from "@/components/agent-types/Diagrams";
import { Inline } from "@/components/agent-types/Inline";
import type { AgentDoc } from "@/lib/agent-types/compose";

export function DocBody({ doc }: { doc: AgentDoc }) {
  return (
    <>
      {doc.blocks.map((block, index) => {
        switch (block.t) {
          case "h2":
            return (
              <h2 key={index} id={block.id}>
                {block.text}
              </h2>
            );
          case "h3":
            return <h3 key={index}>{block.text}</h3>;
          case "p":
            return (
              <p key={index}>
                <Inline text={block.text} />
              </p>
            );
          case "note":
            return (
              <p key={index} className="aa-note">
                <Inline text={block.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div key={index} className="aa-table-wrap">
                <table className="mk-table aa-table">
                  <caption>{block.caption}</caption>
                  <thead>
                    <tr>
                      {block.head.map((cell) => (
                        <th key={cell} scope="col">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) =>
                          c === 0 ? (
                            <th key={c} scope="row">
                              <Inline text={cell} />
                            </th>
                          ) : (
                            <td key={c}>
                              <Inline text={cell} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <figure key={index} className="aa-code">
                <figcaption>{block.label}</figcaption>
                <pre>
                  <code>{block.text}</code>
                </pre>
              </figure>
            );
          case "arch":
            return (
              <figure key={index} className="aa-figure">
                <ArchDiagram page={doc.page} />
                <figcaption>Architecture of {doc.page.name}: trigger, model, memory, knowledge, tools and human approval.</figcaption>
              </figure>
            );
          case "flow":
            return (
              <figure key={index} className="aa-figure">
                <FlowDiagram page={doc.page} />
                <figcaption>Example workflow, step by step.</figcaption>
              </figure>
            );
          case "shot":
            return (
              <figure key={index} className="aa-figure aa-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt} width={block.width} height={block.height} loading="lazy" decoding="async" />
                <figcaption>{block.caption}</figcaption>
              </figure>
            );
          case "faq":
            return (
              <div key={index} className="aa-faq">
                {block.items.map(([q, a]) => (
                  <section key={q}>
                    <h3>{q}</h3>
                    <p>{a}</p>
                  </section>
                ))}
              </div>
            );
          case "sources":
            return (
              <ol key={index} className="aa-sources">
                {block.items.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} rel="noopener" target="_blank">
                      {s.title}
                    </a>{" "}
                    — {s.publisher}
                  </li>
                ))}
              </ol>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
