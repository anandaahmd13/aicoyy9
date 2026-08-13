import { NextResponse } from "next/server";
import { getUsers, createUser, getApiKeys } from "@/lib/localDb";

export const dynamic = "force-dynamic";

// GET /api/users — list members with key counts (admin-only via middleware).
export async function GET() {
  try {
    const [users, keys] = await Promise.all([getUsers(), getApiKeys()]);
    const keyCount = {};
    for (const k of keys) if (k.ownerUserId) keyCount[k.ownerUserId] = (keyCount[k.ownerUserId] || 0) + 1;
    return NextResponse.json({ users: users.map((u) => ({ ...u, keyCount: keyCount[u.id] || 0 })) });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users — create member.
export async function POST(request) {
  try {
    const { username, password, role } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }
    const user = await createUser({ username, password, role });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status });
  }
}
