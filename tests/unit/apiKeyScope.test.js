import { describe, it, expect } from "vitest";
import { scopeDecision } from "@/sse/services/auth.js";

// Pure per-key scope decision. null = allowed; { status, message } = denied.
describe("scopeDecision", () => {
  const scopes = { providers: { kiro: ["claude-opus-4.8"], openrouter: [] } };

  it("allows everything when scopes is null (unrestricted)", () => {
    expect(scopeDecision(null, "kiro", "anything")).toBeNull();
    expect(scopeDecision(undefined, "openai", "gpt-4o")).toBeNull();
  });

  it("allows an in-scope provider + model", () => {
    expect(scopeDecision(scopes, "kiro", "claude-opus-4.8")).toBeNull();
  });

  it("tolerates dash version from client (claude-opus-4-8 ↔ 4.8)", () => {
    expect(scopeDecision(scopes, "kiro", "claude-opus-4-8")).toBeNull();
  });

  it("resolves provider alias to id (kr → kiro)", () => {
    expect(scopeDecision(scopes, "kr", "claude-opus-4.8")).toBeNull();
  });

  it("denies an out-of-scope model on an allowed provider", () => {
    const r = scopeDecision(scopes, "kiro", "claude-sonnet-4.5");
    expect(r?.status).toBe(403);
  });

  it("denies a provider not listed at all", () => {
    const r = scopeDecision(scopes, "openai", "gpt-4o");
    expect(r?.status).toBe(403);
  });

  it("empty model array means all models of that provider are allowed", () => {
    expect(scopeDecision(scopes, "openrouter", "deepseek-3.2")).toBeNull();
    expect(scopeDecision(scopes, "openrouter", "any-other-model")).toBeNull();
  });
});
