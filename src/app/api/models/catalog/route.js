import { buildModelsList } from "@/app/api/v1/models/route.js";

// GET /api/models/catalog - Session-authed model list for dashboard UI (e.g. the
// API-key Access scope picker). Mirrors /v1/models output but lives under /api/,
// so it's gated by dashboard login instead of `requireApiKey`. Without this the
// picker's /v1/models fetch 401s on remote domains when requireApiKey is on.
export async function GET() {
  try {
    const data = await buildModelsList(["llm"]);
    return Response.json({ object: "list", data });
  } catch (error) {
    console.log("Error building model catalog:", error);
    return Response.json(
      { error: { message: error.message, type: "server_error" } },
      { status: 500 }
    );
  }
}
