import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { resolveProviderId } from "@/shared/constants/providers.js";

// Normalize a scopes payload from the API: canonicalize provider alias→id keys,
// keep model arrays as-is. Returns null for empty/absent (= unrestricted).
export function normalizeScopes(scopes) {
  const providers = scopes?.providers;
  if (!providers || typeof providers !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(providers)) {
    const id = resolveProviderId(k) || k;
    out[id] = Array.isArray(v) ? v.filter((m) => typeof m === "string" && m.trim()) : [];
  }
  return Object.keys(out).length ? { providers: out } : null;
}

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
    ownerUserId: row.ownerUserId ?? null,
    tokenLimit: row.tokenLimit ?? null,
    tokensUsed: row.tokensUsed ?? 0,
    expiresAt: row.expiresAt ?? null,
    scopes: parseScopes(row.scopes),
  };
}

// Parse scopes JSON; fail-open to null so a bad blob never throws from validation.
function parseScopes(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

export async function getApiKeysByOwner(userId) {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys WHERE ownerUserId = ? ORDER BY createdAt ASC`, [userId]);
  return rows.map(rowToKey);
}

export async function createApiKey(name, machineId, opts = {}) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);
  const apiKey = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    createdAt: new Date().toISOString(),
    ownerUserId: opts.ownerUserId ?? null,
    tokenLimit: opts.tokenLimit ?? null,
    tokensUsed: 0,
    expiresAt: opts.expiresAt ?? null,
    scopes: opts.scopes ?? null,
  };
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt, ownerUserId, tokenLimit, tokensUsed, expiresAt, scopes) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [apiKey.id, apiKey.key, apiKey.name, apiKey.machineId, 1, apiKey.createdAt, apiKey.ownerUserId, apiKey.tokenLimit, 0, apiKey.expiresAt, apiKey.scopes ? JSON.stringify(apiKey.scopes) : null]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const merged = { ...rowToKey(row), ...data };
    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ?, ownerUserId = ?, tokenLimit = ?, tokensUsed = ?, expiresAt = ?, scopes = ? WHERE id = ?`,
      [merged.key, merged.name, merged.machineId, merged.isActive ? 1 : 0, merged.ownerUserId ?? null, merged.tokenLimit ?? null, merged.tokensUsed ?? 0, merged.expiresAt ?? null, merged.scopes ? JSON.stringify(merged.scopes) : null, id]
    );
    result = merged;
  });
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

// Rich status check — single SELECT. Reasons: invalid | inactive | expired | exhausted | null(ok).
export async function checkApiKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]);
  if (!row) return { ok: false, reason: "invalid" };

  const k = rowToKey(row);
  const now = Date.now();
  let reason = null;
  if (!k.isActive) reason = "inactive";
  else if (k.expiresAt && new Date(k.expiresAt).getTime() < now) reason = "expired";
  else if (k.tokenLimit != null && k.tokensUsed >= k.tokenLimit) reason = "exhausted";

  const remainingTokens = k.tokenLimit != null ? Math.max(0, k.tokenLimit - k.tokensUsed) : null;
  const remainingDays = k.expiresAt
    ? Math.ceil((new Date(k.expiresAt).getTime() - now) / 86400000)
    : null;

  return {
    ok: reason === null,
    reason,
    keyId: k.id,
    ownerUserId: k.ownerUserId,
    tokenLimit: k.tokenLimit,
    tokensUsed: k.tokensUsed,
    expiresAt: k.expiresAt,
    scopes: k.scopes,
    remainingTokens,
    remainingDays,
  };
}

export async function validateApiKey(key) {
  return (await checkApiKey(key)).ok;
}
