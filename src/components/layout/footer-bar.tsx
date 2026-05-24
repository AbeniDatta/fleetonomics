"use client";

export function FooterBar() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-vms-border bg-vms-elevated px-5 py-3 text-xs text-zinc-400 md:px-10 md:text-sm">
      <span className="text-zinc-500">
        © Nigeria LNG · <span className="text-zinc-300">Fleetonomics</span>
      </span>
      <span className="text-zinc-500">Vehicle Management System</span>
    </footer>
  );
}
