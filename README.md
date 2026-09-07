# HospNest 

PROMPT 1 — HOSPNEST LANDING PAGE (Build this FIRST)







TASK







Design and build a world-class, motion-rich landing page for HospNest — a multi-tenant SaaS hospital management platform. This page is the public face of the product and must communicate, through animated illustration and motion graphics, the complete end-to-end journey of hospital management: from a patient enrolling with their NIN, to consultation, lab, pharmacy, billing, and follow-up care.







Do NOT build any dashboard, auth, or app functionality yet. This task is the landing page ONLY — but it sets the entire visual identity (colors, typography, spacing, motion language) that the rest of the platform will follow.







BRAND & VISUAL IDENTITY







- Extract the exact color palette from the HospNest logo (deep blue / teal / cyan with lime green accents). Define these as semantic design tokens in the global CSS (`--primary`, `--secondary`, `--accent`, `--background`, etc.) and register them in the Tailwind config so the whole page — and later the whole platform — uses them consistently. Never hardcode hex values in components.



- Style direction: modern premium SaaS — clean, trustworthy, healthcare-grade. Generous whitespace, rounded corners, soft gradients in the brand palette, subtle glassmorphism on cards, and smooth physics-based motion.



- Typography: a distinctive modern font pairing (heading + body) loaded via web fonts — no generic default look.



- Dark sections and light sections may alternate for rhythm, but all colors must come from the token system.



- Fully responsive (mobile-first), accessible (contrast, alt text, semantic HTML), and SEO-ready: title, meta description, single H1, JSON-LD Organization schema.







MOTION GRAPHICS (CORE REQUIREMENT)







- Use Framer Motion for all UI animation: scroll-triggered reveals, staggered entrances, parallax layers, animated counters, and page transitions.



- Add Lottie (or an equivalent motion-graphics library) for illustrative animated icons/graphics throughout the page — animated medical illustrations: heartbeat pulse lines, stethoscope, hospital building, patient ID card, lab flask, pill capsule, invoice/receipt, calendar, shield/lock. Each illustration should loop subtly or play on scroll into view.



- Build an animated end-to-end process section: a horizontal (desktop) / vertical (mobile) journey with a connected animated path where each stage lights up in sequence:







  1. Patient Enrollment — patient registers with their NIN (National Identity Number) as the universal identifier; a digital health ID is created.



  2. Hospital Sign-Up — a hospital joins the platform, gets verified, and subscribes to a plan.



  3. Staff Onboarding — the hospital invites its team: doctors, nurses, lab technicians, pharmacists, receptionists — each with role-based access.



  4. Appointments & Triage — patients book visits; nurses triage vitals; queues are managed.



  5. Consultation & Records — doctors document encounters in the electronic medical record.



  6. Laboratory — lab requisitions flow to technicians; results return to the doctor instantly.



  7. Pharmacy — prescriptions are dispensed; inventory updates automatically.



  8. Billing & Payment — invoices are generated automatically; payments and insurance claims are processed.



  9. Patient Portal — the patient views everything: records, results, prescriptions, bills, and upcoming appointments.







  Each stage = an animated Lottie/illustrated icon + short label + one-line description, connected by an animated progress line (SVG path draw animation) that fills as the user scrolls.







PAGE STRUCTURE







1. Sticky navbar — logo, links (Features, How It Works, For Hospitals, For Patients, Pricing), CTA buttons: "Sign In" and "Get Started". Transparent over hero, solid on scroll.



2. Hero — bold headline positioning HospNest as the operating system for modern hospitals; subheadline mentioning NIN-based universal patient identity; primary CTA "Start Your Hospital" + secondary "See How It Works"; animated hero visual (motion graphic composition of dashboard UI cards floating in the brand palette, subtle parallax on mouse move); trust strip (e.g., "Built for hospitals of every size").



3. Stats band — animated counters (patients supported, hospitals, uptime).



4. End-to-End Process — the animated journey section described above (the centerpiece of the page).



5. Feature grid — 6–8 cards (EMR, Appointments, Laboratory, Pharmacy & Inventory, Billing & Insurance, Staff & Role Management, Patient Portal, AI Clinical Copilot), each with an animated icon and hover micro-interaction.



6. For Hospitals / For Patients — split section with alternating layout and scroll animations, explaining value for each audience (hospitals: run everything in one place, onboard staff by role; patients: one NIN, one health record, accessible anywhere).



7. Security & Compliance strip — animated shield/lock graphic; bullet points: role-based access, encrypted records, full audit trails, NIN-verified identity.



8. Pricing preview — 3 tiers (Starter / Growth / Enterprise) for hospitals, with the brand styling; CTA to sign up.



9. Testimonials — animated carousel (placeholder quotes acceptable, clearly generic).



10. Final CTA band — gradient background in brand colors, "Bring your hospital onto HospNest", big CTA button with hover animation.



11. Footer — logo, nav columns (Product, Company, Legal, Contact), social icons, copyright.







TECHNICAL REQUIREMENTS







- React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui, consistent with the existing project stack.



- Install and use `framer-motion` and a Lottie player (e.g., `lottie-react`) — create/source lightweight JSON animations for each icon; keep them performant (lazy-load below-the-fold animations).



- All animations must respect `prefers-reduced-motion`.



- 60fps motion only (transform/opacity); no layout-thrashing animations.



- Route: the landing page lives at `/` and is the default public route.



- Semantic tokens only — every color, gradient, and shadow defined in `index.css` and referenced via Tailwind semantic classes.







DELIVERABLES







1. A complete, polished, animated landing page at `/` matching the HospNest logo palette.



2. A design-token foundation (colors, gradients, shadows, typography) that the full platform build will inherit.



3. The animated end-to-end process journey as the signature section.



4. Responsive, accessible, SEO-ready output.







ACCEPTANCE CRITERIA







- Scrolling the page reveals smooth, sequenced motion graphics at every section.



- The end-to-end journey visibly animates through all 9 stages.



- Colors visibly match the HospNest logo palette everywhere.



- No console errors; page performs well on mobile.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hospnest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a01633dc-8c3c-4d69-b5f4-13956f3bced6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
