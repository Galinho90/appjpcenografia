import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Título principal da página (renderizado como o único h1 da rota). */
  title: React.ReactNode;
  /** Linha de apoio opcional, logo abaixo do título. */
  description?: React.ReactNode;
  /** Ícone opcional exibido antes do título. */
  icon?: LucideIcon;
  /** Ações alinhadas à direita (botões, seletores de período, etc.). */
  actions?: React.ReactNode;
}

/**
 * Cabeçalho padrão de página. Centraliza hierarquia tipográfica (.page-title /
 * .page-subtitle) e espaçamento para manter consistência em todo o sistema.
 */
export function PageHeader({ title, description, icon: Icon, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4", className)}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="page-title">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <span className="truncate">{title}</span>
        </h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
