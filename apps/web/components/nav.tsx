"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/onboarding", "Onboarding"],
  ["/digest", "Today Digest"],
  ["/live", "Live Feed"],
  ["/saved", "Saved Library"],
  ["/saved/ask", "Ask Saved"],
  ["/review/weekly", "Weekly Review"],
  ["/profile", "Profile"],
  ["/session/end", "Session End"],
  ["/settings", "Settings"]
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="top-nav" aria-label="Primary">
      {links.map(([href, label]) => (
        <Link
          className="nav-link"
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          style={pathname === href ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
