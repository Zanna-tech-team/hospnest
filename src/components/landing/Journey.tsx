import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import {
  BedDouble,
  ClipboardCheck,
  CreditCard,
  FlaskConical,
  HeartPulse,
  Pill,
  ScanLine,
  Stethoscope,
  UserPlus,
} from "lucide-react";

const stages = [
  {
    n: "01",
    title: "Enrolment with NIN",
    icon: UserPlus,
    body: "A patient walks in and is verified once with their National Identification Number. One identity, one record, no duplicate files across departments.",
    chips: ["NIN lookup", "Biodata", "Next of kin"],
  },
  {
    n: "02",
    title: "Triage & vitals",
    icon: HeartPulse,
    body: "Nurses capture temperature, BP, weight and complaint. Priority is scored automatically and the patient enters the live queue.",
    chips: ["Vitals", "Priority score", "Live queue"],
  },
  {
    n: "03",
    title: "Consultation",
    icon: Stethoscope,
    body: "The doctor opens a full history — past visits, allergies, results — and writes notes, diagnoses and orders in the same screen.",
    chips: ["SOAP notes", "ICD coding", "Orders"],
  },
  {
    n: "04",
    title: "Laboratory",
    icon: FlaskConical,
    body: "Lab orders arrive instantly with sample labels. Results flow straight back to the doctor with abnormal values flagged.",
    chips: ["Sample tracking", "Result flags", "Turnaround"],
  },
  {
    n: "05",
    title: "Imaging & diagnostics",
    icon: ScanLine,
    body: "Radiology requests, scheduling and reports live beside the record, so nothing is chased on paper between floors.",
    chips: ["Radiology", "Reports", "Attachments"],
  },
  {
    n: "06",
    title: "Pharmacy",
    icon: Pill,
    body: "Prescriptions dispense against real stock, with interaction checks, batch numbers and automatic reorder alerts.",
    chips: ["Stock levels", "Interactions", "Batches"],
  },
  {
    n: "07",
    title: "Admission & wards",
    icon: BedDouble,
    body: "Bed allocation, ward rounds, drug charts and nursing notes stay synced for every shift handover.",
    chips: ["Bed board", "Rounds", "Handover"],
  },
  {
    n: "08",
    title: "Billing & claims",
    icon: CreditCard,
    body: "Every order priced as it happens. Cash, HMO and insurance claims are reconciled without a second data entry.",
    chips: ["Invoices", "HMO claims", "Receipts"],
  },
  {
    n: "09",
    title: "Discharge & follow-up",
    icon: ClipboardCheck,
    body: "Discharge summaries, review dates and reminders close the loop — and the next visit starts from a complete history.",
    chips: ["Summary", "Reminders", "Outcomes"],
  },
];

function Stage({ stage, index }: { stage: (typeof stages)[number]; index: number }) {
  const Icon = stage.icon;
  const left = index % 2 === 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-8"
    >
      <div className={left ? "md:text-right" : "md:col-start-3"}>
        <motion.div
          whileHover={{ y: -6 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="rounded-3xl border border-border bg-card p-6 shadow-soft"
        >
          <div
            className={`flex items-center gap-3 ${left ? "md:flex-row-reverse" : ""}`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-shield text-primary-foreground">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-widest text-teal">STAGE {stage.n}</p>
              <h3 className="font-display text-lg font-bold text-navy-deep">{stage.title}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
          <div className={`mt-4 flex flex-wrap gap-2 ${left ? "md:justify-end" : ""}`}>
            {stage.chips.map((c) => (
              <span
                key={c}
                className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="hidden md:col-start-2 md:flex md:items-center md:justify-center">
        <motion.span
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="relative flex size-5 items-center justify-center rounded-full bg-gradient-brand ring-4 ring-background"
        >
          <span className="animate-pulse-ring absolute inset-0 rounded-full border border-teal" />
        </motion.span>
      </div>
    </motion.li>
  );
}

export function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 60%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4 });
  const height = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <section id="journey" className="relative bg-navy-deep py-24 text-primary-foreground md:py-32">
      <div className="grid-mesh pointer-events-none absolute inset-0 opacity-25" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
          >
            The end-to-end journey
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-5 text-3xl font-extrabold sm:text-4xl md:text-5xl"
          >
            Nine stages. One continuous record.
          </motion.h2>
          <p className="mt-5 text-base text-white/70">
            Scroll to follow a patient from the front desk to follow-up care — exactly the way
            HospNest moves their record through your hospital.
          </p>
        </div>

        <div ref={ref} className="relative mt-20">
          <div className="absolute top-0 left-[10px] h-full w-px bg-white/15 md:left-1/2 md:-translate-x-1/2" />
          <motion.div
            style={{ height }}
            className="absolute top-0 left-[10px] w-px bg-gradient-to-b from-brand-light via-teal to-spring md:left-1/2 md:-translate-x-1/2"
          />
          <ul className="flex flex-col gap-10 pl-10 md:pl-0 [&_.bg-card]:border-white/10 [&_.bg-card]:bg-white/[0.06] [&_.bg-card]:backdrop-blur [&_.text-navy-deep]:text-white [&_.text-muted-foreground]:text-white/70 [&_.bg-secondary]:bg-white/10 [&_.text-secondary-foreground]:text-white/80">
            {stages.map((s, i) => (
              <Stage key={s.n} stage={s} index={i} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
