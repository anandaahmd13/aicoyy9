import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getApiKeysByOwner } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";

// Self-scoped key tracker for members. userId comes from the JWT only.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
    if (!session?.userId) return NextResponse.json({ keys: [] });

    const now = Date.now();
    const keys = (await getApiKeysByOwner(session.userId)).map((k) => ({
      id: k.id,
      name: k.name,
      isActive: k.isActive,
      createdAt: k.createdAt,
      tokenLimit: k.tokenLimit,
      tokensUsed: k.tokensUsed,
      remainingTokens: k.tokenLimit != null ? Math.max(0, k.tokenLimit - k.tokensUsed) : null,
      expiresAt: k.expiresAt,
      remainingDays: k.expiresAt ? Math.ceil((new Date(k.expiresAt).getTime() - now) / 86400000) : null,
    }));
    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Error fetching member keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}
