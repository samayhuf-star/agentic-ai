import { PrismaClient } from "@prisma/client";
import { agents } from "../data/agents";

const prisma = new PrismaClient();

async function main() {
  for (const [index, agent] of agents.entries()) {
    const data = {
      name: agent.name,
      role: agent.role,
      department: agent.department,
      blurb: agent.blurb,
      color: agent.color,
      goals: agent.goals.join(","),
      sort: index,
    };
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: data,
      create: { id: agent.id, ...data },
    });
  }
  console.log(`Seeded ${agents.length} agents.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
