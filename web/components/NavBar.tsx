"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-ink-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="tracking-tight">PrepKit</span>
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-sm text-ink-600">
            <span className="hidden sm:inline">{user.email}</span>
            <button
              className="btn-ghost"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
