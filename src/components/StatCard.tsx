import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatTone = "primary" | "success" | "destructive" | "warning" | "neutral";

const TONE: Record<StatTone, { wrap: string; icon: string; badge: string; value: string }> = {
  primary: {
    wrap: "bg-gradient-to-br from-primary/5 to-transparent",
    icon: "bg-primary/10 text-primary",
    badge: "bg-primary/10 text-primary",
    value: "text-foreground",
  },
  success: {
    wrap: "bg-gradient-to-br from-success/10 to-transparent",
    icon: "bg-success/15 text-success",
    badge: "bg-success/15 text-success",
    value: "text-success",
  },
  destructive: {
    wrap: "bg-gradient-to-br from-destructive/10 to-transparent",
    icon: "bg-destructive/15 text-destructive",
    badge: "bg-destructive/15 text-destructive",
    value: "text-destructive",
  },
  warning: {
    wrap: "bg-gradient-to-br from-warning/10 to-transparent",
    icon: "bg-warning/15 text-warning",
    badge: "bg-warning/15 text-warning",
    value: "text-foreground",
  },
  neutral: {
    wrap: "bg-gradient-to-br from-muted/40 to-transparent",
    icon: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    value: "text-foreground",
  },
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Etiqueta curta no canto superior direito. */
  badge?: string;
  tone?: StatTone;
  /** Linha auxiliar abaixo do valor. */
  hint?: React.ReactNode;
  className?: string;
}

/**
 * Card de indicador padronizado — mesma linguagem visual de /meu-extrato.
 */
export function StatCard({ label, value, icon: Icon, badge, tone = "primary", hint, className }: StatCardProps) {
  const t = TONE[tone];
  return (
    <Card className={cn("overflow-hidden", t.wrap, className)}>
      <CardContent className="p-5">
        {(Icon || badge) && (
          <div className="mb-4 flex items-center justify-between">
            {Icon ? (
              <div className={cn("rounded-xl p-2", t.icon)}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            ) : (
              <span />
            )}
            {badge ? (
              <Badge variant="secondary" className={cn("border-none text-[10px] font-bold uppercase", t.badge)}>
                {badge}
              </Badge>
            ) : null}
          </div>
        )}
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        <h4 className={cn("text-2xl font-bold tracking-tight", t.value)}>{value}</h4>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
