const appendedReassurance =
  /\s*(?:This is only a suggestion\.\s*)?Nothing goes out, and no money is spent, until you tap yes\.?\s*$/i;

export function hasReassurance(text: string) {
  return /nothing goes out|until you (?:say|tap) yes|without your yes|after your yes|your yes|no (?:budget change|money moves|ad spend)|sends none|sends nothing|orders nothing|posts nothing|they wait for your yes|it waits for your yes/i.test(
    text,
  );
}

export function approvalDetail(agent: { name: string; role: string; blurb: string }, shop: string, sells: string) {
  const name = shop.trim();
  const work = sells.trim();
  const help = name && work ? `can help ${name} with ${work}` : name ? `can help ${name}` : work ? `can help with ${work}` : "can help";
  const body = `${agent.name}, your ${agent.role.toLowerCase()}, ${help}. ${agent.blurb}`;
  if (hasReassurance(agent.blurb)) return body;
  return `${body} This is only a suggestion. Nothing goes out, and no money is spent, until you tap yes.`;
}

export function oneReassurance(detail: string) {
  const match = detail.match(appendedReassurance);
  if (!match || match.index == null) return detail;
  const before = detail.slice(0, match.index).trim();
  if (hasReassurance(before)) return before;
  return detail.trim();
}
