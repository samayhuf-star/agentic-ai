import type { AgentPage } from "@/lib/agent-types/data";
import { shortTool } from "@/lib/agent-types/compose";

function wrap(text: string, max: number, lines: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const word of words) {
    if ((cur + " " + word).trim().length > max) {
      out.push(cur.trim());
      cur = word;
      if (out.length === lines) break;
    } else cur = `${cur} ${word}`;
  }
  if (out.length < lines && cur.trim()) out.push(cur.trim());
  const joined = out.join(" ");
  if (joined.length < text.trim().length && out.length) out[out.length - 1] = out[out.length - 1].replace(/[,.;:]?$/, "…");
  return out.slice(0, lines);
}

function Box({ x, y, w, h, title, lines, accent = false }: { x: number; y: number; w: number; h: number; title: string; lines: string[]; accent?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={accent ? "#1b2410" : "#10161b"} stroke={accent ? "#c8f25a" : "#33404a"} strokeWidth={accent ? 2 : 1.2} />
      <text x={x + 12} y={y + 22} fill={accent ? "#c8f25a" : "#eef2f0"} fontSize={13} fontWeight={700}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={x + 12} y={y + 41 + i * 16} fill="#a9b4ae" fontSize={11.5}>
          {line}
        </text>
      ))}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6b7a73" strokeWidth={1.5} markerEnd="url(#aa-arrow)" />;
}

const CENTER: Record<string, { title: string; chips: (page: AgentPage) => string[] }> = {
  "tool-agent": { title: "LLM agent loop", chips: () => ["Reason about the request", "Call a tool, read result", "Repeat or hand off"] },
  router: { title: "LLM router", chips: () => ["Classify + confidence", "Pick a route", "Low confidence → person"] },
  pipeline: { title: "LLM pipeline", chips: (p) => p.fn.flow.slice(1, 4).map((s) => wrap(s, 30, 1)[0]) },
  "multi-agent": { title: "Planner + specialists", chips: () => ["Planner splits the goal", "Specialists do sub-tasks", "Reviewer checks output"] },
  voice: { title: "Real-time voice loop", chips: () => ["Speech-to-text", "LLM with tools", "Text-to-speech"] },
};

export function ArchDiagram({ page }: { page: AgentPage }) {
  const { fn, ind } = page;
  const center = CENTER[fn.pattern] ?? CENTER["tool-agent"];
  const tools = [...(ind ? [shortTool(ind.systems[0])] : []), ...fn.tools.map(shortTool)].slice(0, 4);
  const knowledge = (ind ? [ind.data[0], fn.data[0]] : fn.data.slice(0, 2)).map((d) => wrap(d, 30, 1)[0]);
  const titleId = `arch-${page.slug}`;
  return (
    <svg viewBox="0 0 720 430" role="img" aria-labelledby={`${titleId}-t ${titleId}-d`} style={{ width: "100%", height: "auto", display: "block" }}>
      <title id={`${titleId}-t`}>{`Architecture of ${page.name}`}</title>
      <desc id={`${titleId}-d`}>{`Trigger: ${fn.flow[0]}. Core: ${center.title}. Tools: ${tools.join(", ")}. Knowledge: ${knowledge.join(", ")}. Memory and a human approval step before anything is sent or committed.`}</desc>
      <defs>
        <marker id="aa-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#6b7a73" />
        </marker>
      </defs>
      <rect x={0} y={0} width={720} height={430} rx={18} fill="#0b0f12" />
      <Box x={16} y={150} w={160} h={110} title="Trigger" lines={wrap(fn.flow[0], 22, 4)} />
      <Box x={250} y={20} w={220} h={78} title="Memory" lines={wrap(fn.memory, 32, 2)} />
      <Box x={250} y={130} w={220} h={150} title={center.title} lines={[]} accent />
      {center.chips(page).map((chip, i) => (
        <g key={i}>
          <rect x={264} y={166 + i * 34} width={192} height={26} rx={8} fill="#0e1216" stroke="#3d4a2a" />
          <text x={274} y={183 + i * 34} fill="#dfe8c8" fontSize={11.5}>
            {chip}
          </text>
        </g>
      ))}
      <Box x={250} y={312} w={220} h={98} title="Knowledge (RAG)" lines={knowledge} />
      <Box x={544} y={110} w={160} h={44 + tools.length * 16} title="Tools" lines={tools.map((t) => wrap(t, 22, 1)[0])} />
      <Box x={544} y={290} w={160} h={100} title="Human approval" lines={wrap(fn.hitl, 22, 3)} />
      <Arrow x1={176} y1={205} x2={248} y2={205} />
      <Arrow x1={360} y1={98} x2={360} y2={128} />
      <Arrow x1={360} y1={310} x2={360} y2={282} />
      <Arrow x1={470} y1={180} x2={542} y2={150} />
      <Arrow x1={470} y1={250} x2={542} y2={320} />
    </svg>
  );
}

export function FlowDiagram({ page }: { page: AgentPage }) {
  const steps = page.fn.flow;
  const h = steps.length * 74 + 8;
  const id = `flow-${page.slug}`;
  return (
    <svg viewBox={`0 0 680 ${h}`} role="img" aria-labelledby={`${id}-t`} style={{ width: "100%", height: "auto", display: "block" }}>
      <title id={`${id}-t`}>{`Workflow of ${page.name}: ${steps.join(" → ")}`}</title>
      <defs>
        <marker id="aa-arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#6b7a73" />
        </marker>
      </defs>
      {steps.map((step, i) => {
        const y = 4 + i * 74;
        const lines = wrap(step, 78, 2);
        const last = i === steps.length - 1;
        return (
          <g key={i}>
            <rect x={4} y={y} width={672} height={52} rx={12} fill={last ? "#1b2410" : "#10161b"} stroke={last ? "#c8f25a" : "#33404a"} />
            <circle cx={32} cy={y + 26} r={14} fill="#c8f25a" />
            <text x={32} y={y + 31} textAnchor="middle" fill="#0b0f12" fontSize={13} fontWeight={800}>
              {i + 1}
            </text>
            {lines.map((line, j) => (
              <text key={j} x={58} y={y + (lines.length === 1 ? 31 : 23 + j * 16)} fill="#eef2f0" fontSize={13}>
                {line}
              </text>
            ))}
            {!last ? <line x1={32} y1={y + 52} x2={32} y2={y + 72} stroke="#6b7a73" strokeWidth={1.5} markerEnd="url(#aa-arrow2)" /> : null}
          </g>
        );
      })}
    </svg>
  );
}
