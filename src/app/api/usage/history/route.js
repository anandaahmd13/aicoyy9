import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/usageDb";
import { getSessionScope } from "@/lib/auth/scope";

export async function GET() {
  try {
    const { apiKeys } = await getSessionScope();
    const stats = await getUsageStats("all", { scopeKeys: apiKeys });
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
