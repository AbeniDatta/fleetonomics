"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  title: string;
  endpoint: string;
  description?: string;
  defaultParams?: Record<string, string>;
  autoRun?: boolean;
};

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function ApiConsole({ title, endpoint, description, defaultParams, autoRun }: Props) {
  const initial = useMemo(() => defaultParams ?? {}, [defaultParams]);
  const [params, setParams] = useState<Record<string, string>>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const keys = useMemo(() => {
    const set = new Set<string>(Object.keys(initial));
    for (const k of Object.keys(params)) set.add(k);
    return Array.from(set);
  }, [initial, params]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v == null) continue;
        const trimmed = String(v).trim();
        if (!trimmed) continue;
        qs.set(k, trimmed);
      }
      const url = qs.toString() ? `${endpoint}?${qs.toString()}` : endpoint;
      const res = await fetch(url);
      const text = await res.text();
      const parsed = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })();
      if (!res.ok) throw new Error(typeof parsed === "string" ? parsed : safeJson(parsed));
      setResult(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // optional autorun on mount (useful for read-only endpoints)
  useState(() => {
    if (autoRun) void run();
    return null;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <div className="text-sm text-zinc-400 md:text-base">{description}</div> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {keys.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {keys.map((k) => (
              <div key={k} className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 md:text-sm">{k}</div>
                <Input
                  value={params[k] ?? ""}
                  onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))}
                  placeholder="(optional)"
                  className="bg-vms-inset"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-500 md:text-base">No parameters</div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={run} disabled={loading} className="md:h-10 md:text-base">
            {loading ? "Running…" : "Run"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setParams(initial);
              setResult(null);
              setError(null);
            }}
            disabled={loading}
            className="md:h-10 md:text-base"
          >
            Reset
          </Button>
          <span className="text-xs text-zinc-500 md:text-sm">{endpoint}</span>
        </div>
        {error ? <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        <pre className="max-h-[360px] overflow-auto rounded-lg bg-black/30 p-3 text-[11px] text-zinc-200 md:text-xs">
          {safeJson(result)}
        </pre>
      </CardContent>
    </Card>
  );
}

