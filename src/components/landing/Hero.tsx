import { motion } from "motion/react";
import { Activity, ArrowRight, ShieldCheck, Stethoscope } from "lucide-react";
import logo from "@/assets/hospnest-logo.png.asset.json";

const stats = [
  { value: "9-stage", label: "connected care flow" },
  { value: "1 login", label: "per hospital tenant" },
  { value: "NIN-first", label: "patient identity" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="grid-mesh pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-gradient-shield opacity-20 blur-3xl"
        animate={{ scale: [1, 1.12, 1], x: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-24 size-[28rem] rounded-full bg-gradient-brand opacity-15 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold tracking-wide text-navy uppercase shadow-soft"
          >
            <ShieldCheck className="size-4 text-teal" />
            Multi-tenant hospital OS
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-6 text-4xl leading-[1.05] font-extrabold text-navy-deep sm:text-5xl lg:text-6xl"
          >
            One nest for every step of
            <span className="text-gradient-brand"> hospital care</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-6 max-w-xl text-lg text-muted-foreground"
          >
            HospNest connects enrolment, triage, consultation, laboratory, pharmacy, wards,
            billing and follow-up into a single live record — for one clinic or a hundred
            hospitals on the same platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <a
              href="#cta"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:scale-105"
            >
              Book a live demo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#journey"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold text-navy transition-colors hover:border-primary hover:text-primary"
            >
              <Activity className="size-4" />
              Watch the care journey
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 grid max-w-lg grid-cols-3 gap-6"
          >
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-bold text-navy">{s.value}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto w-full max-w-md"
        >
          <div className="relative aspect-square">
            <span className="absolute inset-6 rounded-full bg-gradient-shield opacity-20 blur-2xl" />
            <span className="animate-pulse-ring absolute inset-10 rounded-full border-2 border-teal/40" />
            <span
              className="animate-pulse-ring absolute inset-10 rounded-full border-2 border-brand/40"
              style={{ animationDelay: "1.3s" }}
            />
            <motion.img
              src={logo.url}
              alt="HospNest shield mark"
              className="animate-float relative z-10 mx-auto h-full w-full object-contain drop-shadow-2xl"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="absolute -left-2 top-10 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-soft backdrop-blur"
          >
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Patient verified
            </p>
            <p className="font-display text-sm font-bold text-navy">NIN •••• 4821</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="absolute -right-2 bottom-12 flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-soft backdrop-blur"
          >
            <Stethoscope className="size-5 text-teal" />
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Queue live
              </p>
              <p className="font-display text-sm font-bold text-navy">12 in consultation</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
