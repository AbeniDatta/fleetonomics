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
    <div className="flex min-h-screen flex-col bg-vms-canvas text-base text-zinc-100">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-nlng-blue px-5 py-3 text-white md:px-8 md:py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-white px-2.5 py-1">
            <Image
              src="/brand/nlng.png"
              alt="NLNG"
              priority
              className="h-6 w-auto md:h-7"
              width={120}
              height={28}
            />
          </div>
          <span className="hidden text-white/30 sm:inline">|</span>
          <div className="flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 md:px-3 md:py-2">
            <div className="flex items-center justify-center rounded-md bg-white/10 px-2 py-1">
              <Image
                src="/brand/fleetonomics.png"
                alt="Fleetonomics"
                priority
                className="h-8 w-auto md:h-9"
                width={160}
                height={36}
              />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight md:text-base">Fleetonomics</div>
              <div className="text-xs text-white/55 md:text-sm">Smart Fleet Management</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/80 md:text-base">
          <div className="relative" ref={quickRef}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-haspopup="menu"
              aria-expanded={quickOpen}
              onClick={() => setQuickOpen((v) => !v)}
            >
              Quick actions ▾
            </Button>
            {quickOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-white/15 bg-[#0b2a57] shadow-xl"
              >
                <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-white/60">Create</div>
                <div className="px-2 pb-2">
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
                      className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
                <div className="h-px bg-white/10" />
                <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-white/60">Jump to</div>
                <div className="px-2 pb-2">
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
                      className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-md bg-white/15 px-3 py-1 text-sm text-white md:px-3.5 md:py-1.5">
            {data?.user?.name ?? "Ops Manager"}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
        </div>
      </header>

      <nav className="flex gap-0 overflow-x-auto border-b-2 border-nlng-amber bg-nlng-nav px-2 scrollbar-none md:px-4">
        {mainNav.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors md:px-4 md:py-3.5 md:text-base",
                active
                  ? "border-nlng-amber bg-white/[0.06] text-white"
                  : "border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white/90",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto w-full max-w-[1920px] flex-1 px-5 py-6 md:px-10 md:py-8">{children}</main>
      <FooterBar />
    </div>
  );
}
