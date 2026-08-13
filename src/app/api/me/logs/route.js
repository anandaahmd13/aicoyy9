import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getApiKeysByOwner } from "@/lib/db/index.js";
import { getRecentLogs } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

// Self-scoped request log for members, built from usageHistory filtered to their keys.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
    if (!session?.userId) return NextResponse.json([]);

    const keys = (await getApiKeysByOwner(session.userId)).map((k) => k.key);
    const logs = await getRecentLogs(200, { apiKeys: keys });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching member logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
