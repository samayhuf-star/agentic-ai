import fs from "node:fs";
import path from "node:path";
import { Landing } from "@/components/landing/Landing";
import { publicConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const html = fs.readFileSync(path.join(process.cwd(), "components/landing/body.html"), "utf8");
  return <Landing html={html} config={publicConfig()} />;
}
