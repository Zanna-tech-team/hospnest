import { motion } from "motion/react";
import { Building2, Cloud, ShieldCheck, Zap } from "lucide-react";

const points = [
  { icon: ShieldCheck, title: "Isolated by design", body: "Each hospital's data is fenced off in its own tenant space — never mixed, never visible to another site." },
  { icon: Zap, title: "Live in days", body: "Spin up a new hospital, branch or clinic with its own branding, staff roles and price list in an afternoon." },
  { icon: Cloud, title: "Works on any device", body: "Front desk desktops, ward tablets and phones on patchy networks all stay in sync." },
];

const tenants = ["St. Mary's General", "Greenfield Clinic", "Unity Teaching Hospital", "Lakeside Medical"];

export function Tenants() {
  return (
    <section id="tenants" className="relative overflow-hidden bg-secondary/60 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2">
        <div>
          <span className="text-xs font-bold tracking-widest text-teal uppercase">
            Multi-tenant architecture
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-navy-deep sm:text-4xl md:text-5xl">
            Many hospitals. One platform. Zero data crossover.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            HospNest was built for groups: run a single clinic today and add sites as you grow,
            each with its own staff, tariffs and reports under one secure roof.
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

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-lift">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-navy-deep">HospNest control plane</p>
              <span className="flex items-center gap-2 rounded-full bg-spring/15 px-3 py-1 text-[11px] font-semibold text-teal">
                <span className="size-2 animate-pulse rounded-full bg-spring" /> All systems live
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {tenants.map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.45 }}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-shield text-primary-foreground">
                      <Building2 className="size-4" />
                    </span>
                    <span className="text-sm font-semibold text-navy">{t}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    tenant #{100 + i}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
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
    </section>
  );
}
