import React from "react";
import Link from "next/link";
import { ArrowRight, CheckSquare, Sparkles, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GuideCardProps {
  title: string;
  description: string;
  category: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  stepsCount?: number;
}

export function GuideCard({
  title,
  description,
  category,
  href,
  icon: Icon = CheckSquare,
  badge,
  stepsCount,
}: GuideCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 group-hover:scale-105 transition-transform">
            <Icon className="h-5 w-5" />
          </div>

          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {badge}
            </span>
          )}

          {stepsCount && (
            <span className="text-[10px] font-bold text-slate-400">
              {stepsCount} etapas
            </span>
          )}
        </div>

        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
          {category}
        </span>

        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white leading-snug">
          {title}
        </h3>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
        <span>Acessar guia</span>
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
