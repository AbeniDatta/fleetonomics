"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  confirmVariant = "destructive",
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  busy?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[3001] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-vms-border bg-vms-card p-4 shadow-2xl md:p-5",
          )}
        >
          <Dialog.Title className="text-base font-semibold text-zinc-100">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-2 text-sm text-zinc-400">{description}</Dialog.Description> : null}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" disabled={busy}>
                {cancelText}
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Working…" : confirmText}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

