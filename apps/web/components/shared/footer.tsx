import Link from "next/link";
import { VaultLogo } from "./vault-logo";

const FOOTER_LINKS = [
  { label: "GitHub", href: "https://github.com/Kendrick-Oppong/vault", isExternal: true },
  { label: "Features", href: "#features", isExternal: false },
  { label: "Download", href: "#download", isExternal: false },
] as const;

export function Footer() {
  return (
    <footer className="border-border border-t px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <VaultLogo className="h-5 w-5 text-primary" />
          <p className="font-light text-[12.5px] text-muted-foreground">
            Built by{" "}
            <strong className="font-semibold text-primary">Kendrick</strong>
          </p>
        </div>

        <nav className="mt-4 flex flex-wrap gap-3 sm:mt-0 sm:gap-5">
          {FOOTER_LINKS.map(({ label, href, isExternal }) => (
            <Link
              className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
              href={href}
              key={label}
              rel={isExternal ? "noopener noreferrer" : undefined}
              target={isExternal ? "_blank" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
