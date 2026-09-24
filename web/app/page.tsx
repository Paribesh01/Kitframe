"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { CtaBand } from "@/components/marketing/CtaBand";
import { Footer } from "@/components/marketing/Footer";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  // Render the marketing page immediately rather than gating on the auth
  // check — it's public content, so a signed-out visitor (or a crawler)
  // should never see a blank screen while /api/auth/me resolves. A logged-in
  // visitor gets redirected to /dashboard a beat later by the effect above.
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <Hero />
      <HowItWorks />
      <Features />
      <CtaBand />
      <Footer />
    </div>
  );
}
