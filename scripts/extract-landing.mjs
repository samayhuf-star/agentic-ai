import fs from "node:fs";

const html = fs.readFileSync(new URL("../design/boardroom-v3-final.html", import.meta.url), "utf8");
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error("style block missing");
let css = styleMatch[1].replace(
  "body{padding-bottom:84px}",
  "body:has(.landing-root){padding-bottom:84px}",
);
css += "\n.mdl .msg.err{background:rgba(255,110,110,.12);color:#ffb4b4}\n";
fs.writeFileSync(new URL("../app/landing.css", import.meta.url), css);

const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
if (!bodyMatch) throw new Error("body missing");
let body = bodyMatch[1].trim();
body = body.replace(
  '<button class="go" type="submit" id="siGo" style="margin-top:16px">Email me a code</button>',
  '<p class="msg" id="siMsg"></p>\n    <button class="go" type="submit" id="siGo" style="margin-top:16px">Email me a code</button>',
);
fs.writeFileSync(new URL("../components/landing/body.html", import.meta.url), body + "\n");

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
fs.writeFileSync("/tmp/landing-scripts.js", scripts);
console.log("css", css.length, "body", body.length, "js", scripts.length);
