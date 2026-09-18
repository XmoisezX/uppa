import React from "react";
import { Loader2 } from "lucide-react";

export default function PropertiesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse space-y-6">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>

      <div className="h-14 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <div className="flex items-center gap-4">
              <div className="h-20 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-40 bg-slate-100 dark:bg-slate-850 rounded" />
              </div>
            </div>
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
