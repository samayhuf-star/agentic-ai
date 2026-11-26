import { backfillSystemEvents } from "../lib/activity/backfill";
import { prisma } from "../lib/prisma";

async function main() {
  const started = Date.now();
  await backfillSystemEvents();
  const count = await prisma.systemEvent.count();
  console.log(`Activity log backfill done in ${Date.now() - started}ms. ${count} events.`);
}

main()
  .catch((error) => {
    console.error("activity backfill failed", error);
    process.exitCode = 0; // do not block process start
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
