import React from "react";
import { SearchPropertyCardSkeleton } from "@/features/search/components/SearchPropertyCardSkeleton";

export default function ComprarLoading() {
  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />

        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-36 bg-slate-100 dark:bg-slate-850 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>

        {/* Layout: Sidebar + List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              <div className="space-y-2">
                <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>

          {/* Cards skeleton list */}
          <div className="lg:col-span-9 space-y-4">
            <div className="h-11 w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
            <SearchPropertyCardSkeleton />
            <SearchPropertyCardSkeleton />
            <SearchPropertyCardSkeleton />
            <SearchPropertyCardSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}
