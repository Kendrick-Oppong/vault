import Image from "next/image";

export function VaultLogo({ className }: { className?: string }) {
  return <Image src="/icon.png" alt="Vault Logo" width={24} height={24} className={className} />;
}
