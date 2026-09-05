import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Platform } from "@/components/landing/Platform";
import { Journey } from "@/components/landing/Journey";
import { Modules } from "@/components/landing/Modules";
import { Tenants } from "@/components/landing/Tenants";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const title = "HospNest — Multi-Tenant Hospital Management Platform";
const description =
  "HospNest connects enrolment, triage, consultation, lab, pharmacy, wards, billing and follow-up into one live patient record for hospitals and clinic groups.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <Platform />
        <Journey />
        <Modules />
        <Tenants />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
