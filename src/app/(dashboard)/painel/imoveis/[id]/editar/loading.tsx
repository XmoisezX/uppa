import React from "react";
import { Loader2 } from "lucide-react";

export default function EditPropertyLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse space-y-6">
      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />

      {/* Header bar skeleton */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>

      {/* Form skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-60 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>

        <div className="h-40 rounded-2xl bg-slate-50 dark:bg-slate-850" />
      </div>
    </div>
  );
}
