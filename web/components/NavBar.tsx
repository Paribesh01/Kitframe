"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="font-semibold text-slate-900">
          Interview Prep Kit
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{user.email}</span>
            <button
              className="btn-secondary"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
