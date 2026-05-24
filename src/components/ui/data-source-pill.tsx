"use client";

import { Badge } from "@/components/ui/badge";

export function DataSourcePill({
  source,
  uctrackingLabel = "real data",
}: {
  source?: string;
  /** Shown when `source` is uctracking (default used across the app except where overridden). */
  uctrackingLabel?: string;
}) {
  const s = (source ?? "unknown").toLowerCase();
  if (s === "uctracking") return <Badge variant="success">{uctrackingLabel}</Badge>;
  if (s === "mock") return <Badge variant="warn">mock data</Badge>;
  if (s === "demo") return <Badge variant="warn">mock data</Badge>;
  if (s === "error") return <Badge variant="danger">api error</Badge>;
  if (s === "missing") return <Badge variant="purple">not configured</Badge>;
  return <Badge variant="info">{source ?? "unknown"}</Badge>;
}

