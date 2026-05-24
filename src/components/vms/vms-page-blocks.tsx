"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type VmsLocationFilter = "all" | "CHO" | "Bonny";

export function VmsBackBar({ right }: { right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      {right}
    </div>
  );
}

export function VmsPageHero({
  icon: Icon,
  title,
  description,
  meta,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nlng-amber/15 text-nlng-amber">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="vms-page-title">{title}</h1>
          {description?.trim() ? <p className="vms-page-lead">{description}</p> : null}
        </div>
      </div>
      {meta ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2 text-sm text-zinc-400">{meta}</div> : null}
    </div>
  );
}

export function VmsLocationToggle({
  value,
  onChange,
}: {
  value: VmsLocationFilter;
  onChange: (v: VmsLocationFilter) => void;
}) {
  const items: { id: VmsLocationFilter; label: string }[] = [
    { id: "all", label: "All Locations" },
    { id: "CHO", label: "CHO" },
    { id: "Bonny", label: "Bonny" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-vms-border bg-vms-inset/60 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors md:px-4 md:py-2",
            value === item.id ? "bg-nlng-amber text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function VmsStatCard({
  label,
  value,
  sub,
  subTone = "neutral",
  trend,
  trendTone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  subTone?: "good" | "bad" | "neutral";
  trend?: string;
  trendTone?: "good" | "bad" | "neutral";
  icon: ComponentType<{ className?: string }>;
}) {
  const subClass =
    subTone === "good" ? "text-emerald-400" : subTone === "bad" ? "text-red-400" : "text-zinc-400";
  const trendClass =
    trendTone === "good" ? "text-emerald-400" : trendTone === "bad" ? "text-red-400" : "text-zinc-400";
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-nlng-amber/15 text-nlng-amber">
        <Icon className="h-5 w-5" />
      </div>
      <CardContent className="space-y-1.5 pt-1">
        <div className="vms-stat-label">{label}</div>
        <div className="vms-stat-value">{value}</div>
        <div className={cn("vms-stat-meta", subClass)}>{sub}</div>
        {trend ? <div className={cn("vms-stat-meta", trendClass)}>{trend}</div> : null}
      </CardContent>
    </Card>
  );
}
