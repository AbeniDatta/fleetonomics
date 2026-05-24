import { VmsShell } from "@/components/layout/vms-shell";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <VmsShell>{children}</VmsShell>;
}
