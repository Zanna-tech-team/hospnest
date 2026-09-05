import { motion } from "motion/react";
import { Clock, HeartHandshake, LineChart, ShieldCheck } from "lucide-react";

const outcomes = [
  { icon: Clock, value: "42%", label: "shorter patient waiting time" },
  { icon: LineChart, value: "3x", label: "faster billing reconciliation" },
  { icon: HeartHandshake, value: "0", label: "duplicate patient files" },
  { icon: ShieldCheck, value: "100%", label: "auditable clinical actions" },
];

export function Platform() {
  return (
    <section id="platform" className="relative py-24 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="rounded-[2.5rem] border border-border bg-gradient-brand px-7 py-12 text-primary-foreground shadow-lift md:px-14 md:py-16"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Paper files, spreadsheets and disconnected desks cost hospitals hours every day.
            </h2>
            <p className="mt-5 text-base text-white/80">
              HospNest replaces the gaps between departments with one shared, always-current
              record — so staff spend their time on patients, not on chasing information.
            </p>
          </div>

          <dl className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {outcomes.map((o, i) => {
              const Icon = o.icon;
              return (
                <motion.div
                  key={o.label}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Icon className="size-6 text-white/70" />
                  <dt className="mt-4 font-display text-3xl font-extrabold">{o.value}</dt>
                  <dd className="mt-1 text-sm text-white/75">{o.label}</dd>
                </motion.div>
              );
            })}
          </dl>
        </motion.div>
      </div>
    </section>
  );
}
