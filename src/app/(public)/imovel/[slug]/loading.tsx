import React from "react";

export default function PropertyDetailLoading() {
  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-24 md:pb-16 pt-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />

        {/* Title and Badges skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>
          <div className="h-8 w-3/4 max-w-xl bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-4 w-60 bg-slate-100 dark:bg-slate-850 rounded-md animate-pulse" />
        </div>

        {/* Gallery skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-2xl overflow-hidden aspect-[16/10] md:aspect-[21/9] bg-slate-200 dark:bg-slate-800 animate-pulse">
          <div className="md:col-span-3 bg-slate-300 dark:bg-slate-700 h-full" />
          <div className="hidden md:grid grid-rows-2 gap-2 h-full">
            <div className="bg-slate-300/80 dark:bg-slate-700/80 rounded-r-lg" />
            <div className="bg-slate-300/80 dark:bg-slate-700/80 rounded-r-lg" />
          </div>
        </div>

        {/* Content 2-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
          {/* Main info */}
          <div className="lg:col-span-8 space-y-6">
            {/* Pricing card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
              <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 dark:bg-slate-850 rounded-md animate-pulse" />
            </div>

            {/* Specs bar */}
            <div className="grid grid-cols-4 gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>

            {/* Description card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              <div className="space-y-2 pt-2">
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-5/6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-4/6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Sticky sidebar */}
          <div className="hidden lg:block lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
              <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              <div className="h-12 w-full bg-emerald-600/30 rounded-xl animate-pulse" />
              <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
