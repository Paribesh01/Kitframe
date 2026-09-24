import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-grid-fade px-4">
      <div className="text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Compass className="h-7 w-7" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          The page you&apos;re looking for doesn&apos;t exist, or you may have followed an old link.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
