import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  title,
  headerAction,
  children,
}: {
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-20">
      <header className="sticky top-0 z-20 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 py-3 flex items-center justify-between">
        <h1 className="font-display font-semibold text-lg">{title}</h1>
        {headerAction}
      </header>
      <main className="max-w-lg mx-auto p-4">{children}</main>
      <BottomNav />
    </div>
  );
}
