"use client";

import { scrollToInterpreter } from "@/features/scroll-experience/lib";

/** Fixed header. Mixes over both the cream hero and the white interpreter. */
export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 mix-blend-multiply">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="font-display text-lead font-semibold tracking-tight text-forest">
          realsign
        </span>
        <button
          type="button"
          onClick={scrollToInterpreter}
          className="rounded-full px-4 py-2 font-body text-body font-semibold text-forest transition-colors hover:text-green"
        >
          open interpreter
        </button>
      </nav>
    </header>
  );
}
