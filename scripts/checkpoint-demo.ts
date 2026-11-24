import { prisma } from "../lib/prisma";
import { encryptSecret } from "../lib/encryption";
import { hashSecret, randomToken } from "../lib/crypto";
import { assembleTeam, ensureTeam } from "../lib/team";
import fs from "node:fs";

const emails = ["mid@checkpoint.test", "ready@checkpoint.test", "nokey@checkpoint.test"];

async function openSession(email: string, userId: string) {
  const token = randomToken();
  await prisma.session.create({
    data: { tokenHash: hashSecret(token), email, userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  return token;
}

async function main() {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  const mid = await prisma.user.create({
    data: { email: emails[0], phone: "+919811100001" },
  });
  await ensureTeam(mid.id);

  const ready = await prisma.user.create({
    data: {
      email: emails[1],
      phone: "+919811100002",
      businessName: "Chai and Co",
      sells: "masala chai",
      goal: "posts",
      onboardedAt: new Date(),
    },
  });
  await assembleTeam(ready.id, "posts", { applyEnabled: true });
  await prisma.userAgent.update({ where: { userId_agentId: { userId: ready.id, agentId: "ayaan" } }, data: { pinned: true, sortOrder: 0, enabled: true } });
  await prisma.userAgent.update({ where: { userId_agentId: { userId: ready.id, agentId: "mira" } }, data: { pinned: true, sortOrder: 1, enabled: true } });
  await prisma.userAgent.update({ where: { userId_agentId: { userId: ready.id, agentId: "zoya" } }, data: { pinned: false, sortOrder: 0, enabled: true, lastReadAt: new Date(Date.now() - 60 * 60 * 1000) } });
  await prisma.message.create({
    data: { userId: ready.id, agentId: "zoya", role: "agent", body: "A customer asked about tomorrow's hours.", createdAt: new Date() },
  });
  await prisma.approval.create({
    data: {
      userId: ready.id,
      agentId: "arjun",
      status: "pending",
      title: "Arjun has a starting idea",
      detail: "Nothing goes out, and no money is spent, until you tap yes.",
    },
  });
  await prisma.message.createMany({
    data: [
      { userId: ready.id, agentId: "ayaan", role: "user", body: "What should we say this week?" },
      {
        userId: ready.id,
        agentId: "ayaan",
        role: "agent",
        body: "Mock reply for this screenshot. I am Ayaan. Nothing goes out, and no money is spent, until you say yes.",
      },
    ],
  });
  const sealed = encryptSecret("sk-test-dummy");
  await prisma.userAiKey.create({
    data: {
      userId: ready.id,
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      ...sealed,
      keyLast4: "ummy",
      isValid: true,
      lastTestedAt: new Date(),
    },
  });

  const nokey = await prisma.user.create({
    data: {
      email: emails[2],
      phone: "+919811100003",
      businessName: "Night stall",
      sells: "snacks",
      goal: "replies",
      onboardedAt: new Date(),
    },
  });
  await assembleTeam(nokey.id, "replies", { applyEnabled: true });

  const tokens = {
    mid: await openSession(emails[0], mid.id),
    ready: await openSession(emails[1], ready.id),
    nokey: await openSession(emails[2], nokey.id),
  };
  fs.writeFileSync("/tmp/cp1-tokens.json", JSON.stringify(tokens));
  console.log("checkpoint demo ready");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "demo seed failed");
    await prisma.$disconnect();
    process.exit(1);
  });
