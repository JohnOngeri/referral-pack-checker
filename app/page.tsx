import fs from "node:fs";
import path from "node:path";
import Dashboard from "@/ui/Dashboard";
import type { DashboardData } from "@/ui/data";

export const dynamic = "force-dynamic";

function loadData(): DashboardData | null {
  const p = path.join(process.cwd(), "src", "data", "dashboard.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as DashboardData;
  } catch {
    return null;
  }
}

export default function Page() {
  return <Dashboard data={loadData()} />;
}
