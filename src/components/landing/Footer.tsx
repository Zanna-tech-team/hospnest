import logo from "@/assets/hospnest-logo.png.asset.json";

const groups = [
  { title: "Platform", links: ["Patient records", "Pharmacy", "Billing & claims", "Analytics"] },
  { title: "Company", links: ["About", "Careers", "Security", "Contact"] },
  { title: "Resources", links: ["Documentation", "Implementation", "Support", "Status"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-navy-deep py-14 text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo.url} alt="HospNest logo" className="h-10 w-10 object-contain" />
            <span className="font-display text-lg font-extrabold">HospNest</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-white/60">
            Multi-tenant hospital management, from enrolment to follow-up care.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="font-display text-sm font-bold">{g.title}</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {g.links.map((l) => (
                <li key={l}>
                  <a href="#top" className="text-sm text-white/60 transition-colors hover:text-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 px-5 pt-6 text-xs text-white/50">
        © {new Date().getFullYear()} HospNest. All rights reserved.
      </div>
    </footer>
  );
}
