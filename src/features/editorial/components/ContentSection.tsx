import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ContentSectionProps {
  badgeText?: string;
  badgeIcon?: LucideIcon;
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function ContentSection({
  badgeText,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  actionHref,
  actionLabel,
  children,
  className = "",
}: ContentSectionProps) {
  return (
    <section className={`py-12 sm:py-16 border-b border-slate-200/80 dark:border-slate-800 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            {badgeText && (
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
                <span>{badgeText}</span>
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>

            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 self-start sm:self-auto shrink-0 transition-colors"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Conteúdo Dinâmico */}
        <div>{children}</div>
      </div>
    </section>
  );
}
