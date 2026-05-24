import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none md:text-[0.8125rem]",
  {
    variants: {
      variant: {
        default: "bg-zinc-700/60 text-zinc-200",
        success: "bg-emerald-500/20 text-emerald-300",
        warn: "bg-amber-500/20 text-amber-200",
        danger: "bg-red-500/20 text-red-300",
        info: "bg-sky-500/20 text-sky-200",
        purple: "bg-violet-500/20 text-violet-200",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
