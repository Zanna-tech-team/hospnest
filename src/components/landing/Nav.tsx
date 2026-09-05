import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/hospnest-logo.png.asset.json";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "Journey", href: "#journey" },
  { label: "Modules", href: "#modules" },
  { label: "Multi-tenant", href: "#tenants" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border/60 bg-background/85 backdrop-blur-xl" : ""
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="#top" className="flex items-center gap-2" aria-label="HospNest home">
          <img src={logo.url} alt="HospNest logo" className="h-10 w-10 object-contain" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            Hosp<span className="text-teal">Nest</span>
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#cta"
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy transition-colors hover:text-primary"
          >
            Sign in
          </a>
          <a
            href="#cta"
            className="rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-105"
          >
            Book a demo
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg border border-border p-2 md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-muted-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#cta"
                onClick={() => setOpen(false)}
                className="inline-block rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Book a demo
              </a>
            </li>
          </ul>
        </div>
      )}
    </motion.header>
  );
}
