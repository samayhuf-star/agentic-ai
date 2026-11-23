import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const args = process.argv.slice(2);
const push = args.includes("--push");
const seed = args.includes("--seed");
const divider = args.indexOf("--");
const command = divider === -1 ? [] : args.slice(divider + 1);

if (command.length === 0) {
  console.error("Usage: node scripts/with-local-db.mjs [--push] [--seed] -- <command>");
  process.exit(1);
}

function loadEnvFile() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile();

const LOCAL_PORT = 54329;
const LOCAL_URL = `postgresql://postgres:postgres@127.0.0.1:${LOCAL_PORT}/postgres?sslmode=disable&pgbouncer=true`;

function wantsLocal(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname === "127.0.0.1" && parsed.port === String(LOCAL_PORT);
  } catch {
    return false;
  }
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function startPglite() {
  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
  const dir = path.join(process.cwd(), ".local-pg");
  fs.mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(dir);
  const server = new PGLiteSocketServer({ db, port: LOCAL_PORT, host: "127.0.0.1" });
  await server.start();
  console.log(`Local database ready on ${LOCAL_URL}`);
  return async () => {
    await server.stop();
    await db.close();
  };
}

function run(parts) {
  return new Promise((resolve) => {
    const child = spawn(parts[0], parts.slice(1), { stdio: "inherit", env: process.env });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

let stop = async () => {};
if (wantsLocal(process.env.DATABASE_URL)) {
  process.env.DATABASE_URL = LOCAL_URL;
  if (!(await portOpen(LOCAL_PORT))) stop = await startPglite();
  else console.log(`Using the database already on port ${LOCAL_PORT}`);
}

let code = 0;
try {
  if (push) {
    code = await run(["npx", "prisma", "generate"]);
    if (code !== 0) process.exit(code);
    code = await run(["npx", "prisma", "migrate", "deploy"]);
    if (code !== 0) process.exit(code);
  }
  if (seed) {
    code = await run(["npx", "tsx", "prisma/seed.ts"]);
    if (code !== 0) process.exit(code);
  }
  code = await run(command);
} finally {
  await stop();
}
process.exit(code);
