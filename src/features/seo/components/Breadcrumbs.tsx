import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import type { BreadcrumbItem } from "../types";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto scrollbar-none py-1.5 ${className}`}
    >
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-indigo-600 transition-colors whitespace-nowrap text-slate-500"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Início</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-indigo-600 transition-colors whitespace-nowrap text-slate-600 dark:text-slate-400"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`whitespace-nowrap font-medium ${
                  isLast
                    ? "text-slate-900 dark:text-slate-100 font-semibold"
                    : "text-slate-500"
                }`}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
