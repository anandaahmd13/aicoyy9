import { NextResponse } from "next/server";
import { getRecentLogs } from "@/lib/usageDb";
import { getSessionScope } from "@/lib/auth/scope";

export async function GET() {
  try {
    const { apiKeys } = await getSessionScope();
    const logs = await getRecentLogs(200, { apiKeys });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
