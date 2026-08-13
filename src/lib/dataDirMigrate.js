import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// One-time copy of the legacy ~/.9router data dir into ~/.aicoyy.
// Self-contained (does NOT import dataDir.js — DATA_DIR is frozen at module-eval,
// so this must run before that module is first imported at bootstrap).
// Copy-not-move: the old dir is left intact as a rollback. Marker-guarded → idempotent.
export async function migrateLegacyDataDir() {
  try {
    if (process.env.DATA_DIR) return;
    const isWin = process.platform === "win32";
    const oldDir = isWin
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "9router")
      : path.join(os.homedir(), ".9router");
    const newDir = isWin
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "aicoyy")
      : path.join(os.homedir(), ".aicoyy");

    if (!fs.existsSync(oldDir)) return;
    // Never clobber a non-empty destination.
    if (fs.existsSync(newDir) && fs.readdirSync(newDir).length > 0) return;

    // Whole-tree copy brings data.sqlite + -wal + -shm together atomically enough.
    fs.cpSync(oldDir, newDir, { recursive: true });
    fs.writeFileSync(path.join(newDir, ".migrated-from-9router"), new Date().toISOString());
    console.log(`[migrate] copied legacy data dir ${oldDir} → ${newDir}`);
  } catch (e) {
    console.warn(`[migrate] legacy data-dir copy failed (continuing): ${e.message}`);
  }
}
