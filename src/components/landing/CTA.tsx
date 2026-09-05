import { motion } from "motion/react";
import { ArrowRight, Mail, Phone } from "lucide-react";

export function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-24 md:py-32">
      <div className="grid-mesh pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-shield opacity-15 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-3xl px-5 text-center"
      >
        <h2 className="text-3xl font-extrabold text-navy-deep sm:text-4xl md:text-5xl">
          Ready to bring your whole hospital into one nest?
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          See HospNest run a full patient journey with your own workflow, in a 30-minute walkthrough.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="mailto:hello@hospnest.com"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:scale-105"
          >
            Book a demo
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="mailto:hello@hospnest.com"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-sm font-semibold text-navy transition-colors hover:border-primary hover:text-primary"
          >
            <Mail className="size-4" />
            hello@hospnest.com
          </a>
        </div>
        <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="size-4" /> Placeholder contact details — send me your real email and
          phone number and I&apos;ll swap them in.
        </p>
      </motion.div>
    </section>
  );
}
