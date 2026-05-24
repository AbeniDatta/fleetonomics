"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2, MapPin, Shield, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 border-vms-border/80 bg-vms-inset/90 text-zinc-100 shadow-inner placeholder:text-zinc-500 focus-visible:ring-nlng-cyan/40 md:h-12 [&:-webkit-autofill]:[-webkit-text-fill-color:#e4e4e7] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#252529_inset]";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[26rem]">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex items-center gap-2.5 rounded-xl border border-vms-border/80 bg-vms-elevated/80 px-3 py-2 shadow-lg backdrop-blur-sm">
          <Image src="/brand/nlng.png" alt="Nigeria LNG" priority className="h-7 w-auto" width={120} height={28} />
          <span className="h-6 w-px bg-vms-border" aria-hidden />
          <Image src="/brand/fleetonomics.png" alt="Fleetonomics" priority className="h-7 w-auto" width={140} height={28} />
        </div>
      </div>

      <div className="mb-8 lg:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-[1.75rem]">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Access your fleet dashboard, live tracking, and safety reports.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full bg-gradient-to-r from-nlng-navy to-nlng-cyan text-base font-semibold text-white shadow-lg shadow-nlng-cyan/10 hover:from-nlng-navy/95 hover:to-nlng-cyan/90 md:h-[3.25rem]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  );
}

const highlights = [
  { icon: Truck, label: "Live fleet & fuel monitoring" },
  { icon: MapPin, label: "Geofencing & trip history" },
  { icon: Shield, label: "ADAS / DMS safety alerts" },
] as const;

function LoginFallback() {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin text-nlng-cyan" aria-hidden />
      Loading…
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-vms-canvas text-zinc-200">
      <div
        className="h-1 w-full shrink-0"
        style={{ background: "var(--nlng-header-gradient)" }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_-10%,rgba(0,174,239,0.12),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(0,104,55,0.1),transparent_50%)]"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col lg:flex-row">
        <aside className="relative hidden overflow-hidden border-r border-vms-border/60 bg-gradient-to-br from-nlng-navy via-[#001a4d] to-[#0a1628] lg:flex lg:w-[min(44%,520px)] lg:flex-col lg:justify-between lg:px-12 lg:py-14 xl:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(0,174,239,0.25),transparent_60%),radial-gradient(ellipse_50%_50%_at_100%_100%,rgba(141,198,63,0.15),transparent_55%)]"
            aria-hidden
          />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-xl backdrop-blur-sm">
                <Image src="/brand/nlng.png" alt="Nigeria LNG" priority className="h-8 w-auto brightness-110" width={140} height={36} />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-xl backdrop-blur-sm">
                <Image
                  src="/brand/fleetonomics.png"
                  alt="Fleetonomics"
                  priority
                  className="h-8 w-auto"
                  width={180}
                  height={36}
                />
              </div>
            </div>

            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-nlng-cyan/90">Fleetonomics</p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white xl:text-[2rem]">
              Vehicle Management System
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-sky-100/70">
              Unified operations for Nigeria LNG fleet visibility, compliance, and driver safety.
            </p>
          </div>

          <ul className="relative mt-12 space-y-4">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-sky-100/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-nlng-cyan">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 md:py-16 lg:px-12 xl:px-16">
          <div
            className={cn(
              "mx-auto w-full max-w-[26rem] rounded-2xl border border-vms-border/80 bg-vms-elevated/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-md",
              "sm:p-10 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
            )}
          >
            <Suspense fallback={<LoginFallback />}>
              <LoginForm />
            </Suspense>
          </div>
        </main>
      </div>

      <footer className="relative border-t border-vms-border/60 px-6 py-4 text-center text-xs text-zinc-500 sm:text-left md:px-10">
        <span>© Nigeria LNG · Fleetonomics</span>
        <span className="mx-2 hidden text-zinc-700 sm:inline" aria-hidden>
          ·
        </span>
        <span className="mt-1 block font-medium text-zinc-400 sm:mt-0 sm:inline">Vehicle Management System</span>
      </footer>
    </div>
  );
}
