export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Must run before any module reads DATA_DIR (frozen at module-eval).
    const { migrateLegacyDataDir } = await import("@/lib/dataDirMigrate");
    await migrateLegacyDataDir();
    const { initConsoleLogCapture } = await import("@/lib/consoleLogBuffer");
    initConsoleLogCapture();
  }
}
