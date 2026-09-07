import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  ArrowRight,
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Hospital,
  MapPin,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Zap,
} from "lucide-react";
import {
  getPublicHospitalDirectory,
  type PublicHospitalCard,
} from "@/lib/public-hospital.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const points = [
  { icon: ShieldCheck, title: "Isolated by design", body: "Each hospital's data is fenced off in its own tenant space — never mixed, never visible to another site." },
  { icon: Zap, title: "Live in days", body: "Spin up a new hospital, branch or clinic with its own branding, staff roles and price list in an afternoon." },
  { icon: Cloud, title: "Works on any device", body: "Front desk desktops, ward tablets and phones on patchy networks all stay in sync." },
];

export function Tenants() {
  const getDirectoryFn = useServerFn(getPublicHospitalDirectory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("all");

  const { data: directoryData, isLoading } = useQuery<{ hospitals: PublicHospitalCard[]; totalCount: number }>({
    queryKey: ["public-hospitals-directory", selectedState, searchQuery],
    queryFn: () => getDirectoryFn({ data: { stateFilter: selectedState, searchQuery } }),
  });

  const hospitals = directoryData?.hospitals ?? [];

  return (
    <section id="tenants" className="relative overflow-hidden bg-secondary/60 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 space-y-16">
        {/* Top Feature Grid */}
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold tracking-widest text-teal uppercase">
              Multi-tenant architecture
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-navy-deep sm:text-4xl md:text-5xl">
              Many hospitals. One platform. Zero data crossover.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              HospNest was built for groups: run a single clinic today and add sites as you grow,
              each with its own custom landing page, staff, tariffs, and reports under one secure roof.
            </p>

            <ul className="mt-10 flex flex-col gap-6">
              {points.map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.li
                    key={p.title}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex gap-4"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-soft">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold text-navy-deep">{p.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>

          {/* HospNest Control Plane Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-[2rem] border border-border bg-card p-7 shadow-lift space-y-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-bold text-navy-deep">HospNest Federated Network</p>
                <span className="flex items-center gap-2 rounded-full bg-spring/15 px-3 py-1 text-[11px] font-semibold text-teal">
                  <span className="size-2 animate-pulse rounded-full bg-spring" /> All systems live
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {hospitals.slice(0, 4).map((h, i) => (
                  <Link
                    key={h.id}
                    to="/hospitals/$hospitalSlug"
                    params={{ hospitalSlug: h.slug }}
                    className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-shield text-primary-foreground">
                        <Building2 className="size-4" />
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-navy group-hover:text-teal-700 dark:group-hover:text-teal-400 block">
                          {h.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {h.state}, Nigeria
                        </span>
                      </div>
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Visit Site <ArrowRight className="size-3.5" />
                    </span>
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "Uptime", v: "99.9%" },
                  { k: "Encrypted", v: "AES-256" },
                  { k: "Backups", v: "Hourly" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl bg-secondary px-3 py-4">
                    <p className="font-display text-sm font-bold text-navy-deep">{s.v}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{s.k}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Hospital Landing Page Explorer Directory */}
        <div id="hospitals-directory" className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-soft space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-xs font-bold tracking-widest text-teal uppercase">
                Hospital Discovery & Public Portals
              </span>
              <h3 className="mt-2 font-display text-2xl font-bold text-navy-deep sm:text-3xl">
                Explore Active Hospitals on HospNest
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Click on any hospital to view its dedicated custom landing page, check clinical services, explore medical doctors, and book an appointment directly.
              </p>
            </div>

            {/* Search & State Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hospital name, city..."
                  className="h-9 pl-9 text-xs bg-background"
                />
              </div>

              <Button asChild size="sm" className="gap-1.5 bg-navy-deep hover:bg-navy text-white text-xs font-semibold">
                <Link to="/hospital-setup">
                  <UserPlus className="size-3.5" /> Register Your Facility
                </Link>
              </Button>
            </div>
          </div>

          {/* Hospital Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                Loading hospital directory...
              </div>
            ) : hospitals.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                No hospitals matching search criteria.
              </div>
            ) : (
              hospitals.map((hosp) => (
                <div
                  key={hosp.id}
                  className="rounded-2xl border border-border bg-background p-6 shadow-soft hover:border-teal-500/50 hover:shadow-lift transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 font-display text-lg font-bold">
                        {hosp.name[0]}
                      </div>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground capitalize">
                        {hosp.hospitalType}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-display text-base font-bold text-navy-deep group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        {hosp.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3 text-teal-600 shrink-0" />
                        {hosp.address || `${hosp.lga ? hosp.lga + ", " : ""}${hosp.state}, Nigeria`}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {hosp.heroHeadline}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/70">
                      <span>🏥 {hosp.departmentsCount} Departments</span>
                      <span>🛏️ {hosp.totalBedsCount} Beds</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <Link to="/hospitals/$hospitalSlug" params={{ hospitalSlug: hosp.slug }}>
                        View Hospital Portal <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
