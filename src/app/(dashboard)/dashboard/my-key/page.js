"use client";

import { useState, useEffect } from "react";
import { Card, CardSkeleton } from "@/shared/components";

function Bar({ used, limit }) {
  if (limit == null) return null;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const danger = pct >= 90;
  return (
    <div className="w-full h-2 rounded-full bg-bg-subtle overflow-hidden mt-2">
      <div className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MyKeyPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/keys")
      .then((res) => (res.ok ? res.json() : { keys: [] }))
      .then((data) => setKeys(data.keys || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">key</span>
        My API Keys
      </h2>

      {keys.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted text-center py-8">No API keys assigned to your account yet. Ask your admin to assign one.</p>
        </Card>
      ) : (
        keys.map((k) => {
          const expired = k.expiresAt && new Date(k.expiresAt) < new Date();
          return (
            <Card key={k.id}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold">{k.name}</p>
                {!k.isActive ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-500">Paused</span>
                ) : expired ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-500">Expired</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Active</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-text-muted">Tokens remaining</p>
                  {k.tokenLimit == null ? (
                    <p className="text-lg font-semibold">Unlimited</p>
                  ) : (
                    <>
                      <p className="text-lg font-semibold">{k.remainingTokens.toLocaleString()}</p>
                      <p className="text-xs text-text-muted">{k.tokensUsed.toLocaleString()} / {k.tokenLimit.toLocaleString()} used</p>
                      <Bar used={k.tokensUsed} limit={k.tokenLimit} />
                    </>
                  )}
                </div>
                <div>
                  <p className="text-xs text-text-muted">Days remaining</p>
                  {k.expiresAt == null ? (
                    <p className="text-lg font-semibold">Never expires</p>
                  ) : (
                    <>
                      <p className={`text-lg font-semibold ${expired ? "text-red-500" : ""}`}>
                        {expired ? "Expired" : Math.max(0, k.remainingDays)}
                      </p>
                      <p className="text-xs text-text-muted">Expires {new Date(k.expiresAt).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
