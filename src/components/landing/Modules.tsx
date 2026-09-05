import { motion } from "motion/react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Lock,
  Pill,
  Users,
  Wallet,
} from "lucide-react";

const modules = [
  { icon: Users, title: "Patient records", body: "One lifetime record per NIN, shared safely across every department." },
  { icon: CalendarDays, title: "Appointments & queues", body: "Live clinic queues, bookings and reminders that cut waiting time." },
  { icon: FileText, title: "Clinical notes", body: "Structured consultations, diagnoses, orders and discharge summaries." },
  { icon: Pill, title: "Pharmacy & inventory", body: "Dispensing tied to real stock, batches, expiry and reorder alerts." },
  { icon: Wallet, title: "Billing, HMO & claims", body: "Automatic pricing, receipts and insurance reconciliation." },
  { icon: BarChart3, title: "Analytics", body: "Revenue, occupancy, turnaround and outcome dashboards per site." },
  { icon: Lock, title: "Roles & audit trail", body: "Granular permissions with a full history of who saw and changed what." },
  { icon: Building2, title: "Branch management", body: "Run several hospitals or branches with shared standards and separate data." },
];

export function Modules() {
  return (
    <section id="modules" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        <div className="max-w-2xl">
          <span className="text-xs font-bold tracking-widest text-teal uppercase">Modules</span>
          <h2 className="mt-4 text-3xl font-extrabold text-navy-deep sm:text-4xl md:text-5xl">
            Everything a hospital runs on, in one place
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Switch modules on as you grow. They all read and write the same patient record, so
            there is never a second version of the truth.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.article
                key={m.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: (i % 4) * 0.08 }}
                whileHover={{ y: -8 }}
                className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary/40"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-gradient-shield group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-base font-bold text-navy-deep">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
