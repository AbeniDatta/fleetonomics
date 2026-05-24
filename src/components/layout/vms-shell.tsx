"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { mainNav } from "@/config/nav";
import { cn } from "@/lib/utils";
import { FooterBar } from "./footer-bar";
import { Button } from "@/components/ui/button";

export function VmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = quickRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setQuickOpen(false);
    }
    if (!quickOpen) return;
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [quickOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-vms-canvas font-sans text-zinc-200">
      <header
        className="relative overflow-hidden border-b text-[var(--nlng-header-text)] shadow-[0_4px_20px_-8px_rgba(0,32,96,0.15)]"
        style={{
          borderColor: "var(--nlng-header-border)",
          background: "linear-gradient(135deg, var(--nlng-header-bg) 0%, var(--nlng-header-bg-end) 100%)",
        }}
      >
        <div
          className="h-1 w-full shrink-0"
          style={{ background: "var(--nlng-header-gradient)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_70%_80%_at_0%_-20%,rgba(0,174,239,0.06),transparent_55%),radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(141,198,63,0.05),transparent_50%)]"
          aria-hidden
        />

        <div className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8 md:py-3.5">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="rounded-lg border px-2.5 py-1.5 shadow-sm"
              style={{
                borderColor: "var(--nlng-header-border)",
                backgroundColor: "var(--nlng-header-surface)",
              }}
            >
              <Image
                src="/brand/nlng.png"
                alt="NLNG"
                priority
                className="h-6 w-auto md:h-7"
                width={120}
                height={28}
              />
            </div>
            <span className="hidden h-8 w-px sm:block" style={{ backgroundColor: "var(--nlng-header-border)" }} aria-hidden />
            <div className="flex items-center gap-2.5 md:gap-3">
              <div
                className="flex items-center justify-center rounded-lg border px-2 py-1 shadow-sm"
                style={{
                  borderColor: "var(--nlng-header-border)",
                  backgroundColor: "var(--nlng-header-surface)",
                }}
              >
                <Image
                  src="/brand/fleetonomics.png"
                  alt="Fleetonomics"
                  priority
                  className="h-7 w-auto md:h-8"
                  width={160}
                  height={36}
                />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight tracking-tight text-[var(--nlng-header-text)]">
                  Fleetonomics
                </div>
                <div className="text-xs font-medium text-nlng-green">Smart Fleet Management</div>
              </div>
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-2.5 text-sm md:gap-3">
            <div className="relative" ref={quickRef}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border-[var(--nlng-header-border)] bg-[var(--nlng-header-surface)] text-[var(--nlng-header-text)] shadow-sm hover:border-nlng-cyan/30 hover:bg-[#e8eef4]"
                aria-haspopup="menu"
                aria-expanded={quickOpen}
                onClick={() => setQuickOpen((v) => !v)}
              >
                Quick actions ▾
              </Button>
              {quickOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border shadow-xl shadow-nlng-navy/10"
                  style={{
                    borderColor: "var(--nlng-header-border)",
                    backgroundColor: "var(--nlng-header-surface)",
                  }}
                >
                  <div className="bg-gradient-to-r from-nlng-green/10 via-nlng-lime/10 to-nlng-cyan/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--nlng-header-text)]/70">
                    Create
                  </div>
                  <div className="px-2 pb-2 pt-1">
                    {[
                      { href: "/drivers", label: "Add driver" },
                      { href: "/vehicles", label: "Add vehicle" },
                      { href: "/geo-fencing#live-fleet-map", label: "Create geofence" },
                      { href: "/geo-fencing#live-fleet-map", label: "Add map marker" },
                    ].map((a) => (
                      <Link
                        key={a.label}
                        href={a.href}
                        role="menuitem"
                        onClick={() => setQuickOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-[var(--nlng-header-text)]/90 transition hover:bg-[#e2e9f0]"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                  <div className="h-px" style={{ backgroundColor: "var(--nlng-header-border)" }} />
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--nlng-header-text)]/70">
                    Jump to
                  </div>
                  <div className="px-2 pb-2 pt-1">
                    {[
                      { href: "/safety", label: "Current active alarms" },
                      { href: "/fuel", label: "Fuel reports" },
                      { href: "/geo-fencing", label: "Geo Fencing" },
                    ].map((a) => (
                      <Link
                        key={a.label}
                        href={a.href}
                        role="menuitem"
                        onClick={() => setQuickOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-[var(--nlng-header-text)]/90 transition hover:bg-[#e2e9f0]"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className="rounded-lg border px-3 py-1.5 text-sm font-medium md:px-3.5"
              style={{
                borderColor: "var(--nlng-header-border)",
                backgroundColor: "rgba(0, 32, 96, 0.06)",
                color: "var(--nlng-header-text)",
              }}
            >
              {data?.user?.name ?? "Ops Manager"}
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-nlng-navy text-white shadow-sm hover:bg-nlng-nav"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <nav className="flex gap-0 overflow-x-auto border-b border-nlng-lime/30 bg-nlng-nav px-1 shadow-[inset_0_1px_0_0_rgba(141,198,63,0.15)] scrollbar-none md:px-3">
        {mainNav.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors md:px-4 md:py-3.5 md:text-[0.9375rem]",
                active
                  ? "text-white"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white/90",
              )}
            >
              {active ? (
                <span
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-nlng-lime via-nlng-lime to-nlng-cyan md:inset-x-3"
                  aria-hidden
                />
              ) : null}
              <span className={cn("relative", active && "text-nlng-lime")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto w-full max-w-[1920px] flex-1 px-5 py-6 md:px-10 md:py-8">{children}</main>
      <FooterBar />
    </div>
  );
}
