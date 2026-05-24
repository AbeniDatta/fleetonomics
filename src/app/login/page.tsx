"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <Card className="w-full max-w-lg border-vms-border shadow-2xl">
      <CardHeader>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Image src="/brand/nlng.png" alt="NLNG" priority className="h-7 w-auto" width={140} height={32} />
          <Image src="/brand/fleetonomics.png" alt="Fleetonomics" priority className="h-7 w-auto" width={180} height={32} />
        </div>
        <CardTitle className="text-xl md:text-2xl">Fleetonomics VMS</CardTitle>
        <p className="text-base text-zinc-400 md:text-lg">Sign in with your demo credentials from `.env.local`.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 md:text-base" htmlFor="email">
              Email
            </label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 md:text-base" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-400 md:text-base">{error}</p> : null}
          <Button type="submit" className="h-12 w-full text-base md:h-14 md:text-lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-vms-canvas p-8 md:p-10">
      <Suspense fallback={<div className="text-base text-zinc-400 md:text-lg">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
