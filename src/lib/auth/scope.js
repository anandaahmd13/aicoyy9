import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getApiKeysByOwner } from "@/lib/db/index.js";

// Server-derived request scope. Client-supplied key lists are NEVER trusted:
// member keys come from the JWT userId → getApiKeysByOwner only.
// Returns { role, userId, apiKeys } — apiKeys is undefined for admin (no filter).
export async function getSessionScope() {
  const cookieStore = await cookies();
  const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
  const role = session?.role || null;

  if (role === "member" && session?.userId) {
    const keys = await getApiKeysByOwner(session.userId);
    return { role, userId: session.userId, apiKeys: keys.map((k) => k.key) };
  }
  return { role: role || "admin", apiKeys: undefined };
}
